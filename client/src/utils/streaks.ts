import type { Play } from '../types';

export interface StreakResult {
  current: number;
  best: number;
}

// A play credits the player only when there is exactly one marked winner
// (matches the leaderboard rule — a tie doesn't break AND doesn't credit).
function isSoloWinFor(play: Play, playerId: number): boolean {
  const winners = play.scores.filter((s) => s.isWinner);
  return winners.length === 1 && winners[0]!.playerId === playerId;
}

export function computeStreak(
  plays: Play[],
  playerId: number,
  gameId?: number,
): StreakResult {
  const relevant = plays
    .filter((p) => (gameId == null || p.game.id === gameId))
    .filter((p) => p.scores.some((s) => s.playerId === playerId))
    .sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.id - b.id);

  let current = 0;
  let best = 0;
  for (const play of relevant) {
    if (isSoloWinFor(play, playerId)) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return { current, best };
}

export interface PlayerStreak {
  playerId: number;
  playerName: string;
  current: number;
  best: number;
}

export function computeAllStreaks(
  plays: Play[],
  players: { id: number; name: string }[],
): PlayerStreak[] {
  return players.map((p) => {
    const { current, best } = computeStreak(plays, p.id);
    return { playerId: p.id, playerName: p.name, current, best };
  });
}
