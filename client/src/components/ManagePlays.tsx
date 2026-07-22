import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Play } from '../types';
import { formatDate } from '../utils/formatDate';
import { useSnackbar } from '../context/SnackbarContext';
import { usePlayerProfile } from '../context/PlayerProfileContext';
import PlayEditModal from './PlayEditModal';

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

function playMatchesQuery(play: Play, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (play.game.name.toLowerCase().includes(q)) return true;
  if (play.playedOn.toLowerCase().includes(q)) return true;
  if (formatDate(play.playedOn).toLowerCase().includes(q)) return true;
  if (play.notes && play.notes.toLowerCase().includes(q)) return true;
  if (play.scores.some((s) => s.playerName.toLowerCase().includes(q))) return true;
  return false;
}

export default function ManagePlays({ refreshKey, onChanged }: Props) {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Play | null>(null);
  const { show: showSnackbar } = useSnackbar();
  const { open: openProfile } = usePlayerProfile();

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
      showSnackbar(`Deleted ${play.game.name} on ${formatDate(play.playedOn)}`, {
        actionLabel: 'Undo',
        onAction: async () => {
          try {
            await api.createPlay({
              gameId: play.game.id,
              playedOn: play.playedOn,
              notes: play.notes,
              scores: play.scores.map((s) => ({
                playerId: s.playerId,
                score: s.score,
                isWinner: s.isWinner,
              })),
            });
            await load();
            onChanged();
          } catch (e) {
            showSnackbar(e instanceof Error ? e.message : 'Failed to restore play.');
          }
        },
      });
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Failed to delete play.');
    }
  }

  function handleEditSaved() {
    setEditing(null);
    void load();
    onChanged();
    showSnackbar('Play updated');
  }

  const filtered = useMemo(() => plays.filter((p) => playMatchesQuery(p, query)), [plays, query]);

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (plays.length === 0) {
    return <p className="muted">No plays to manage. Record one first.</p>;
  }

  return (
    <div className="manage">
      <input
        type="search"
        className="search-input"
        placeholder="Search by game, player, date, or notes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <p className="muted small">
          {filtered.length} of {plays.length} plays match &ldquo;{query}&rdquo;
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="muted">No plays match.</p>
      ) : (
        <ul className="play-list">
          {filtered.map((play) => {
            const isExpanded = expanded.has(play.id);
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
                      <span className="col-date">{formatDate(play.playedOn)}</span>
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
                  <div className="row-buttons">
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => setEditing(play)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger small"
                      onClick={() => void handleDelete(play)}
                      aria-label={`Delete play of ${play.game.name} on ${play.playedOn}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="play-detail">
                    {play.imageVersion && (
                      <img
                        src={`/api/plays/${play.id}/image?v=${play.imageVersion}`}
                        alt=""
                        className="play-photo"
                        loading="lazy"
                      />
                    )}
                    <ul className="scores">
                      {sortedScores.map((s) => (
                        <li key={s.playerId} className={s.isWinner ? 'winner' : ''}>
                          <span className="player">
                            <button
                              type="button"
                              className="player-link"
                              onClick={() => openProfile(s.playerId)}
                            >
                              {s.playerName}
                            </button>
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
      )}

      {editing && (
        <PlayEditModal
          play={editing}
          onSaved={handleEditSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
