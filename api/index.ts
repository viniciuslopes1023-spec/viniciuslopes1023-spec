import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';
import { ensureDb, persistDb } from './_runtime';
import { createApp } from '../server/src/app';

let app: Express | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureDb();
    if (!app) app = createApp();

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
