# syntax=docker/dockerfile:1.7

# ---------- Builder ----------
# Compiles the client bundle and installs full node_modules (incl. tsx, which
# runs the server in production — no separate server build step required).
FROM node:22-alpine AS builder

WORKDIR /app

# System deps for native modules:
#  - python3/make/g++ let better-sqlite3 compile from source if a prebuild
#    binary isn't available for this alpine tag.
#  - vips is libvips, the image-processing library sharp wraps. Sharp
#    downloads a prebuilt binary on install for most platforms, but adding
#    the OS library keeps things working if the prebuild is unavailable.
RUN apk add --no-cache python3 make g++ vips

# Install deps first for better layer caching.
COPY package*.json tsconfig.base.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci

# Copy sources and build the client bundle (server runs via tsx, no build).
COPY . .
RUN npm run build

# ---------- Runtime ----------
FROM node:22-alpine

WORKDIR /app

# Runtime library for sharp (libvips) — needed if the prebuilt binary
# dynamically links it.
RUN apk add --no-cache vips

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DB_PATH=/data/app.db

# Runtime needs tsx (which lives in server/node_modules) plus the compiled
# client. Copy from the builder so the image only holds what's needed.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 8080

# Use tsx directly rather than the workspace start script so we don't need
# cross-env inside the container.
CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
