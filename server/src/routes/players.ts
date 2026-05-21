import { Router } from 'express';
import { playersRepo } from '../repositories/playersRepo';
import { nameSchema } from '../schemas/play';
import { AppError } from '../errors';

export const playersRouter = Router();

playersRouter.get('/', (_req, res) => {
  res.json(playersRepo.findAll());
});

playersRouter.post('/', (req, res) => {
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]!.message);
  }
  try {
    const player = playersRepo.create(parsed.data.name);
    res.status(201).json(player);
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError(409, 'A player with that name already exists');
    }
    throw err;
  }
});
