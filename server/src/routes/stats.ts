import { Router } from 'express';
import { statsRepo } from '../repositories/statsRepo';

export const statsRouter = Router();

statsRouter.get('/', (_req, res) => {
  res.json(statsRepo.getStats());
});
