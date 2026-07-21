import { db } from './connection';
import { tagsRepo } from '../repositories/tagsRepo';

const GAMES = ['Catan', 'Wingspan', 'Ticket to Ride', 'Terraforming Mars', 'Carcassonne'] as const;
type GameName = (typeof GAMES)[number];

// Tags applied to each game so the tag filter has data to work with.
const GAME_TAGS: Record<GameName, string[]> = {
  Catan: ['strategy', 'medium'],
  Wingspan: ['strategy', 'engine-building'],
  'Ticket to Ride': ['strategy', 'family'],
  'Terraforming Mars': ['strategy', 'engine-building', 'long'],
  Carcassonne: ['family', 'quick'],
};

const PLAYERS = ['David', 'Emily', 'Will', 'Ellie'] as const;
type PlayerName = (typeof PLAYERS)[number];

// Each player's mean score per game — encodes their "skill" at that game.
// Bigger means = more likely to win. Chosen so each player has a specialty
// (David → Terraforming Mars, Emily → Ticket to Ride, Ellie → Carcassonne,
// Will → balanced), which makes the leaderboards and Compare view interesting.
const PLAYER_MEAN: Record<PlayerName, Record<GameName, number>> = {
  David: { Catan: 10, Wingspan: 102, 'Ticket to Ride': 95, 'Terraforming Mars': 130, Carcassonne: 78 },
  Emily: { Catan: 11, Wingspan: 88, 'Ticket to Ride': 118, 'Terraforming Mars': 108, Carcassonne: 84 },
  Will: { Catan: 9, Wingspan: 90, 'Ticket to Ride': 100, 'Terraforming Mars': 110, Carcassonne: 86 },
  Ellie: { Catan: 12, Wingspan: 85, 'Ticket to Ride': 95, 'Terraforming Mars': 112, Carcassonne: 100 },
};

// Score noise amplitude per game — reflects the natural variance in that game.
const GAME_JITTER: Record<GameName, number> = {
  Catan: 3,
  Wingspan: 12,
  'Ticket to Ride': 15,
  'Terraforming Mars': 18,
  Carcassonne: 10,
};

// Deterministic glibc-style LCG so re-seeding produces identical demo data.
let rngState = 0xcafe;
function rand(): number {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x80000000;
}
function randInt(maxExclusive: number): number {
  return Math.floor(rand() * maxExclusive);
}
function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

const existing = (db.prepare('SELECT COUNT(*) AS c FROM plays').get() as { c: number }).c;
if (existing > 0) {
  console.error(`Refusing to seed — ${existing} play(s) already exist.`);
  console.error('To reset and reseed with demo data:');
  console.error('  1. Stop the dev server (Ctrl+C in that terminal).');
  console.error('  2. Delete the server/data/ folder (contains app.db and WAL files).');
  console.error('  3. Re-run: npm run seed:demo');
  process.exit(1);
}

const insertGame = db.prepare('INSERT OR IGNORE INTO games (name) VALUES (?)');
const insertPlayer = db.prepare('INSERT OR IGNORE INTO players (name) VALUES (?)');
const selectGameId = db.prepare('SELECT id FROM games WHERE name = ?');
const selectPlayerId = db.prepare('SELECT id FROM players WHERE name = ?');

db.transaction(() => {
  for (const g of GAMES) insertGame.run(g);
  for (const p of PLAYERS) insertPlayer.run(p);
})();

const gameIds = new Map<GameName, number>();
for (const g of GAMES) {
  gameIds.set(g, (selectGameId.get(g) as { id: number }).id);
}
const playerIds = new Map<PlayerName, number>();
for (const p of PLAYERS) {
  playerIds.set(p, (selectPlayerId.get(p) as { id: number }).id);
}

// Attach the demo tag set to each game (idempotent — setForGame replaces).
for (const g of GAMES) {
  tagsRepo.setForGame(gameIds.get(g)!, GAME_TAGS[g]);
}

const insertPlay = db.prepare('INSERT INTO plays (game_id, played_on) VALUES (?, ?)');
const insertScore = db.prepare(
  'INSERT INTO play_scores (play_id, player_id, score, is_winner) VALUES (?, ?, ?, ?)',
);

const NUM_PLAYS = 100;
const DAYS_BACK = 180;
const startMillis = Date.now() - DAYS_BACK * 86_400_000;

db.transaction(() => {
  for (let i = 0; i < NUM_PLAYS; i++) {
    const game = GAMES[randInt(GAMES.length)]!;
    const numPlayers = 2 + randInt(3); // 2, 3, or 4 players
    const chosen = shuffle(PLAYERS).slice(0, numPlayers);
    const dayOffset = randInt(DAYS_BACK);
    const playedOn = new Date(startMillis + dayOffset * 86_400_000).toISOString().slice(0, 10);

    const info = insertPlay.run(gameIds.get(game)!, playedOn);
    const playId = Number(info.lastInsertRowid);

    const spread = GAME_JITTER[game];
    const scoreEntries = chosen.map((name) => {
      const mean = PLAYER_MEAN[name][game];
      const jitter = randInt(spread * 2 + 1) - spread;
      const score = Math.max(0, mean + jitter);
      return { name, score };
    });

    const maxScore = Math.max(...scoreEntries.map((s) => s.score));
    for (const s of scoreEntries) {
      insertScore.run(playId, playerIds.get(s.name)!, s.score, s.score === maxScore ? 1 : 0);
    }
  }
})();

console.log(`Seeded ${GAMES.length} games, ${PLAYERS.length} players, and ${NUM_PLAYS} plays.`);
