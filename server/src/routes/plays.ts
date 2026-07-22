import { Router } from 'express';
import { playsRepo } from '../repositories/playsRepo';
import { gamesRepo } from '../repositories/gamesRepo';
import { playersRepo } from '../repositories/playersRepo';
import { createPlaySchema } from '../schemas/play';
import { AppError } from '../errors';
import { attachImageRoutes } from './images';

export const playsRouter = Router();

attachImageRoutes(playsRouter, 'plays');

playsRouter.get('/', (req, res) => {
  const requested = Number(req.query.limit);
  const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 20, 1), 1000);
  res.json(playsRepo.findRecent(limit));
});

playsRouter.get('/:id', (req, res) => {
  const play = playsRepo.findById(Number(req.params.id));
  if (!play) {
    throw new AppError(404, 'Play not found');
  }
  res.json(play);
});

playsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    throw new AppError(400, 'Invalid play id');
  }
  const deleted = playsRepo.deleteById(id);
  if (!deleted) {
    throw new AppError(404, 'Play not found');
  }
  res.status(204).send();
});

function validateAndBuildInput(body: unknown) {
  const parsed = createPlaySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]!.message);
  }
  const data = parsed.data;
  if (!gamesRepo.findById(data.gameId)) {
    throw new AppError(400, 'Selected game does not exist');
  }
  for (const s of data.scores) {
    if (!playersRepo.findById(s.playerId)) {
      throw new AppError(400, `Player ${s.playerId} does not exist`);
    }
  }
  return {
    gameId: data.gameId,
    playedOn: data.playedOn,
    notes: data.notes ?? null,
    scores: data.scores.map((s) => ({
      playerId: s.playerId,
      score: s.score,
      isWinner: s.isWinner,
    })),
  };
}

playsRouter.post('/', (req, res) => {
  const input = validateAndBuildInput(req.body);
  const play = playsRepo.create(input);
  res.status(201).json(play);
});

playsRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new AppError(400, 'Invalid play id');
  if (!playsRepo.findById(id)) throw new AppError(404, 'Play not found');
  const input = validateAndBuildInput(req.body);
  const play = playsRepo.update(id, input);
  res.json(play);
});
