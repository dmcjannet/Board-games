import { db } from '../db/connection';
import { tagsRepo } from './tagsRepo';
import type { Game } from '../types';

interface GameRow {
  id: number;
  name: string;
  created_at: string;
}

function toGame(row: GameRow, tags: string[]): Game {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    tags,
  };
}

function findAll(): Game[] {
  const rows = db
    .prepare('SELECT * FROM games ORDER BY name COLLATE NOCASE')
    .all() as GameRow[];
  const tagsByGame = tagsRepo.findByGameIds(rows.map((r) => r.id));
  return rows.map((r) => toGame(r, tagsByGame.get(r.id) ?? []));
}

function findById(id: number): Game | undefined {
  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as GameRow | undefined;
  if (!row) return undefined;
  return toGame(row, tagsRepo.findByGameId(row.id));
}

function create(name: string): Game {
  const info = db.prepare('INSERT INTO games (name) VALUES (?)').run(name);
  return findById(Number(info.lastInsertRowid))!;
}

function rename(id: number, name: string): Game | undefined {
  db.prepare('UPDATE games SET name = ? WHERE id = ?').run(name, id);
  return findById(id);
}

function deleteById(id: number): boolean {
  const info = db.prepare('DELETE FROM games WHERE id = ?').run(id);
  return info.changes > 0;
}

export const gamesRepo = { findAll, findById, create, rename, deleteById };
