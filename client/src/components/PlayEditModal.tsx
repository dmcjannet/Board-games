import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Game, Play, Player } from '../types';
import GameSelect from './GameSelect';
import PlayerScoreRows, { type ScoreRowState } from './PlayerScoreRows';

interface Props {
  play: Play;
  onSaved: () => void;
  onClose: () => void;
}

let rowCounter = 0;
function newRow(): ScoreRowState {
  rowCounter += 1;
  return { key: `e${rowCounter}`, playerId: null, score: '', isWinner: false };
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

function rowsFromPlay(play: Play): ScoreRowState[] {
  return play.scores.map((s, i) => {
    rowCounter += 1;
    return {
      key: `e${rowCounter}-${i}`,
      playerId: s.playerId,
      score: String(s.score),
      isWinner: s.isWinner,
    };
  });
}

export default function PlayEditModal({ play, onSaved, onClose }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameId, setGameId] = useState<number | null>(play.game.id);
  const [playedOn, setPlayedOn] = useState<string>(play.playedOn);
  const [notes, setNotes] = useState(play.notes ?? '');
  const [rows, setRows] = useState<ScoreRowState[]>(() => rowsFromPlay(play));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageVersion, setImageVersion] = useState<string | null>(play.imageVersion);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const updated = await api.uploadPlayImage(play.id, file);
      setImageVersion(updated.imageVersion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handlePhotoDelete() {
    setPhotoBusy(true);
    setError(null);
    try {
      await api.deletePlayImage(play.id);
      setImageVersion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo delete failed');
    } finally {
      setPhotoBusy(false);
    }
  }

  useEffect(() => {
    void api.getGames().then(setGames);
    void api.getPlayers().then(setPlayers);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

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
      setError('At least one player with a score.');
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
      await api.updatePlay(play.id, {
        gameId,
        playedOn,
        notes: notes.trim() || null,
        scores: filled.map((r) => ({
          playerId: r.playerId!,
          score: Number(r.score),
          isWinner: r.isWinner,
        })),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save play.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Play</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close" disabled={saving}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="edit-play-form">
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
                {imageVersion && (
                  <img
                    src={`/api/plays/${play.id}/image?v=${imageVersion}`}
                    alt="play photo"
                    className="photo-preview"
                  />
                )}
                <div className="photo-picker-actions">
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoBusy || saving}
                  >
                    {imageVersion ? 'Replace' : 'Add photo'}
                  </button>
                  {imageVersion && (
                    <button
                      type="button"
                      className="danger small"
                      onClick={() => void handlePhotoDelete()}
                      disabled={photoBusy || saving}
                    >
                      Remove
                    </button>
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void handlePhotoUpload(e)}
                    hidden
                  />
                </div>
              </div>
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Update Play'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
