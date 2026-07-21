import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Play, Player } from '../types';
import { computeAllStreaks } from '../utils/streaks';
import { usePlayerProfile } from '../context/PlayerProfileContext';

interface Props {
  refreshKey: number;
}

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

function nextMilestone(count: number): number | null {
  return MILESTONES.find((m) => m > count) ?? null;
}

export default function Highlights({ refreshKey }: Props) {
  const [plays, setPlays] = useState<Play[] | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { open: openProfile } = usePlayerProfile();

  useEffect(() => {
    let active = true;
    Promise.all([api.getRecentPlays(1000), api.getPlayers()])
      .then(([playsData, playersData]) => {
        if (!active) return;
        setPlays(playsData);
        setPlayers(playersData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load highlights.');
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const streaks = useMemo(() => {
    if (!plays) return [];
    return computeAllStreaks(plays, players);
  }, [plays, players]);

  if (error) return null;
  if (!plays) return null;

  const totalPlays = plays.length;
  if (totalPlays === 0) return null;

  const activeStreaks = streaks
    .filter((s) => s.current >= 2)
    .sort((a, b) => b.current - a.current);

  const bestOverall = [...streaks].sort((a, b) => b.best - a.best).slice(0, 3).filter((s) => s.best >= 3);

  const upcoming = nextMilestone(totalPlays);

  if (activeStreaks.length === 0 && bestOverall.length === 0) return null;

  return (
    <div className="card highlights">
      <h2>Highlights</h2>

      <div className="highlight-block">
        <div className="highlight-label">Plays recorded</div>
        <div className="highlight-value">
          {totalPlays}
          {upcoming && <span className="muted small"> — {upcoming - totalPlays} to {upcoming}</span>}
        </div>
      </div>

      {activeStreaks.length > 0 && (
        <div className="highlight-block">
          <div className="highlight-label">On a winning streak</div>
          <ul className="highlight-list">
            {activeStreaks.map((s) => (
              <li key={s.playerId}>
                <button
                  type="button"
                  className="player-link"
                  onClick={() => openProfile(s.playerId)}
                >
                  {s.playerName}
                </button>{' '}
                — {s.current} in a row
              </li>
            ))}
          </ul>
        </div>
      )}

      {bestOverall.length > 0 && (
        <div className="highlight-block">
          <div className="highlight-label">Longest streaks (all-time)</div>
          <ul className="highlight-list">
            {bestOverall.map((s) => (
              <li key={s.playerId}>
                <button
                  type="button"
                  className="player-link"
                  onClick={() => openProfile(s.playerId)}
                >
                  {s.playerName}
                </button>{' '}
                — {s.best} in a row
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
