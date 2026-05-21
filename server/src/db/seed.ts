import { db } from './connection';

const games = ['Catan', 'Ticket to Ride', 'Carcassonne', 'Wingspan'];
const players = ['Alex', 'Sam', 'Jordan', 'Riley'];

const insertGame = db.prepare('INSERT OR IGNORE INTO games (name) VALUES (?)');
const insertPlayer = db.prepare('INSERT OR IGNORE INTO players (name) VALUES (?)');

const seed = db.transaction(() => {
  for (const name of games) insertGame.run(name);
  for (const name of players) insertPlayer.run(name);
});

seed();

console.log(`Seeded ${games.length} games and ${players.length} players (idempotent).`);
