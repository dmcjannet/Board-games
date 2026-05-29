import { db } from '../db/connection';

export interface PlayerStats {
  playerId: number;
  playerName: string;
  plays: number;
  wins: number;
  winRate: number;
  averageScore: number;
  highScore: number;
}

export interface GameLeaderboard {
  gameId: number;
  gameName: string;
  totalPlays: number;
  leaderboard: PlayerStats[];
}

export interface StatsResponse {
  overall: PlayerStats[];
  games: GameLeaderboard[];
}

interface PlayerStatsRow {
  player_id: number;
  player_name: string;
  plays: number;
  wins: number;
  average_score: number;
  high_score: number;
}

interface GamePlayerStatsRow extends PlayerStatsRow {
  game_id: number;
}

interface GameSummaryRow {
  game_id: number;
  game_name: string;
  total_plays: number;
}

function rowToStats(row: PlayerStatsRow): PlayerStats {
  return {
    playerId: row.player_id,
    playerName: row.player_name,
    plays: row.plays,
    wins: row.wins,
    winRate: row.plays > 0 ? row.wins / row.plays : 0,
    averageScore: row.average_score,
    highScore: row.high_score,
  };
}

function getOverall(): PlayerStats[] {
  const rows = db
    .prepare(
      `SELECT
         p.id AS player_id,
         p.name AS player_name,
         COUNT(DISTINCT ps.play_id) AS plays,
         COALESCE(SUM(ps.is_winner), 0) AS wins,
         AVG(ps.score) AS average_score,
         MAX(ps.score) AS high_score
       FROM players p
       JOIN play_scores ps ON ps.player_id = p.id
       GROUP BY p.id, p.name
       ORDER BY wins DESC, plays DESC, p.name COLLATE NOCASE`,
    )
    .all() as PlayerStatsRow[];
  return rows.map(rowToStats);
}

function getGameLeaderboards(): GameLeaderboard[] {
  const games = db
    .prepare(
      `SELECT
         g.id AS game_id,
         g.name AS game_name,
         COUNT(*) AS total_plays
       FROM plays pl
       JOIN games g ON g.id = pl.game_id
       GROUP BY g.id, g.name
       ORDER BY total_plays DESC, g.name COLLATE NOCASE`,
    )
    .all() as GameSummaryRow[];

  const perPlayer = db
    .prepare(
      `SELECT
         pl.game_id,
         p.id AS player_id,
         p.name AS player_name,
         COUNT(DISTINCT ps.play_id) AS plays,
         COALESCE(SUM(ps.is_winner), 0) AS wins,
         AVG(ps.score) AS average_score,
         MAX(ps.score) AS high_score
       FROM play_scores ps
       JOIN plays pl ON pl.id = ps.play_id
       JOIN players p ON p.id = ps.player_id
       GROUP BY pl.game_id, p.id, p.name
       ORDER BY pl.game_id, wins DESC, plays DESC, p.name COLLATE NOCASE`,
    )
    .all() as GamePlayerStatsRow[];

  const grouped = new Map<number, PlayerStats[]>();
  for (const row of perPlayer) {
    const list = grouped.get(row.game_id);
    if (list) {
      list.push(rowToStats(row));
    } else {
      grouped.set(row.game_id, [rowToStats(row)]);
    }
  }

  return games.map((g) => ({
    gameId: g.game_id,
    gameName: g.game_name,
    totalPlays: g.total_plays,
    leaderboard: grouped.get(g.game_id) ?? [],
  }));
}

function getStats(): StatsResponse {
  return {
    overall: getOverall(),
    games: getGameLeaderboards(),
  };
}

export const statsRepo = { getStats };
