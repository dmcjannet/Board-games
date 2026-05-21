import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dbPath =
  process.env.DB_PATH ?? fileURLToPath(new URL('../../data/app.db', import.meta.url));

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf-8');
db.exec(schema);
