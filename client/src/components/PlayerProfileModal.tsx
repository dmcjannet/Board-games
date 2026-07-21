import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Play, Player, StatsResponse } from '../types';
import { formatDate } from '../utils/formatDate';
import { computeStreak } from '../utils/streaks';

interface Props {
  playerId: number;
  onClose: () => void;
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatAvg(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '—';
}

export default function PlayerProfileModal({ playerId, onClose }: Props) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [plays, setPlays] = useState<Play[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.getPlayers(), api.getStats(null, [playerId], []), api.getRecentPlays(1000)])
      .then(([playersData, statsData, playsData]) => {
        if (!active) return;
        setPlayer(playersData.find((p) => p.id === playerId) ?? null);
        setStats(statsData);
        setPlays(playsData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [playerId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const overall = stats?.overall.find((s) => s.playerId === playerId);
  const streaks = useMemo(() => computeStreak(plays, playerId), [plays, playerId]);
  const recentPlays = useMemo(
    () =>
      plays
        .filter((p) => p.scores.some((s) => s.playerId === playerId))
        .sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.id - a.id)
        .slice(0, 8),
    [plays, playerId],
  );

  const perGame = stats?.games
    .map((g) => {
      const row = g.leaderboard.find((r) => r.playerId === playerId);
      return row ? { gameName: g.gameName, ...row } : null;
    })
    .filter(<T,>(x: T | null): x is T => x != null) ?? [];

  const favorite = perGame.length > 0 ? [...perGame].sort((a, b) => b.plays - a.plays)[0] : null;
  const best = perGame.length > 0 ? [...perGame].sort((a, b) => b.winRate - a.winRate || b.plays - a.plays)[0] : null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{player?.name ?? 'Player'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading && <p className="muted">Loading…</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && overall && (
            <>
              <div className="profile-stats">
                <div className="profile-stat">
                  <span className="profile-stat-label">Plays</span>
                  <span className="profile-stat-value">{overall.plays}</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-label">Wins</span>
                  <span className="profile-stat-value">{overall.wins}</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-label">Win %</span>
                  <span className="profile-stat-value">{formatPct(overall.winRate)}</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-label">Current streak</span>
                  <span className="profile-stat-value">{streaks.current}</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-label">Best streak</span>
                  <span className="profile-stat-value">{streaks.best}</span>
                </div>
              </div>

              {(favorite || best) && (
                <div className="profile-favorites">
                  {favorite && (
                    <p className="muted small">
                      <strong>Most played:</strong> {favorite.gameName} ({favorite.plays} plays)
                    </p>
                  )}
                  {best && best.plays >= 2 && (
                    <p className="muted small">
                      <strong>Best game:</strong> {best.gameName} ({formatPct(best.winRate)} win rate over {best.plays} plays)
                    </p>
                  )}
                </div>
              )}

              {perGame.length > 0 && (
                <>
                  <h3 className="profile-section-title">By game</h3>
                  <div className="table-scroll">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Game</th>
                          <th>Plays</th>
                          <th>Wins</th>
                          <th>Win %</th>
                          <th>Avg</th>
                          <th>High</th>
                        </tr>
                      </thead>
                      <tbody>
                        {perGame.map((row) => (
                          <tr key={row.gameName}>
                            <td className="player">{row.gameName}</td>
                            <td>{row.plays}</td>
                            <td>{row.wins}</td>
                            <td>{formatPct(row.winRate)}</td>
                            <td>{formatAvg(row.averageScore)}</td>
                            <td>{row.highScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {recentPlays.length > 0 && (
                <>
                  <h3 className="profile-section-title">Recent plays</h3>
                  <ul className="play-list">
                    {recentPlays.map((play) => {
                      const own = play.scores.find((s) => s.playerId === playerId);
                      const otherWinners = play.scores.filter((s) => s.isWinner && s.playerId !== playerId);
                      const isWin = own?.isWinner ?? false;
                      const winnerCount = play.scores.filter((s) => s.isWinner).length;
                      const isSoloWin = isWin && winnerCount === 1;
                      const isTie = isWin && winnerCount > 1;
                      return (
                        <li className="card play-item" key={play.id}>
                          <div className="play-summary-row">
                            <div className="play-summary" style={{ cursor: 'default' }}>
                              <div className="summary-top">
                                <span className="col-date">{formatDate(play.playedOn)}</span>
                                <span className="col-game">{play.game.name}</span>
                              </div>
                              <div className="summary-bottom">
                                {isSoloWin && <span className="badge">Winner</span>}
                                {isTie && <span className="badge">Tie</span>}
                                {!isWin && otherWinners.length === 1 && (
                                  <span>lost to {otherWinners[0]!.playerName}</span>
                                )}
                                {!isWin && otherWinners.length > 1 && (
                                  <span>tied: {otherWinners.map((s) => s.playerName).join(', ')}</span>
                                )}
                                {own && <span className="muted small">score {own.score}</span>}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
