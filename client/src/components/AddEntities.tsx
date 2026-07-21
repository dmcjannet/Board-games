import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { api } from '../api/client';
import type { Game, Player } from '../types';
import QuickAddInline from './QuickAddInline';

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

function GameTagEditor({
  game,
  onUpdate,
}: {
  game: Game;
  onUpdate: (nextTags: string[]) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addTag(raw: string) {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return;
    if (normalized.length > 40) {
      setError('Tag too long (40 chars max)');
      return;
    }
    if (game.tags.includes(normalized)) {
      setDraft('');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpdate([...game.tags, normalized]);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tag');
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tag: string) {
    setBusy(true);
    setError(null);
    try {
      await onUpdate(game.tags.filter((t) => t !== tag));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove tag');
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void addTag(draft);
    }
  }

  return (
    <div className="game-tags-editor">
      {game.tags.map((t) => (
        <span key={t} className="tag-chip">
          {t}
          <button
            type="button"
            className="tag-remove"
            onClick={() => void removeTag(t)}
            disabled={busy}
            aria-label={`Remove tag ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        className="tag-input"
        placeholder="+ tag"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
      />
      {error && <span className="error inline">{error}</span>}
    </div>
  );
}

export default function AddEntities({ refreshKey, onChanged }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gs, ps] = await Promise.all([api.getGames(), api.getPlayers()]);
      setGames(gs);
      setPlayers(ps);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleAddGame(name: string) {
    await api.createGame(name);
    await load();
    onChanged();
  }

  async function handleAddPlayer(name: string) {
    await api.createPlayer(name);
    await load();
    onChanged();
  }

  async function updateGameTags(game: Game, nextTags: string[]) {
    await api.setGameTags(game.id, nextTags);
    await load();
    onChanged();
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="add-entities">
      <div className="card">
        <h2>Games</h2>
        {games.length === 0 ? (
          <p className="muted">No games yet — add your first below.</p>
        ) : (
          <ul className="entity-list game-list">
            {games.map((g) => (
              <li key={g.id} className="game-row">
                <span className="entity-name">{g.name}</span>
                <GameTagEditor
                  game={g}
                  onUpdate={(nextTags) => updateGameTags(g, nextTags)}
                />
              </li>
            ))}
          </ul>
        )}
        <QuickAddInline label="New game name" onAdd={handleAddGame} />
        <p className="muted small">
          Tag games with anything useful — style, duration, player count — then filter the
          Leaderboard and Compare tabs by those tags.
        </p>
      </div>

      <div className="card">
        <h2>Players</h2>
        {players.length === 0 ? (
          <p className="muted">No players yet — add your first below.</p>
        ) : (
          <ul className="entity-list">
            {players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        )}
        <QuickAddInline label="New player name" onAdd={handleAddPlayer} />
      </div>
    </div>
  );
}
