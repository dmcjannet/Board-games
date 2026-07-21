import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Player, PlayerStats, StatsResponse } from '../types';
import PlayerCountFilter from './PlayerCountFilter';

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
    return <p className="muted">No matching plays.</p>;
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerCountFilter, setPlayerCountFilter] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let active = true;
    api
      .getPlayers()
      .then((data) => {
        if (active) setPlayers(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load players.');
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;
    api
      .getStats(playerCountFilter, Array.from(selectedIds))
      .then((data) => {
        if (active) {
          setStats(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load stats.');
      });
    return () => {
      active = false;
    };
  }, [refreshKey, playerCountFilter, selectedIds]);

  function togglePlayer(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const overallTitle = useMemo(() => {
    if (selectedIds.size === 0) return 'Overall';
    const selectedNames = players.filter((p) => selectedIds.has(p.id)).map((p) => p.name);
    if (selectedNames.length === 2) return `${selectedNames[0]} vs ${selectedNames[1]}`;
    if (selectedNames.length === 1) return selectedNames[0] ?? 'Overall';
    return selectedNames.join(', ');
  }, [players, selectedIds]);

  const suffix = playerCountFilter != null ? ` (${playerCountFilter}-player)` : '';

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading…</p>;

  const hasData = stats.overall.length > 0;

  return (
    <div className="leaderboard">
      <PlayerCountFilter
        value={playerCountFilter}
        onChange={setPlayerCountFilter}
        availableCounts={stats.availablePlayerCounts}
      />

      {players.length > 0 && (
        <div className="card">
          <h2>Filter by Player</h2>
          <div className="chips">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip${selectedIds.has(p.id) ? ' selected' : ''}`}
                onClick={() => togglePlayer(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          {selectedIds.size >= 2 && (
            <p className="muted small">
              Showing head-to-head across plays where all {selectedIds.size} selected players participated.
            </p>
          )}
          {selectedIds.size === 1 && (
            <p className="muted small">Showing only this player&apos;s stats. Pick another to see head-to-head.</p>
          )}
          {selectedIds.size === 0 && (
            <p className="muted small">Pick two or more players to see true head-to-head win rates.</p>
          )}
        </div>
      )}

      {hasData ? (
        <>
          <div className="card">
            <h2>
              {overallTitle}
              {suffix}
            </h2>
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
        </>
      ) : (
        <p className="muted">
          {selectedIds.size >= 2
            ? 'The selected players haven’t played together in a matching play yet.'
            : playerCountFilter != null
              ? `No plays with ${playerCountFilter} players yet.`
              : 'No stats yet. Record a play to see the leaderboard.'}
        </p>
      )}
    </div>
  );
}
