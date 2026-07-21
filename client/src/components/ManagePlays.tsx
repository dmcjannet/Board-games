import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Play } from '../types';

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

export default function ManagePlays({ refreshKey, onChanged }: Props) {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRecentPlays(1000);
      setPlays(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plays.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(play: Play) {
    const label = `${play.game.name} on ${play.playedOn}`;
    if (!window.confirm(`Delete this play?\n\n${label}\n\nThis cannot be undone.`)) return;
    setDeletingId(play.id);
    try {
      await api.deletePlay(play.id);
      setPlays((prev) => prev.filter((p) => p.id !== play.id));
      setExpanded((prev) => {
        if (!prev.has(play.id)) return prev;
        const next = new Set(prev);
        next.delete(play.id);
        return next;
      });
      onChanged();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete play.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (plays.length === 0) {
    return <p className="muted">No plays to manage. Record one first.</p>;
  }

  return (
    <div className="manage">
      <p className="muted warning-note">
        Deleting a play removes it from history, leaderboard, and comparisons. This cannot be undone.
      </p>
      <ul className="play-list">
        {plays.map((play) => {
          const isExpanded = expanded.has(play.id);
          const isDeleting = deletingId === play.id;
          const winnerScores = play.scores.filter((s) => s.isWinner);
          const sortedScores = [...play.scores].sort((a, b) => b.score - a.score);

          return (
            <li className={`play-item card${isExpanded ? ' is-expanded' : ''}`} key={play.id}>
              <div className="play-summary-row">
                <button
                  type="button"
                  className="play-summary"
                  onClick={() => toggle(play.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="summary-top">
                    <span className="col-date">{play.playedOn}</span>
                    <span className="col-game">{play.game.name}</span>
                    <span className="chevron" aria-hidden>
                      {isExpanded ? '▴' : '▾'}
                    </span>
                  </div>
                  <div className="summary-bottom">
                    {winnerScores.length === 0 ? (
                      <span className="muted">no winner recorded</span>
                    ) : (
                      <>
                        <span className="badge">
                          {winnerScores.length > 1 ? 'Tie' : 'Winner'}
                        </span>
                        <span>{winnerScores.map((s) => s.playerName).join(', ')}</span>
                      </>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  className="danger small"
                  onClick={() => handleDelete(play)}
                  disabled={isDeleting}
                  aria-label={`Delete play of ${play.game.name} on ${play.playedOn}`}
                >
                  {isDeleting ? '…' : 'Delete'}
                </button>
              </div>
              {isExpanded && (
                <div className="play-detail">
                  <ul className="scores">
                    {sortedScores.map((s) => (
                      <li key={s.playerId} className={s.isWinner ? 'winner' : ''}>
                        <span className="player">
                          {s.playerName}
                          {s.isWinner && <span className="badge">Winner</span>}
                        </span>
                        <span className="score">{s.score}</span>
                      </li>
                    ))}
                  </ul>
                  {play.notes && <p className="notes">{play.notes}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
