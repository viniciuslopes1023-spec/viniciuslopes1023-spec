import { Router } from 'express';
import { countByWebsiteStatus, getLeads, getLastScanRun, getStats, setProspectStatus } from '../db';
import type { ProspectStatus } from '../types';

export const leadsRouter = Router();

const VIEWS = new Set(['main', 'phone', 'secondary', 'all', 'worked', 'ignored']);

leadsRouter.get('/', (req, res) => {
  const view = typeof req.query.view === 'string' && VIEWS.has(req.query.view) ? req.query.view : 'main';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.min(500, Math.max(1, Math.floor(requestedLimit))) : 300;

  res.json({
    leads: getLeads({ view: view as 'main' | 'phone' | 'secondary' | 'all' | 'worked' | 'ignored', q, limit }),
    stats: getStats(),
    counts: countByWebsiteStatus(),
    lastScan: getLastScanRun(),
  });
});

leadsRouter.patch('/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status as ProspectStatus;
  if (!Number.isInteger(id) || !['new', 'worked', 'ignored'].includes(status)) {
    res.status(400).json({ error: 'Invalid lead id or status' });
    return;
  }
  if (!setProspectStatus(id, status)) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  res.json({ ok: true });
});
