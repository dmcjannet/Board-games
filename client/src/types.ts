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

export interface PlayerStats {
  playerId: number;
  playerName: string;
  plays: number;
  wins: number;
  winRate: number;
  averageScore: number;
  highScore: number;
}

export interface GameLeaderboard {
  gameId: number;
  gameName: string;
  totalPlays: number;
  leaderboard: PlayerStats[];
}

export interface StatsResponse {
  overall: PlayerStats[];
  games: GameLeaderboard[];
}

export interface CreatePlayPayload {
  gameId: number;
  playedOn: string;
  notes?: string | null;
  scores: { playerId: number; score: number; isWinner: boolean }[];
}
