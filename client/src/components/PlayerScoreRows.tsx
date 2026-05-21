import type { Player } from '../types';
import QuickAddInline from './QuickAddInline';

export interface ScoreRowState {
  key: string;
  playerId: number | null;
  score: string;
  isWinner: boolean;
}

interface Props {
  players: Player[];
  rows: ScoreRowState[];
  onChange: (key: string, patch: Partial<ScoreRowState>) => void;
  onRemove: (key: string) => void;
  onAddRow: () => void;
  onAddPlayer: (name: string) => Promise<void>;
  onSetWinnerByHighest: () => void;
}

export default function PlayerScoreRows({
  players,
  rows,
  onChange,
  onRemove,
  onAddRow,
  onAddPlayer,
  onSetWinnerByHighest,
}: Props) {
  const usedIds = new Set(
    rows.map((r) => r.playerId).filter((id): id is number => id != null),
  );

  return (
    <div className="field">
      <label>Players &amp; Scores</label>
      <div className="score-rows">
        {rows.map((row) => (
          <div className="score-row" key={row.key}>
            <select
              value={row.playerId ?? ''}
              onChange={(e) => onChange(row.key, { playerId: Number(e.target.value) })}
            >
              <option value="" disabled>
                Select player…
              </option>
              {players.map((p) => (
                <option key={p.id} value={p.id} disabled={usedIds.has(p.id) && p.id !== row.playerId}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Score"
              value={row.score}
              onChange={(e) => onChange(row.key, { score: e.target.value })}
            />
            <label className="winner-toggle">
              <input
                type="checkbox"
                checked={row.isWinner}
                onChange={(e) => onChange(row.key, { isWinner: e.target.checked })}
              />
              Winner
            </label>
            <button
              type="button"
              className="remove"
              onClick={() => onRemove(row.key)}
              disabled={rows.length <= 1}
              aria-label="Remove player"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="row-actions">
        <button type="button" onClick={onAddRow}>
          + Add player
        </button>
        <button type="button" onClick={onSetWinnerByHighest}>
          Set winner = highest score
        </button>
      </div>
      <QuickAddInline label="New player name" onAdd={onAddPlayer} />
    </div>
  );
}
