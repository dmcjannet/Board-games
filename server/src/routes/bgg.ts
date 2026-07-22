import { Router } from 'express';
import { z } from 'zod';
import { fetchBGGGame, searchBGG } from '../utils/bgg';
import { gamesRepo } from '../repositories/gamesRepo';
import { tagsRepo } from '../repositories/tagsRepo';
import { saveImage } from '../utils/images';
import { AppError } from '../errors';
import { tagsFromBGGGame } from '../utils/bgg';

export const bggRouter = Router();

bggRouter.get('/search', async (req, res) => {
  const query = String(req.query.q ?? '').trim();
  if (!query) throw new AppError(400, 'Query is required');
  if (query.length > 100) throw new AppError(400, 'Query too long');
  try {
    const results = await searchBGG(query);
    res.json(results);
  } catch (err) {
    throw new AppError(502, `BGG search failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
});

bggRouter.get('/game/:bggId', async (req, res) => {
  const bggId = Number(req.params.bggId);
  if (!Number.isInteger(bggId) || bggId <= 0) throw new AppError(400, 'Invalid BGG id');
  try {
    const game = await fetchBGGGame(bggId);
    if (!game) throw new AppError(404, 'Game not found on BGG');
    res.json(game);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, `BGG lookup failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
});

// Enrich an existing game with BGG data:
//  - merges derived tags (categories + mechanics + duration bucket) into
//    the current tag set, capped at 20
//  - downloads the box art through the sharp pipeline (unless the game
//    already has an image, so a manual upload isn't overwritten)
const importSchema = z.object({
  bggId: z.number().int().positive(),
  replaceImage: z.boolean().optional(),
});

bggRouter.post('/games/:id/import', async (req, res) => {
  const gameId = Number(req.params.id);
  if (!Number.isInteger(gameId) || gameId <= 0) throw new AppError(400, 'Invalid game id');
  const existing = gamesRepo.findById(gameId);
  if (!existing) throw new AppError(404, 'Game not found');
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]!.message);

  const bggGame = await fetchBGGGame(parsed.data.bggId);
  if (!bggGame) throw new AppError(404, 'Game not found on BGG');

  const derivedTags = tagsFromBGGGame(bggGame);
  const mergedTags = Array.from(new Set([...existing.tags, ...derivedTags])).slice(0, 20);
  tagsRepo.setForGame(gameId, mergedTags);

  const shouldDownload = bggGame.image && (parsed.data.replaceImage || !existing.imageVersion);
  let imageDownloaded = false;
  let imageError: string | null = null;
  if (shouldDownload) {
    try {
      const imgRes = await fetch(bggGame.image!);
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      await saveImage('games', gameId, buffer);
      imageDownloaded = true;
    } catch (err) {
      // Non-fatal — tags still applied, user can upload manually.
      imageError = err instanceof Error ? err.message : 'unknown';
    }
  }

  res.json({
    game: gamesRepo.findById(gameId),
    addedTags: derivedTags,
    imageDownloaded,
    imageError,
  });
});
