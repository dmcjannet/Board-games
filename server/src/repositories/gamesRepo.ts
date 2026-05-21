import { db } from '../db/connection';
import type { Game } from '../types';

interface GameRow {
  id: number;
  name: string;
  created_at: string;
}

const toGame = (row: GameRow): Game => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
});

function findAll(): Game[] {
  const rows = db.prepare('SELECT * FROM games ORDER BY name COLLATE NOCASE').all() as GameRow[];
  return rows.map(toGame);
}

function findById(id: number): Game | undefined {
  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as GameRow | undefined;
  return row ? toGame(row) : undefined;
}

function create(name: string): Game {
  const info = db.prepare('INSERT INTO games (name) VALUES (?)').run(name);
  return findById(Number(info.lastInsertRowid))!;
}

export const gamesRepo = { findAll, findById, create };
