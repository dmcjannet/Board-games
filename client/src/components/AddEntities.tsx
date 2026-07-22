import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { api } from '../api/client';
import type { Game, Player } from '../types';
import QuickAddInline from './QuickAddInline';
import { useSnackbar } from '../context/SnackbarContext';
import Avatar from './Avatar';
import GameImage from './GameImage';

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

function ImageUpload({
  hasImage,
  previewNode,
  onUpload,
  onDelete,
  label,
}: {
  hasImage: boolean;
  previewNode: React.ReactNode;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-upload">
      <div className="image-upload-preview">{previewNode}</div>
      <div className="image-upload-actions">
        <button
          type="button"
          className="ghost small"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? '…' : hasImage ? 'Replace' : label}
        </button>
        {hasImage && (
          <button type="button" className="danger small" onClick={() => void handleDelete()} disabled={busy}>
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void handleChange(e)}
          hidden
        />
      </div>
      {error && <p className="error inline">{error}</p>}
    </div>
  );
}

interface RenameRowProps<T extends { id: number; name: string }> {
  entity: T;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  children?: React.ReactNode;
}

function RenameRow<T extends { id: number; name: string }>({
  entity,
  onRename,
  onDelete,
  children,
}: RenameRowProps<T>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entity.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(entity.name);
    setError(null);
    setEditing(true);
  }

  async function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === entity.name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRename(entity.id, trimmed);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await onDelete(entity.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setBusy(false);
    }
  }

  return (
    <>
      <div className="entity-row-main">
        {editing ? (
          <>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void commit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
              disabled={busy}
              className="rename-input"
            />
            <button type="button" className="ghost small" onClick={() => void commit()} disabled={busy}>
              Save
            </button>
            <button type="button" className="ghost small" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="entity-name">{entity.name}</span>
            {children}
            <div className="entity-actions">
              <button type="button" className="ghost small" onClick={startEdit} disabled={busy}>
                Rename
              </button>
              <button type="button" className="danger small" onClick={() => void handleDelete()} disabled={busy}>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
      {error && <p className="error inline row-error">{error}</p>}
    </>
  );
}

export default function AddEntities({ refreshKey, onChanged }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { show: showSnackbar } = useSnackbar();

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
  async function renameGame(id: number, name: string) {
    await api.renameGame(id, name);
    await load();
    onChanged();
  }
  async function deleteGame(id: number) {
    await api.deleteGame(id);
    await load();
    onChanged();
    showSnackbar('Game deleted');
  }
  async function renamePlayer(id: number, name: string) {
    await api.renamePlayer(id, name);
    await load();
    onChanged();
  }
  async function deletePlayer(id: number) {
    await api.deletePlayer(id);
    await load();
    onChanged();
    showSnackbar('Player deleted');
  }

  async function uploadGameImage(gameId: number, file: File) {
    await api.uploadGameImage(gameId, file);
    await load();
    onChanged();
  }
  async function deleteGameImage(gameId: number) {
    await api.deleteGameImage(gameId);
    await load();
    onChanged();
  }
  async function uploadPlayerImage(playerId: number, file: File) {
    await api.uploadPlayerImage(playerId, file);
    await load();
    onChanged();
  }
  async function deletePlayerImage(playerId: number) {
    await api.deletePlayerImage(playerId);
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
                <RenameRow entity={g} onRename={renameGame} onDelete={deleteGame} />
                <ImageUpload
                  hasImage={g.imageVersion != null}
                  previewNode={
                    g.imageVersion ? (
                      <GameImage gameId={g.id} imageVersion={g.imageVersion} variant="thumb" alt={g.name} />
                    ) : (
                      <span className="image-placeholder">no image</span>
                    )
                  }
                  onUpload={(file) => uploadGameImage(g.id, file)}
                  onDelete={() => deleteGameImage(g.id)}
                  label="Add image"
                />
                <GameTagEditor game={g} onUpdate={(nextTags) => updateGameTags(g, nextTags)} />
              </li>
            ))}
          </ul>
        )}
        <QuickAddInline label="New game name" onAdd={handleAddGame} />
        <p className="muted small">
          Tag games with anything useful — style, duration, player count — then filter the
          Leaderboard and Compare tabs by those tags. Deleting a game is refused if it has
          recorded plays.
        </p>
      </div>

      <div className="card">
        <h2>Players</h2>
        {players.length === 0 ? (
          <p className="muted">No players yet — add your first below.</p>
        ) : (
          <ul className="entity-list">
            {players.map((p) => (
              <li key={p.id} className="game-row">
                <RenameRow entity={p} onRename={renamePlayer} onDelete={deletePlayer} />
                <ImageUpload
                  hasImage={p.imageVersion != null}
                  previewNode={
                    <Avatar
                      playerId={p.id}
                      playerName={p.name}
                      imageVersion={p.imageVersion}
                      size={40}
                    />
                  }
                  onUpload={(file) => uploadPlayerImage(p.id, file)}
                  onDelete={() => deletePlayerImage(p.id)}
                  label="Add avatar"
                />
              </li>
            ))}
          </ul>
        )}
        <QuickAddInline label="New player name" onAdd={handleAddPlayer} />
        <p className="muted small">
          Deleting a player is refused if they have recorded plays.
        </p>
      </div>
    </div>
  );
}
