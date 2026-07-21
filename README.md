# Board Game Score Tracker

A small full-stack web app for tracking board game scores. Record plays, review
recent results, see leaderboards across all your games, and compare players
side-by-side with charts (win rate by game, score over time, head-to-head).

## Stack

- **Backend:** Node + Express + TypeScript, SQLite via `better-sqlite3`, request
  validation with `zod`. Run directly with `tsx` (no build step).
- **Frontend:** React + Vite + TypeScript. In development, Vite proxies `/api` to
  the backend; in production the backend serves the built client.
- **Monorepo:** npm workspaces (`server`, `client`) with a root `package.json`.

## Requirements

- Node.js 20+ (developed on Node 22). `better-sqlite3` builds a native binding on install.

## Setup

```bash
npm install
```

## Run (development)

Starts the API (port 3001) and the Vite dev server (port 5173) together:

```bash
npm run dev
```

Then open http://localhost:5173.

Optionally seed a few sample games and players first (idempotent):

```bash
npm run seed
```

## Run (production)

```bash
npm run build   # builds the client into client/dist
npm start       # serves the API + built client on port 3001
```

Then open http://localhost:3001.

## Configuration

- `PORT` — API port (default `3001`). The Vite dev proxy reads the same variable.
- `DB_PATH` — SQLite file location (default `server/data/app.db`). The directory is
  created automatically. The database file is gitignored.

## Data model

- **games** — `id`, `name` (unique), `created_at`
- **players** — `id`, `name` (unique), `created_at`
- **plays** — one play session: `id`, `game_id`, `played_on` (`YYYY-MM-DD`), `notes`, `created_at`
- **play_scores** — one row per player per play: `play_id`, `player_id`, `score`,
  `is_winner`. Winners are stored explicitly (not computed) so ties and
  non-highest-score-wins games are both representable.

## API

| Method | Route             | Description                                  |
| ------ | ----------------- | -------------------------------------------- |
| GET    | `/api/health`     | Liveness check → `{ ok: true }`              |
| GET    | `/api/games`      | List games                                   |
| POST   | `/api/games`      | Create a game `{ name }`                      |
| GET    | `/api/players`    | List players                                 |
| POST   | `/api/players`    | Create a player `{ name }`                    |
| GET    | `/api/plays`      | Recent plays (newest first), `?limit=`       |
| GET    | `/api/plays/:id`  | A single play with nested game + scores      |
| POST   | `/api/plays`      | Record a play (game + date + scores), atomic |
| DELETE | `/api/plays/:id`  | Delete a play (scores cascade)               |
| GET    | `/api/stats`      | Overall + per-game leaderboards              |

`POST /api/plays` body:

```json
{
  "gameId": 1,
  "playedOn": "2026-05-21",
  "notes": null,
  "scores": [
    { "playerId": 1, "score": 42, "isWinner": true },
    { "playerId": 2, "score": 30, "isWinner": false }
  ]
}
```

## Verifying

```bash
npm run typecheck   # type-checks both workspaces
npm run build       # builds the client bundle
```

Headless API smoke test (no browser needed) — start the server, then:

```bash
curl -s localhost:3001/api/health
curl -s -X POST localhost:3001/api/games   -H 'content-type: application/json' -d '{"name":"Catan"}'
curl -s -X POST localhost:3001/api/players -H 'content-type: application/json' -d '{"name":"Dave"}'
curl -s -X POST localhost:3001/api/players -H 'content-type: application/json' -d '{"name":"Sam"}'
curl -s -X POST localhost:3001/api/plays   -H 'content-type: application/json' \
  -d '{"gameId":1,"playedOn":"2026-05-21","scores":[{"playerId":1,"score":42,"isWinner":true},{"playerId":2,"score":30,"isWinner":false}]}'
curl -s 'localhost:3001/api/plays?limit=5'
```

Full UI interaction requires a browser; the curl sequence is the authoritative
headless check.
