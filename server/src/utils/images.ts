import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dbPath =
  process.env.DB_PATH ?? fileURLToPath(new URL('../../data/app.db', import.meta.url));

const imagesDir = process.env.IMAGES_PATH ?? join(dirname(dbPath), 'images');

// Ensure per-kind subdirs exist up front so writes don't ENOENT under load.
mkdirSync(join(imagesDir, 'games'), { recursive: true });
mkdirSync(join(imagesDir, 'players'), { recursive: true });
mkdirSync(join(imagesDir, 'plays'), { recursive: true });

export type ImageKind = 'games' | 'players' | 'plays';

const SIZES: Record<ImageKind, { width: number; height: number }> = {
  games: { width: 800, height: 800 },
  players: { width: 400, height: 400 },
  plays: { width: 1200, height: 900 },
};

export function imagePath(kind: ImageKind, id: number): string {
  return join(imagesDir, kind, `${id}.jpg`);
}

export function imageExists(kind: ImageKind, id: number): boolean {
  return existsSync(imagePath(kind, id));
}

// Returns a stable version identifier the client can append to img URLs to bust
// the browser cache after a re-upload. Uses mtime (ms) — cheap, changes on
// every write.
export function imageVersion(kind: ImageKind, id: number): string | null {
  const p = imagePath(kind, id);
  if (!existsSync(p)) return null;
  return String(statSync(p).mtimeMs);
}

export async function saveImage(kind: ImageKind, id: number, buffer: Buffer): Promise<void> {
  const size = SIZES[kind];
  // Games (hero tiles) and players (round avatars) look best cover-cropped to
  // an exact size. Play photos are user-taken snapshots — preserve aspect
  // ratio by bounding them "inside" the target dimensions.
  const fit = kind === 'plays' ? 'inside' : 'cover';
  await sharp(buffer)
    .rotate() // apply EXIF orientation
    .resize(size.width, size.height, { fit, position: 'center', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(imagePath(kind, id));
}

export function deleteImage(kind: ImageKind, id: number): boolean {
  const p = imagePath(kind, id);
  if (!existsSync(p)) return false;
  unlinkSync(p);
  return true;
}
