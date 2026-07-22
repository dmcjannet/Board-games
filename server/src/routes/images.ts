import { Router } from 'express';
import multer from 'multer';
import { gamesRepo } from '../repositories/gamesRepo';
import { playersRepo } from '../repositories/playersRepo';
import { playsRepo } from '../repositories/playsRepo';
import { deleteImage, imageExists, imagePath, saveImage, type ImageKind } from '../utils/images';
import { AppError } from '../errors';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Unsupported image type. Use JPEG, PNG, or WebP.'));
    }
  },
});

function existsFor(kind: ImageKind, id: number): boolean {
  if (kind === 'games') return gamesRepo.findById(id) != null;
  if (kind === 'players') return playersRepo.findById(id) != null;
  return playsRepo.findById(id) != null;
}

function labelFor(kind: ImageKind): string {
  if (kind === 'games') return 'Game';
  if (kind === 'players') return 'Player';
  return 'Play';
}

// Mounts /:id/image routes onto an existing router (games or players).
export function attachImageRoutes(router: Router, kind: ImageKind) {
  router.get('/:id/image', (req, res) => {
    const id = Number(req.params.id);
    if (!imageExists(kind, id)) {
      throw new AppError(404, 'Image not found');
    }
    // 1 day browser cache — the client cache-busts uploads via ?v=<mtime>
    res.set('Cache-Control', 'public, max-age=86400');
    res.sendFile(imagePath(kind, id));
  });

  router.put('/:id/image', upload.single('image'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new AppError(400, 'Invalid id');
    if (!existsFor(kind, id)) {
      throw new AppError(404, `${labelFor(kind)} not found`);
    }
    if (!req.file) throw new AppError(400, 'No image file provided');
    try {
      await saveImage(kind, id, req.file.buffer);
    } catch (err) {
      throw new AppError(400, `Failed to process image: ${err instanceof Error ? err.message : 'unknown'}`);
    }
    const entity =
      kind === 'games' ? gamesRepo.findById(id)
      : kind === 'players' ? playersRepo.findById(id)
      : playsRepo.findById(id);
    res.json(entity);
  });

  router.delete('/:id/image', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new AppError(400, 'Invalid id');
    const deleted = deleteImage(kind, id);
    if (!deleted) throw new AppError(404, 'No image to delete');
    res.status(204).send();
  });
}
