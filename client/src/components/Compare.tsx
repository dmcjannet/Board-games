import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api/client';
import type { Player, Play, StatsResponse } from '../types';
import PlayerCountFilter from './PlayerCountFilter';

const PLAYER_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

const TOOLTIP_STYLE = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
};

const DOUBLE_CLICK_MS = 400;

function colorFor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]!;
}

interface Props {
  refreshKey: number;
}

interface HeadToHead {
  playerA: Player;
  playerB: Player;
  aWins: number;
  bWins: number;
  ties: number;
  sharedPlays: number;
}

interface DrillDown {
  title: string;
  subtitle?: string;
  plays: Play[];
}

function computeH2H(plays: Play[], a: Player, b: Player): HeadToHead {
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let sharedPlays = 0;
  for (const play of plays) {
    const aScore = play.scores.find((s) => s.playerId === a.id);
    const bScore = play.scores.find((s) => s.playerId === b.id);
    if (!aScore || !bScore) continue;
    sharedPlays += 1;

    const winnerCount = play.scores.reduce((n, s) => n + (s.isWinner ? 1 : 0), 0);
    if (winnerCount === 1) {
      if (aScore.isWinner) aWins += 1;
      else if (bScore.isWinner) bWins += 1;
    } else if (winnerCount >= 2 && aScore.isWinner && bScore.isWinner) {
      ties += 1;
    }
  }
  return { playerA: a, playerB: b, aWins, bWins, ties, sharedPlays };
}

function H2HCard({ h2h }: { h2h: HeadToHead }) {
  const { playerA, playerB, aWins, bWins, ties, sharedPlays } = h2h;
  return (
    <div className="card h2h">
      <h2>Head-to-Head</h2>
      {sharedPlays === 0 ? (
        <p className="muted">
          {playerA.name} and {playerB.name} haven&apos;t played together yet.
        </p>
      ) : (
        <>
          <p className="muted">
            Across {sharedPlays} shared {sharedPlays === 1 ? 'play' : 'plays'}:
          </p>
          <div className="h2h-row">
            <div className="h2h-side">
              <span className="h2h-wins" style={{ color: colorFor(0) }}>
                {aWins}
              </span>
              <span>{playerA.name}</span>
            </div>
            <div className="h2h-vs">vs</div>
            <div className="h2h-side">
              <span className="h2h-wins" style={{ color: colorFor(1) }}>
                {bWins}
              </span>
              <span>{playerB.name}</span>
            </div>
          </div>
          {ties > 0 && (
            <p className="muted">
              {ties} {ties === 1 ? 'tie' : 'ties'}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PlayDetailList({ plays }: { plays: Play[] }) {
  if (plays.length === 0) {
    return <p className="muted">No matching plays.</p>;
  }
  const sorted = [...plays].sort((a, b) => b.playedOn.localeCompare(a.playedOn));
  return (
    <ul className="play-list">
      {sorted.map((play) => {
        const scores = [...play.scores].sort((a, b) => b.score - a.score);
        return (
          <li className="card play-item" key={play.id}>
            <div className="play-summary-row">
              <div className="play-summary" style={{ cursor: 'default' }}>
                <div className="summary-top">
                  <span className="col-date">{play.playedOn}</span>
                  <span className="col-game">{play.game.name}</span>
                </div>
              </div>
            </div>
            <div className="play-detail">
              <ul className="scores">
                {scores.map((s) => (
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
          </li>
        );
      })}
    </ul>
  );
}

function DrillDownModal({
  drillDown,
  onClose,
}: {
  drillDown: DrillDown;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{drillDown.title}</h2>
            {drillDown.subtitle && <p className="muted small">{drillDown.subtitle}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <PlayDetailList plays={drillDown.plays} />
        </div>
      </div>
    </div>
  );
}

export default function Compare({ refreshKey }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [plays, setPlays] = useState<Play[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [timelineGameId, setTimelineGameId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerCountFilter, setPlayerCountFilter] = useState<number | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const lastClickRef = useRef<{ key: string; time: number } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getPlayers(), api.getRecentPlays(1000), api.getStats(playerCountFilter)])
      .then(([playersData, playsData, statsData]) => {
        if (!active) return;
        setPlayers(playersData);
        setPlays(playsData);
        setStats(statsData);
        setError(null);
        setSelectedIds((prev) => {
          if (prev.size > 0) return prev;
          const top = statsData.overall.slice(0, 2).map((s) => s.playerId);
          return new Set(top);
        });
        setTimelineGameId((prev) => prev ?? statsData.games[0]?.gameId ?? null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load comparison data.');
      });
    return () => {
      active = false;
    };
  }, [refreshKey, playerCountFilter]);

  const filteredPlays = useMemo(() => {
    if (playerCountFilter == null) return plays;
    return plays.filter((p) => p.scores.length === playerCountFilter);
  }, [plays, playerCountFilter]);

  const selectedPlayers = useMemo(
    () => players.filter((p) => selectedIds.has(p.id)),
    [players, selectedIds],
  );

  const winRateByGame = useMemo(() => {
    if (!stats) return [];
    return stats.games.map((g) => {
      const row: Record<string, number | string> = { game: g.gameName };
      for (const p of selectedPlayers) {
        const entry = g.leaderboard.find((l) => l.playerId === p.id);
        row[p.name] = entry ? Math.round(entry.winRate * 100) : 0;
      }
      return row;
    });
  }, [stats, selectedPlayers]);

  const timelineData = useMemo(() => {
    if (timelineGameId == null) return [];
    const relevantPlays = filteredPlays
      .filter((p) => p.game.id === timelineGameId)
      .sort((a, b) => a.playedOn.localeCompare(b.playedOn));
    return relevantPlays.map((play) => {
      const row: Record<string, number | string | null> = { date: play.playedOn };
      for (const p of selectedPlayers) {
        const score = play.scores.find((s) => s.playerId === p.id);
        row[p.name] = score ? score.score : null;
      }
      return row;
    });
  }, [filteredPlays, timelineGameId, selectedPlayers]);

  const h2h = useMemo(() => {
    if (selectedPlayers.length !== 2) return null;
    return computeH2H(filteredPlays, selectedPlayers[0]!, selectedPlayers[1]!);
  }, [filteredPlays, selectedPlayers]);

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Simple manual double-click detection: two clicks on the same identifier
  // within DOUBLE_CLICK_MS fire the action. First click is remembered; a click
  // on a different key resets the memory.
  function tryDoubleClick(key: string, action: () => void) {
    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const last = lastClickRef.current;
    if (last && last.key === key && now - last.time < DOUBLE_CLICK_MS) {
      action();
      lastClickRef.current = null;
    } else {
      lastClickRef.current = { key, time: now };
    }
  }

  function drillIntoBar(player: Player, gameName: string) {
    const matches = filteredPlays.filter(
      (p) => p.game.name === gameName && p.scores.some((s) => s.playerId === player.id),
    );
    const filterSuffix = playerCountFilter != null ? ` (${playerCountFilter}-player)` : '';
    setDrillDown({
      title: `${player.name} — ${gameName}${filterSuffix}`,
      subtitle: `${matches.length} play${matches.length === 1 ? '' : 's'}`,
      plays: matches,
    });
  }

  function drillIntoTimelinePoint(date: string) {
    if (timelineGameId == null) return;
    const matches = filteredPlays.filter(
      (p) => p.game.id === timelineGameId && p.playedOn === date,
    );
    if (matches.length === 0) return;
    const gameName = matches[0]!.game.name;
    setDrillDown({
      title: `${gameName} — ${date}`,
      subtitle: matches.length > 1 ? `${matches.length} plays on this date` : undefined,
      plays: matches,
    });
  }

  function handleBarClick(player: Player, data: unknown) {
    const payload = data as { game?: string; payload?: { game?: string } };
    const gameName = payload?.game ?? payload?.payload?.game;
    if (typeof gameName !== 'string') return;
    tryDoubleClick(`bar:${player.id}:${gameName}`, () => drillIntoBar(player, gameName));
  }

  function handleLineChartClick(state: unknown) {
    const label = (state as { activeLabel?: string } | null)?.activeLabel;
    if (typeof label !== 'string') return;
    tryDoubleClick(`line:${label}`, () => drillIntoTimelinePoint(label));
  }

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading…</p>;
  if (players.length === 0) {
    return <p className="muted">Add players and record some plays first.</p>;
  }

  const games = stats.games;
  const timelineHasData = timelineData.some((row) =>
    selectedPlayers.some((p) => typeof row[p.name] === 'number'),
  );

  return (
    <div className="compare">
      <PlayerCountFilter
        value={playerCountFilter}
        onChange={setPlayerCountFilter}
        availableCounts={stats.availablePlayerCounts}
      />

      <div className="card">
        <h2>Select Players</h2>
        <div className="chips">
          {players.map((p) => {
            const isSelected = selectedIds.has(p.id);
            const idx = selectedPlayers.findIndex((sp) => sp.id === p.id);
            const color = isSelected && idx >= 0 ? colorFor(idx) : undefined;
            return (
              <button
                key={p.id}
                type="button"
                className={`chip${isSelected ? ' selected' : ''}`}
                style={color ? { borderColor: color, color } : undefined}
                onClick={() => toggle(p.id)}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedPlayers.length === 0 ? (
        <p className="muted">Select at least one player to compare.</p>
      ) : (
        <>
          {h2h && <H2HCard h2h={h2h} />}

          <div className="card">
            <h2>Win Rate by Game{playerCountFilter != null ? ` (${playerCountFilter}-player)` : ''}</h2>
            {games.length === 0 ? (
              <p className="muted">
                {playerCountFilter != null
                  ? `No plays with ${playerCountFilter} players yet.`
                  : 'No plays recorded yet.'}
              </p>
            ) : (
              <>
                <div className="chart interactive-chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={winRateByGame} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                      <XAxis dataKey="game" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                        domain={[0, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        formatter={(value) => `${value}%`}
                      />
                      <Legend wrapperStyle={{ fontSize: 13 }} />
                      {selectedPlayers.map((p, i) => (
                        <Bar
                          key={p.id}
                          dataKey={p.name}
                          fill={colorFor(i)}
                          radius={[4, 4, 0, 0]}
                          onClick={(data) => handleBarClick(p, data)}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="muted small">Double-click a bar to see that player&apos;s plays of that game.</p>
              </>
            )}
          </div>

          <div className="card">
            <div className="section-header">
              <h2>Score Over Time</h2>
              <select
                className="inline-select"
                value={timelineGameId ?? ''}
                onChange={(e) => setTimelineGameId(Number(e.target.value))}
                disabled={games.length === 0}
              >
                {games.length === 0 && <option value="">No games yet</option>}
                {games.map((g) => (
                  <option key={g.gameId} value={g.gameId}>
                    {g.gameName}
                  </option>
                ))}
              </select>
            </div>
            {!timelineHasData ? (
              <p className="muted">
                {playerCountFilter != null
                  ? `No ${playerCountFilter}-player plays of this game involving the selected players.`
                  : 'No plays of this game involving the selected players.'}
              </p>
            ) : (
              <>
                <div className="chart interactive-chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={timelineData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      onClick={handleLineChartClick}
                    >
                      <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 13 }} />
                      {selectedPlayers.map((p, i) => (
                        <Line
                          key={p.id}
                          type="monotone"
                          dataKey={p.name}
                          stroke={colorFor(i)}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="muted small">Double-click a point on the chart to see the play from that date.</p>
              </>
            )}
          </div>
        </>
      )}

      {drillDown && <DrillDownModal drillDown={drillDown} onClose={() => setDrillDown(null)} />}
    </div>
  );
}
