import { db } from '../db/connection';

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function findAll(): string[] {
  const rows = db
    .prepare('SELECT name FROM tags ORDER BY name COLLATE NOCASE')
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

function findInUse(): string[] {
  // Tags attached to at least one game that has at least one play.
  const rows = db
    .prepare(
      `SELECT DISTINCT t.name
       FROM tags t
       JOIN game_tags gt ON gt.tag_id = t.id
       JOIN plays pl ON pl.game_id = gt.game_id
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

function findByGameId(gameId: number): string[] {
  const rows = db
    .prepare(
      `SELECT t.name
       FROM tags t
       JOIN game_tags gt ON gt.tag_id = t.id
       WHERE gt.game_id = ?
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all(gameId) as { name: string }[];
  return rows.map((r) => r.name);
}

function findByGameIds(gameIds: number[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (gameIds.length === 0) return map;
  const placeholders = gameIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT gt.game_id, t.name
       FROM game_tags gt
       JOIN tags t ON t.id = gt.tag_id
       WHERE gt.game_id IN (${placeholders})
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all(...gameIds) as { game_id: number; name: string }[];
  for (const row of rows) {
    const list = map.get(row.game_id);
    if (list) list.push(row.name);
    else map.set(row.game_id, [row.name]);
  }
  return map;
}

function ensureTagId(name: string): number {
  const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as
    | { id: number }
    | undefined;
  if (existing) return existing.id;
  const info = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
  return Number(info.lastInsertRowid);
}

function setForGame(gameId: number, rawTags: string[]): void {
  const normalized = Array.from(
    new Set(
      rawTags.map(normalize).filter((t) => t.length > 0 && t.length <= 40),
    ),
  );
  db.transaction(() => {
    db.prepare('DELETE FROM game_tags WHERE game_id = ?').run(gameId);
    const insert = db.prepare('INSERT INTO game_tags (game_id, tag_id) VALUES (?, ?)');
    for (const name of normalized) {
      insert.run(gameId, ensureTagId(name));
    }
  })();
}

export const tagsRepo = {
  findAll,
  findInUse,
  findByGameId,
  findByGameIds,
  setForGame,
  normalize,
};
