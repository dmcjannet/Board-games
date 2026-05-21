import { useEffect, useState, type FormEvent } from 'react';
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

interface Props {
  onSaved: () => void;
}

export default function RecordPlayForm({ onSaved }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameId, setGameId] = useState<number | null>(null);
  const [playedOn, setPlayedOn] = useState<string>(today());
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ScoreRowState[]>([newRow(), newRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadGames() {
    setGames(await api.getGames());
  }
  async function loadPlayers() {
    setPlayers(await api.getPlayers());
  }

  useEffect(() => {
    void loadGames();
    void loadPlayers();
  }, []);

  function updateRow(key: string, patch: Partial<ScoreRowState>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }
  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function setWinnerByHighest() {
    const scored = rows.filter((r) => isNumeric(r.score));
    if (scored.length === 0) return;
    const max = Math.max(...scored.map((r) => Number(r.score)));
    setRows((rs) => rs.map((r) => ({ ...r, isWinner: isNumeric(r.score) && Number(r.score) === max })));
  }

  async function handleAddGame(name: string) {
    const game = await api.createGame(name);
    await loadGames();
    setGameId(game.id);
  }
  async function handleAddPlayer(name: string) {
    await api.createPlayer(name);
    await loadPlayers();
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
      await api.createPlay({
        gameId,
        playedOn,
        notes: notes.trim() || null,
        scores: filled.map((r) => ({
          playerId: r.playerId!,
          score: Number(r.score),
          isWinner: r.isWinner,
        })),
      });
      setRows([newRow(), newRow()]);
      setNotes('');
      setGameId(null);
      setPlayedOn(today());
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save play.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Record a Play</h2>

      <GameSelect games={games} value={gameId} onChange={setGameId} onAddGame={handleAddGame} />

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
        onAddPlayer={handleAddPlayer}
        onSetWinnerByHighest={setWinnerByHighest}
      />

      <div className="field">
        <label>Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save Play'}
      </button>
    </form>
  );
}
