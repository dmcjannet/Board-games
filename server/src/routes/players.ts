import { Router } from 'express';
import { playersRepo } from '../repositories/playersRepo';
import { nameSchema } from '../schemas/play';
import { AppError } from '../errors';
import { attachImageRoutes } from './images';

export const playersRouter = Router();

attachImageRoutes(playersRouter, 'players');

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

playersRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new AppError(400, 'Invalid player id');
  if (!playersRepo.findById(id)) throw new AppError(404, 'Player not found');
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]!.message);
  }
  try {
    res.json(playersRepo.rename(id, parsed.data.name));
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError(409, 'A player with that name already exists');
    }
    throw err;
  }
});

playersRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new AppError(400, 'Invalid player id');
  try {
    const deleted = playersRepo.deleteById(id);
    if (!deleted) throw new AppError(404, 'Player not found');
    res.status(204).send();
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      throw new AppError(409, 'This player has recorded plays. Delete those plays first.');
    }
    throw err;
  }
});
