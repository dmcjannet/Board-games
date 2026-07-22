import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Game, Player } from '../types';
import GameSelect from './GameSelect';
import PlayerScoreRows, { type ScoreRowState } from './PlayerScoreRows';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

let rowCounter = 0;
function newRow(): ScoreRowState {
  rowCounter += 1;
  return { key: `r${rowCounter}`, playerId: null, score: '', isWinner: false };
}

function isNumeric(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Number(value));
}

function markHighestWinners(rows: ScoreRowState[]): ScoreRowState[] {
  const scored = rows.filter((r) => isNumeric(r.score));
  if (scored.length === 0) {
    return rows.map((r) => ({ ...r, isWinner: false }));
  }
  const max = Math.max(...scored.map((r) => Number(r.score)));
  return rows.map((r) => ({
    ...r,
    isWinner: isNumeric(r.score) && Number(r.score) === max,
  }));
}

interface Props {
  refreshKey: number;
  onSaved: () => void;
}

export default function RecordPlayForm({ refreshKey, onSaved }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameId, setGameId] = useState<number | null>(null);
  const [playedOn, setPlayedOn] = useState<string>(today());
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ScoreRowState[]>([newRow(), newRow()]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  useEffect(() => {
    void api.getGames().then(setGames);
    void api.getPlayers().then(setPlayers);
  }, [refreshKey]);

  function updateRow(key: string, patch: Partial<ScoreRowState>) {
    setRows((rs) => {
      const next = rs.map((r) => (r.key === key ? { ...r, ...patch } : r));
      return 'score' in patch ? markHighestWinners(next) : next;
    });
  }

  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? markHighestWinners(rs.filter((r) => r.key !== key)) : rs));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (gameId == null) {
      setError('Please select a game.');
      return;
    }
    const filled = rows.filter((r) => r.playerId != null && r.score.trim() !== '');
    if (filled.length === 0) {
      setError('Add at least one player with a score.');
      return;
    }
    if (filled.some((r) => !isNumeric(r.score))) {
      setError('Scores must be numbers.');
      return;
    }
    const ids = filled.map((r) => r.playerId);
    if (new Set(ids).size !== ids.length) {
      setError('Each player can only appear once.');
      return;
    }

    setSaving(true);
    try {
      const created = await api.createPlay({
        gameId,
        playedOn,
        notes: notes.trim() || null,
        scores: filled.map((r) => ({
          playerId: r.playerId!,
          score: Number(r.score),
          isWinner: r.isWinner,
        })),
      });
      if (photo) {
        try {
          await api.uploadPlayImage(created.id, photo);
        } catch (imgErr) {
          setError(
            `Play saved, but photo upload failed: ${imgErr instanceof Error ? imgErr.message : 'unknown'}`,
          );
          return;
        }
      }
      setRows([newRow(), newRow()]);
      setNotes('');
      setGameId(null);
      setPlayedOn(today());
      clearPhoto();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save play.');
    } finally {
      setSaving(false);
    }
  }

  const missingGames = games.length === 0;
  const missingPlayers = players.length === 0;

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Record a Play</h2>

      {(missingGames || missingPlayers) && (
        <p className="hint">
          {missingGames && missingPlayers
            ? 'No games or players yet.'
            : missingGames
              ? 'No games yet.'
              : 'No players yet.'}{' '}
          Add them under <strong>Options → Add Player and/or Game</strong>.
        </p>
      )}

      <GameSelect games={games} value={gameId} onChange={setGameId} />

      <div className="field">
        <label>Date played</label>
        <input type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
      </div>

      <PlayerScoreRows
        players={players}
        rows={rows}
        onChange={updateRow}
        onRemove={removeRow}
        onAddRow={addRow}
      />

      <div className="field">
        <label>Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="field">
        <label>Photo (optional)</label>
        <div className="photo-picker">
          {photoPreview && <img src={photoPreview} alt="preview" className="photo-preview" />}
          <div className="photo-picker-actions">
            <button
              type="button"
              className="ghost small"
              onClick={() => photoInputRef.current?.click()}
              disabled={saving}
            >
              {photo ? 'Replace' : 'Add photo'}
            </button>
            {photo && (
              <button type="button" className="danger small" onClick={clearPhoto} disabled={saving}>
                Remove
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              hidden
            />
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save Play'}
      </button>
    </form>
  );
}
