import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PlayerStats, StatsResponse } from '../types';

interface Props {
  refreshKey: number;
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatAvg(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '—';
}

function StatsTable({ rows }: { rows: PlayerStats[] }) {
  if (rows.length === 0) {
    return <p className="muted">No plays recorded yet.</p>;
  }
  return (
    <div className="table-scroll">
      <table className="stats-table">
        <thead>
          <tr>
            <th className="rank">#</th>
            <th>Player</th>
            <th>Plays</th>
            <th>Wins</th>
            <th>Win %</th>
            <th>Avg</th>
            <th>High</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.playerId} className={i === 0 ? 'leader' : ''}>
              <td className="rank">{i + 1}</td>
              <td className="player">{r.playerName}</td>
              <td>{r.plays}</td>
              <td>{r.wins}</td>
              <td>{formatPct(r.winRate)}</td>
              <td>{formatAvg(r.averageScore)}</td>
              <td>{r.highScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Leaderboard({ refreshKey }: Props) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getStats()
      .then((data) => {
        if (active) {
          setStats(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load stats.');
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
  if (!stats || stats.overall.length === 0) {
    return <p className="muted">No stats yet. Record a play to see the leaderboard.</p>;
  }

  return (
    <div className="leaderboard">
      <div className="card">
        <h2>Overall</h2>
        <StatsTable rows={stats.overall} />
      </div>
      {stats.games.map((g) => (
        <div className="card" key={g.gameId}>
          <div className="play-header">
            <h3>{g.gameName}</h3>
            <span className="date">
              {g.totalPlays} {g.totalPlays === 1 ? 'play' : 'plays'}
            </span>
          </div>
          <StatsTable rows={g.leaderboard} />
        </div>
      ))}
    </div>
  );
}
