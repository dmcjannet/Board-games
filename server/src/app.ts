import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gamesRouter } from './routes/games';
import { playersRouter } from './routes/players';
import { playsRouter } from './routes/plays';
import { statsRouter } from './routes/stats';
import { AppError } from './errors';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/games', gamesRouter);
  app.use('/api/players', playersRouter);
  app.use('/api/plays', playsRouter);
  app.use('/api/stats', statsRouter);

  // Serve the built client (production) when it exists, same-origin.
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (existsSync(clientDist)) {
    const indexHtml = fileURLToPath(new URL('../../client/dist/index.html', import.meta.url));
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(indexHtml);
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
