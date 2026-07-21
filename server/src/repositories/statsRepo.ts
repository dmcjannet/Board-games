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
  availablePlayerCounts: number[];
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

// Restrict aggregate queries to plays whose player count matches `playerCount`.
function playerCountClause(playerCount: number | null): { sql: string; args: number[] } {
  if (playerCount == null) return { sql: '', args: [] };
  return {
    sql: 'AND ps.play_id IN (SELECT play_id FROM play_scores GROUP BY play_id HAVING COUNT(*) = ?)',
    args: [playerCount],
  };
}

function getOverall(playerCount: number | null): PlayerStats[] {
  const { sql: filter, args } = playerCountClause(playerCount);
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
       WHERE 1=1 ${filter}
       GROUP BY p.id, p.name
       ORDER BY wins DESC, plays DESC, p.name COLLATE NOCASE`,
    )
    .all(...args) as PlayerStatsRow[];
  return rows.map(rowToStats);
}

function getGameLeaderboards(playerCount: number | null): GameLeaderboard[] {
  const { sql: filter, args } = playerCountClause(playerCount);

  const games = db
    .prepare(
      `SELECT
         g.id AS game_id,
         g.name AS game_name,
         COUNT(DISTINCT pl.id) AS total_plays
       FROM plays pl
       JOIN games g ON g.id = pl.game_id
       JOIN play_scores ps ON ps.play_id = pl.id
       WHERE 1=1 ${filter}
       GROUP BY g.id, g.name
       ORDER BY total_plays DESC, g.name COLLATE NOCASE`,
    )
    .all(...args) as GameSummaryRow[];

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
       WHERE 1=1 ${filter}
       GROUP BY pl.game_id, p.id, p.name
       ORDER BY pl.game_id, wins DESC, plays DESC, p.name COLLATE NOCASE`,
    )
    .all(...args) as GamePlayerStatsRow[];

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

// Distinct player counts across ALL plays (unfiltered) — drives the filter chips.
function getAvailablePlayerCounts(): number[] {
  const rows = db
    .prepare('SELECT DISTINCT c FROM (SELECT COUNT(*) AS c FROM play_scores GROUP BY play_id) ORDER BY c')
    .all() as { c: number }[];
  return rows.map((r) => r.c);
}

function getStats(playerCount: number | null): StatsResponse {
  return {
    overall: getOverall(playerCount),
    games: getGameLeaderboards(playerCount),
    availablePlayerCounts: getAvailablePlayerCounts(),
  };
}

export const statsRepo = { getStats };
