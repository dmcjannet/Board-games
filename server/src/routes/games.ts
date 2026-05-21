import { Router } from 'express';
import { gamesRepo } from '../repositories/gamesRepo';
import { nameSchema } from '../schemas/play';
import { AppError } from '../errors';

export const gamesRouter = Router();

gamesRouter.get('/', (_req, res) => {
  res.json(gamesRepo.findAll());
});

gamesRouter.post('/', (req, res) => {
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]!.message);
  }
  try {
    const game = gamesRepo.create(parsed.data.name);
    res.status(201).json(game);
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError(409, 'A game with that name already exists');
    }
    throw err;
  }
});
