import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Game, Player } from '../types';
import QuickAddInline from './QuickAddInline';

interface Props {
  refreshKey: number;
  onChanged: () => void;
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

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="add-entities">
      <div className="card">
        <h2>Games</h2>
        {games.length === 0 ? (
          <p className="muted">No games yet — add your first below.</p>
        ) : (
          <ul className="entity-list">
            {games.map((g) => (
              <li key={g.id}>{g.name}</li>
            ))}
          </ul>
        )}
        <QuickAddInline label="New game name" onAdd={handleAddGame} />
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
