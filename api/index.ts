import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';
import { ensureDb, persistDb } from './_runtime.js';

let app: Express | null = null;

function restoreOriginalPath(req: VercelRequest): void {
  const forwarded = req.query?.path;
  if (typeof forwarded !== 'string' || !forwarded) return;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'path' || typeof value !== 'string') continue;
    params.set(key, value);
  }
  req.url = `/api/${forwarded}${params.size ? `?${params.toString()}` : ''}`;
  (req as unknown as { query: unknown }).query = undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureDb();
    restoreOriginalPath(req);
    if (!app) {
      const { createApp } = await import('../server/src/app.js');
      app = createApp();
    }

    const finished = new Promise<void>((resolve) => {
      res.once('finish', resolve);
      res.once('close', resolve);
    });

    await app(req as never, res as never);
    await finished;
    await persistDb();
  } catch (error) {
    console.error('[gringa] handler error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
}
