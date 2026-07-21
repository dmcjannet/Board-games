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

// Plays with exactly one marked winner — ties/no-winner plays don't credit anyone.
const SOLO_WINNERS_CTE = `
  WITH solo_winners AS (
    SELECT play_id, MIN(player_id) AS winner_player_id
    FROM play_scores
    WHERE is_winner = 1
    GROUP BY play_id
    HAVING COUNT(*) = 1
  )
`;

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

// Build the WHERE clause fragments that restrict aggregates to matching plays.
// playerCount: only plays with exactly that number of participants.
// playerIds: only plays where ALL listed players participated (true head-to-head).
function buildPlayFilters(
  playerCount: number | null,
  playerIds: number[],
): { where: string; args: number[] } {
  const parts: string[] = [];
  const args: number[] = [];

  if (playerCount != null) {
    parts.push(
      'AND ps.play_id IN (SELECT play_id FROM play_scores GROUP BY play_id HAVING COUNT(*) = ?)',
    );
    args.push(playerCount);
  }

  if (playerIds.length > 0) {
    const placeholders = playerIds.map(() => '?').join(',');
    parts.push(
      `AND ps.play_id IN (
         SELECT play_id FROM play_scores
         WHERE player_id IN (${placeholders})
         GROUP BY play_id
         HAVING COUNT(DISTINCT player_id) = ${playerIds.length}
       )`,
    );
    args.push(...playerIds);
  }

  return { where: parts.join(' '), args };
}

// When players are picked, only show those players' rows in the aggregated tables.
function buildPlayerRestriction(playerIds: number[]): { sql: string; args: number[] } {
  if (playerIds.length === 0) return { sql: '', args: [] };
  const placeholders = playerIds.map(() => '?').join(',');
  return { sql: `AND p.id IN (${placeholders})`, args: [...playerIds] };
}

function getOverall(playerCount: number | null, playerIds: number[]): PlayerStats[] {
  const { where, args } = buildPlayFilters(playerCount, playerIds);
  const { sql: restriction, args: restrictionArgs } = buildPlayerRestriction(playerIds);
  const rows = db
    .prepare(
      `${SOLO_WINNERS_CTE}
       SELECT
         p.id AS player_id,
         p.name AS player_name,
         COUNT(DISTINCT ps.play_id) AS plays,
         COALESCE(SUM(CASE WHEN sw.winner_player_id = p.id THEN 1 ELSE 0 END), 0) AS wins,
         AVG(ps.score) AS average_score,
         MAX(ps.score) AS high_score
       FROM players p
       JOIN play_scores ps ON ps.player_id = p.id
       LEFT JOIN solo_winners sw ON sw.play_id = ps.play_id
       WHERE 1=1 ${where} ${restriction}
       GROUP BY p.id, p.name
       ORDER BY wins DESC, plays DESC, p.name COLLATE NOCASE`,
    )
    .all(...args, ...restrictionArgs) as PlayerStatsRow[];
  return rows.map(rowToStats);
}

function getGameLeaderboards(playerCount: number | null, playerIds: number[]): GameLeaderboard[] {
  const { where, args } = buildPlayFilters(playerCount, playerIds);
  const { sql: restriction, args: restrictionArgs } = buildPlayerRestriction(playerIds);

  const games = db
    .prepare(
      `SELECT
         g.id AS game_id,
         g.name AS game_name,
         COUNT(DISTINCT pl.id) AS total_plays
       FROM plays pl
       JOIN games g ON g.id = pl.game_id
       JOIN play_scores ps ON ps.play_id = pl.id
       WHERE 1=1 ${where}
       GROUP BY g.id, g.name
       ORDER BY total_plays DESC, g.name COLLATE NOCASE`,
    )
    .all(...args) as GameSummaryRow[];

  const perPlayer = db
    .prepare(
      `${SOLO_WINNERS_CTE}
       SELECT
         pl.game_id,
         p.id AS player_id,
         p.name AS player_name,
         COUNT(DISTINCT ps.play_id) AS plays,
         COALESCE(SUM(CASE WHEN sw.winner_player_id = p.id THEN 1 ELSE 0 END), 0) AS wins,
         AVG(ps.score) AS average_score,
         MAX(ps.score) AS high_score
       FROM play_scores ps
       JOIN plays pl ON pl.id = ps.play_id
       JOIN players p ON p.id = ps.player_id
       LEFT JOIN solo_winners sw ON sw.play_id = ps.play_id
       WHERE 1=1 ${where} ${restriction}
       GROUP BY pl.game_id, p.id, p.name
       ORDER BY pl.game_id, wins DESC, plays DESC, p.name COLLATE NOCASE`,
    )
    .all(...args, ...restrictionArgs) as GamePlayerStatsRow[];

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

function getAvailablePlayerCounts(): number[] {
  const rows = db
    .prepare('SELECT DISTINCT c FROM (SELECT COUNT(*) AS c FROM play_scores GROUP BY play_id) ORDER BY c')
    .all() as { c: number }[];
  return rows.map((r) => r.c);
}

function getStats(playerCount: number | null, playerIds: number[]): StatsResponse {
  return {
    overall: getOverall(playerCount, playerIds),
    games: getGameLeaderboards(playerCount, playerIds),
    availablePlayerCounts: getAvailablePlayerCounts(),
  };
}

export const statsRepo = { getStats };
