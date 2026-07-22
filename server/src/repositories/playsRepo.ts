import { db } from '../db/connection';
import { imageVersion } from '../utils/images';
import type { Play, PlayScore } from '../types';

interface PlayRow {
  id: number;
  game_id: number;
  played_on: string;
  notes: string | null;
  created_at: string;
}

interface ScoreRow {
  player_id: number;
  player_name: string;
  score: number;
  is_winner: number;
}

export interface CreatePlayInput {
  gameId: number;
  playedOn: string;
  notes: string | null;
  scores: { playerId: number; score: number; isWinner: boolean }[];
}

function hydrate(row: PlayRow): Play {
  const gameRow = db
    .prepare('SELECT id, name FROM games WHERE id = ?')
    .get(row.game_id) as { id: number; name: string };

  const scoreRows = db
    .prepare(
      `SELECT ps.player_id, p.name AS player_name, ps.score, ps.is_winner
       FROM play_scores ps
       JOIN players p ON p.id = ps.player_id
       WHERE ps.play_id = ?
       ORDER BY ps.score DESC, p.name COLLATE NOCASE`,
    )
    .all(row.id) as ScoreRow[];

  const scores: PlayScore[] = scoreRows.map((s) => ({
    playerId: s.player_id,
    playerName: s.player_name,
    playerImageVersion: imageVersion('players', s.player_id),
    score: s.score,
    isWinner: !!s.is_winner,
  }));

  return {
    id: row.id,
    playedOn: row.played_on,
    notes: row.notes,
    createdAt: row.created_at,
    game: { ...gameRow, imageVersion: imageVersion('games', gameRow.id) },
    scores,
  };
}

function findById(id: number): Play | undefined {
  const row = db.prepare('SELECT * FROM plays WHERE id = ?').get(id) as PlayRow | undefined;
  return row ? hydrate(row) : undefined;
}

function findRecent(limit: number): Play[] {
  const rows = db
    .prepare('SELECT * FROM plays ORDER BY date(played_on) DESC, id DESC LIMIT ?')
    .all(limit) as PlayRow[];
  return rows.map(hydrate);
}

function create(input: CreatePlayInput): Play {
  const tx = db.transaction((data: CreatePlayInput) => {
    const info = db
      .prepare('INSERT INTO plays (game_id, played_on, notes) VALUES (?, ?, ?)')
      .run(data.gameId, data.playedOn, data.notes);
    const playId = Number(info.lastInsertRowid);

    const insertScore = db.prepare(
      'INSERT INTO play_scores (play_id, player_id, score, is_winner) VALUES (?, ?, ?, ?)',
    );
    for (const s of data.scores) {
      insertScore.run(playId, s.playerId, s.score, s.isWinner ? 1 : 0);
    }
    return playId;
  });

  const playId = tx(input);
  return findById(playId)!;
}

function deleteById(id: number): boolean {
  const info = db.prepare('DELETE FROM plays WHERE id = ?').run(id);
  return info.changes > 0;
}

function update(id: number, input: CreatePlayInput): Play {
  db.transaction(() => {
    db.prepare('UPDATE plays SET game_id = ?, played_on = ?, notes = ? WHERE id = ?')
      .run(input.gameId, input.playedOn, input.notes, id);
    db.prepare('DELETE FROM play_scores WHERE play_id = ?').run(id);
    const insertScore = db.prepare(
      'INSERT INTO play_scores (play_id, player_id, score, is_winner) VALUES (?, ?, ?, ?)',
    );
    for (const s of input.scores) {
      insertScore.run(id, s.playerId, s.score, s.isWinner ? 1 : 0);
    }
  })();
  return findById(id)!;
}

export const playsRepo = { create, findById, findRecent, deleteById, update };
