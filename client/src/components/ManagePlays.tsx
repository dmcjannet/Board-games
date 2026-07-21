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

  async function handleDelete(play: Play) {
    const label = `${play.game.name} on ${play.playedOn}`;
    if (!window.confirm(`Delete this play?\n\n${label}\n\nThis cannot be undone.`)) return;
    setDeletingId(play.id);
    try {
      await api.deletePlay(play.id);
      setPlays((prev) => prev.filter((p) => p.id !== play.id));
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
      {plays.map((play) => {
        const sorted = [...play.scores].sort((a, b) => b.score - a.score);
        const isDeleting = deletingId === play.id;
        return (
          <div className="card play-card" key={play.id}>
            <div className="play-header">
              <h3>{play.game.name}</h3>
              <span className="date">{play.playedOn}</span>
            </div>
            <ul className="scores">
              {sorted.map((s) => (
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
            <div className="manage-actions">
              <button
                type="button"
                className="danger"
                onClick={() => handleDelete(play)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete play'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
