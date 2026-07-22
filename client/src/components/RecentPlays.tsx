import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Play } from '../types';
import { formatDate } from '../utils/formatDate';
import { usePlayerProfile } from '../context/PlayerProfileContext';
import Avatar from './Avatar';
import GameImage from './GameImage';

interface Props {
  refreshKey: number;
}

export default function RecentPlays({ refreshKey }: Props) {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { open: openProfile } = usePlayerProfile();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getRecentPlays(20)
      .then((data) => {
        if (active) {
          setPlays(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load plays.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (plays.length === 0) {
    return <p className="muted">No plays recorded yet. Record your first game!</p>;
  }

  return (
    <div className="recent">
      {plays.map((play) => {
        const sorted = [...play.scores].sort((a, b) => b.score - a.score);
        return (
          <div className="card play-card" key={play.id}>
            {play.imageVersion && (
              <img
                src={`/api/plays/${play.id}/image?v=${play.imageVersion}`}
                alt=""
                className="play-photo"
                loading="lazy"
              />
            )}
            <div className="play-header">
              <div className="play-header-title">
                <GameImage gameId={play.game.id} imageVersion={play.game.imageVersion} variant="thumb" alt={play.game.name} />
                <h3>{play.game.name}</h3>
              </div>
              <span className="date">{formatDate(play.playedOn)}</span>
            </div>
            <ul className="scores">
              {sorted.map((s) => (
                <li key={s.playerId} className={s.isWinner ? 'winner' : ''}>
                  <span className="player">
                    <Avatar
                      playerId={s.playerId}
                      playerName={s.playerName}
                      imageVersion={s.playerImageVersion}
                    />
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
        );
      })}
    </div>
  );
}
