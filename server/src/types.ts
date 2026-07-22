export interface Game {
  id: number;
  name: string;
  createdAt: string;
  tags: string[];
  imageVersion: string | null;
}

export interface Player {
  id: number;
  name: string;
  createdAt: string;
  imageVersion: string | null;
}

export interface PlayScore {
  playerId: number;
  playerName: string;
  playerImageVersion: string | null;
  score: number;
  isWinner: boolean;
}

export interface Play {
  id: number;
  playedOn: string;
  notes: string | null;
  createdAt: string;
  imageVersion: string | null;
  game: { id: number; name: string; imageVersion: string | null };
  scores: PlayScore[];
}
