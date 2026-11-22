import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDb, persistDb } from './_runtime';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await ensureDb();
    const { runScan, getScanStatus } = await import('../server/src/services/scanner');
    const started = await runScan('scheduled');
    if (!started) {
      res.status(202).json({ ok: true, skipped: true });
      return;
    }
    const deadline = Date.now() + 270000;
    while (getScanStatus().running && Date.now() < deadline) await sleep(2000);
    await persistDb();
    res.json({ ok: true, stillRunning: getScanStatus().running });
  } catch (error) {
    console.error('[gringa] cron error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Cron failed' });
  }
}
