import { Router } from 'express';
import { getLastScanRun } from '../db';
import { getScanStatus, runScan } from '../services/scanner';
import type { ScanTrigger } from '../types';

export const scanRouter = Router();

scanRouter.get('/status', (_req, res) => {
  res.json({ ...getScanStatus(), lastRunRow: getLastScanRun() });
});

scanRouter.post('/', async (_req, res) => {
  const trigger = 'manual' as ScanTrigger;
  const result = await runScan(trigger);
  res.status(result.started ? 202 : 429).json(result);
});
