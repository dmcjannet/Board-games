import { Router } from 'express';
import { statsRepo } from '../repositories/statsRepo';

export const statsRouter = Router();

statsRouter.get('/', (req, res) => {
  let playerCount: number | null = null;
  const raw = req.query.players;
  if (typeof raw === 'string' && raw !== '' && raw !== 'all') {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      playerCount = parsed;
    }
  }
  res.json(statsRepo.getStats(playerCount));
});
