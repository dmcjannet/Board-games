# syntax=docker/dockerfile:1.7

# ---------- Builder ----------
# Compiles the client bundle and installs full node_modules (incl. tsx, which
# runs the server in production — no separate server build step required).
FROM node:22-alpine AS builder

WORKDIR /app

# System deps for better-sqlite3's native binding fallback (prebuilds usually
# work on alpine, but keep the compiler around as a safety net).
RUN apk add --no-cache python3 make g++

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

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/app.db

# Runtime needs tsx (which lives in server/node_modules) plus the compiled
# client. Copy from the builder so the image only holds what's needed.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001

# Use tsx directly rather than the workspace start script so we don't need
# cross-env inside the container.
CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
