import { Router } from 'express';
import { tagsRepo } from '../repositories/tagsRepo';

export const tagsRouter = Router();

tagsRouter.get('/', (_req, res) => {
  res.json(tagsRepo.findAll());
});
