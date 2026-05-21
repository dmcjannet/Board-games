export interface Game {
  id: number;
  name: string;
  createdAt: string;
}

export interface Player {
  id: number;
  name: string;
  createdAt: string;
}

export interface PlayScore {
  playerId: number;
  playerName: string;
  score: number;
  isWinner: boolean;
}

export interface Play {
  id: number;
  playedOn: string;
  notes: string | null;
  createdAt: string;
  game: { id: number; name: string };
  scores: PlayScore[];
}

export interface CreatePlayPayload {
  gameId: number;
  playedOn: string;
  notes?: string | null;
  scores: { playerId: number; score: number; isWinner: boolean }[];
}
