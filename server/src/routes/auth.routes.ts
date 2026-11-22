import { Router } from 'express';
import { authenticate, clearSessionCookie, getSessionEmail, setSessionCookie } from '../auth';
import { db } from '../db';

export const authRouter = Router();

authRouter.get('/me', (req, res) => {
  res.json({ authenticated: Boolean(req.cookies?.gringa_session), email: getSessionEmail(req) });
});

authRouter.post('/login', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  if (!authenticate(email, password)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number };
  setSessionCookie(res, user.id);
  res.json({ ok: true, email });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
