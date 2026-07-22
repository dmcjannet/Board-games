import type { Play } from '../types';

// One-liner narrative describing a play, generated purely from its own data
// (no history lookups). Categories, in order of check:
//   - no winner marked
//   - multi-way tie
//   - solo play (only one participant)
//   - photo finish (single winner, margin <= 2)
//   - blowout (single winner, margin >= 5 AND >= 25% of winner's score)
//   - standard win (falls through)
export function recapFor(play: Play): string {
  const scores = [...play.scores].sort((a, b) => b.score - a.score);
  const winners = scores.filter((s) => s.isWinner);
  const game = play.game.name;

  if (winners.length === 0) {
    return `${game} — no winner recorded.`;
  }

  if (winners.length > 1) {
    const names = winners.map((w) => w.playerName);
    const score = winners[0]!.score;
    if (names.length === 2) {
      return `${names[0]} and ${names[1]} tied at ${score} in ${game}.`;
    }
    const namesList = `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
    return `${winners.length}-way tie in ${game}: ${namesList} all finished at ${score}.`;
  }

  const winner = winners[0]!;
  const others = scores.filter((s) => !s.isWinner);

  if (others.length === 0) {
    return `${winner.playerName} played ${game} solo with ${winner.score}.`;
  }

  const runnerUp = others[0]!;
  const margin = winner.score - runnerUp.score;

  if (margin > 0 && margin <= 2) {
    return `Photo finish: ${winner.playerName} edged ${runnerUp.playerName} ${winner.score}–${runnerUp.score} in ${game}.`;
  }

  const isBlowout = margin >= 5 && winner.score >= 20 && margin >= winner.score * 0.25;
  if (isBlowout) {
    return `${winner.playerName} ran away with ${game} — ${winner.score} to ${runnerUp.playerName}'s ${runnerUp.score}.`;
  }

  if (scores.length >= 3) {
    return `${winner.playerName} took ${game} with ${winner.score}, ahead of ${runnerUp.playerName}'s ${runnerUp.score}.`;
  }

  return `${winner.playerName} beat ${runnerUp.playerName} ${winner.score}–${runnerUp.score} in ${game}.`;
}
