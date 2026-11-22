import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config';
import { ensureAdminUser, requireAuth } from './auth';
import { authRouter } from './routes/auth.routes';
import { leadsRouter } from './routes/leads.routes';
import { scanRouter } from './routes/scan.routes';

export function createApp() {
  ensureAdminUser();

  const app = express();
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'gringa' }));
  app.use('/api/auth', authRouter);
  app.use('/api/leads', requireAuth, leadsRouter);
  app.use('/api/scan', requireAuth, scanRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  const webDist = path.resolve(config.rootDir, 'web', 'dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
