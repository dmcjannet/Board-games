import type { Game, Player, Play, CreatePlayPayload, StatsResponse } from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // response had no JSON body; keep the default message
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  getGames: () => request<Game[]>('/api/games'),
  createGame: (name: string) =>
    request<Game>('/api/games', { method: 'POST', body: JSON.stringify({ name }) }),

  getPlayers: () => request<Player[]>('/api/players'),
  createPlayer: (name: string) =>
    request<Player>('/api/players', { method: 'POST', body: JSON.stringify({ name }) }),

  getRecentPlays: (limit = 20) => request<Play[]>(`/api/plays?limit=${limit}`),
  createPlay: (payload: CreatePlayPayload) =>
    request<Play>('/api/plays', { method: 'POST', body: JSON.stringify(payload) }),
  deletePlay: (id: number) => request<void>(`/api/plays/${id}`, { method: 'DELETE' }),

  getStats: (playerCount?: number | null) => {
    const query = playerCount != null ? `?players=${playerCount}` : '';
    return request<StatsResponse>(`/api/stats${query}`);
  },
};
