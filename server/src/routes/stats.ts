import { Router } from 'express';
import { statsRepo } from '../repositories/statsRepo';

export const statsRouter = Router();

statsRouter.get('/', (req, res) => {
  let playerCount: number | null = null;
  const rawCount = req.query.players;
  if (typeof rawCount === 'string' && rawCount !== '' && rawCount !== 'all') {
    const parsed = Number(rawCount);
    if (Number.isInteger(parsed) && parsed > 0) {
      playerCount = parsed;
    }
  }

  let playerIds: number[] = [];
  const rawIds = req.query.playerIds;
  if (typeof rawIds === 'string' && rawIds !== '') {
    playerIds = Array.from(
      new Set(
        rawIds
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    );
  }

  res.json(statsRepo.getStats(playerCount, playerIds));
});
