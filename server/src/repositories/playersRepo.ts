import { db } from '../db/connection';
import { imageVersion } from '../utils/images';
import type { Player } from '../types';

interface PlayerRow {
  id: number;
  name: string;
  created_at: string;
}

const toPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  imageVersion: imageVersion('players', row.id),
});

function findAll(): Player[] {
  const rows = db.prepare('SELECT * FROM players ORDER BY name COLLATE NOCASE').all() as PlayerRow[];
  return rows.map(toPlayer);
}

function findById(id: number): Player | undefined {
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as PlayerRow | undefined;
  return row ? toPlayer(row) : undefined;
}

function create(name: string): Player {
  const info = db.prepare('INSERT INTO players (name) VALUES (?)').run(name);
  return findById(Number(info.lastInsertRowid))!;
}

function rename(id: number, name: string): Player | undefined {
  db.prepare('UPDATE players SET name = ? WHERE id = ?').run(name, id);
  return findById(id);
}

function deleteById(id: number): boolean {
  const info = db.prepare('DELETE FROM players WHERE id = ?').run(id);
  return info.changes > 0;
}

export const playersRepo = { findAll, findById, create, rename, deleteById };
