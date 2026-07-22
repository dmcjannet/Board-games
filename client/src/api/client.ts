import type {
  Game,
  Player,
  Play,
  CreatePlayPayload,
  StatsResponse,
  BGGSearchResult,
  BGGGame,
  BGGImportResult,
} from '../types';

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
  renameGame: (id: number, name: string) =>
    request<Game>(`/api/games/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteGame: (id: number) => request<void>(`/api/games/${id}`, { method: 'DELETE' }),

  getPlayers: () => request<Player[]>('/api/players'),
  createPlayer: (name: string) =>
    request<Player>('/api/players', { method: 'POST', body: JSON.stringify({ name }) }),
  renamePlayer: (id: number, name: string) =>
    request<Player>(`/api/players/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deletePlayer: (id: number) => request<void>(`/api/players/${id}`, { method: 'DELETE' }),

  getRecentPlays: (limit = 20) => request<Play[]>(`/api/plays?limit=${limit}`),
  createPlay: (payload: CreatePlayPayload) =>
    request<Play>('/api/plays', { method: 'POST', body: JSON.stringify(payload) }),
  updatePlay: (id: number, payload: CreatePlayPayload) =>
    request<Play>(`/api/plays/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePlay: (id: number) => request<void>(`/api/plays/${id}`, { method: 'DELETE' }),

  getStats: (playerCount?: number | null, playerIds?: number[], tags?: string[]) => {
    const params = new URLSearchParams();
    if (playerCount != null) params.set('players', String(playerCount));
    if (playerIds && playerIds.length > 0) params.set('playerIds', playerIds.join(','));
    if (tags && tags.length > 0) params.set('tags', tags.join(','));
    const query = params.toString();
    return request<StatsResponse>(`/api/stats${query ? `?${query}` : ''}`);
  },

  getTags: () => request<string[]>('/api/tags'),
  setGameTags: (gameId: number, tags: string[]) =>
    request<Game>(`/api/games/${gameId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags }),
    }),

  uploadGameImage: (gameId: number, file: File) => uploadImage(`/api/games/${gameId}/image`, file),
  deleteGameImage: (gameId: number) =>
    request<void>(`/api/games/${gameId}/image`, { method: 'DELETE' }),

  uploadPlayerImage: (playerId: number, file: File) =>
    uploadImage(`/api/players/${playerId}/image`, file),
  deletePlayerImage: (playerId: number) =>
    request<void>(`/api/players/${playerId}/image`, { method: 'DELETE' }),

  uploadPlayImage: (playId: number, file: File) =>
    uploadImage<Play>(`/api/plays/${playId}/image`, file),
  deletePlayImage: (playId: number) => request<void>(`/api/plays/${playId}/image`, { method: 'DELETE' }),

  bggSearch: (query: string) =>
    request<BGGSearchResult[]>(`/api/bgg/search?q=${encodeURIComponent(query)}`),
  bggGetGame: (bggId: number) => request<BGGGame>(`/api/bgg/game/${bggId}`),
  bggImportToGame: (gameId: number, bggId: number, replaceImage?: boolean) =>
    request<BGGImportResult>(`/api/bgg/games/${gameId}/import`, {
      method: 'POST',
      body: JSON.stringify({ bggId, replaceImage: replaceImage ?? false }),
    }),
};

async function uploadImage<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(url, { method: 'PUT', body: form });
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // no JSON body; keep default
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
