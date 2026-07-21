import { Router } from 'express';
import { z } from 'zod';
import { gamesRepo } from '../repositories/gamesRepo';
import { tagsRepo } from '../repositories/tagsRepo';
import { nameSchema } from '../schemas/play';
import { AppError } from '../errors';

const setTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
});

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

gamesRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new AppError(400, 'Invalid game id');
  if (!gamesRepo.findById(id)) throw new AppError(404, 'Game not found');
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]!.message);
  }
  try {
    res.json(gamesRepo.rename(id, parsed.data.name));
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError(409, 'A game with that name already exists');
    }
    throw err;
  }
});

gamesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new AppError(400, 'Invalid game id');
  try {
    const deleted = gamesRepo.deleteById(id);
    if (!deleted) throw new AppError(404, 'Game not found');
    res.status(204).send();
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      throw new AppError(409, 'This game has recorded plays. Delete those plays first.');
    }
    throw err;
  }
});

gamesRouter.put('/:id/tags', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    throw new AppError(400, 'Invalid game id');
  }
  if (!gamesRepo.findById(id)) {
    throw new AppError(404, 'Game not found');
  }
  const parsed = setTagsSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]!.message);
  }
  tagsRepo.setForGame(id, parsed.data.tags);
  res.json(gamesRepo.findById(id));
});
