import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { db } from './db';

const COOKIE_NAME = 'gringa_session';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function ensureAdminUser(): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  if (count > 0) return;

  const password = config.adminPassword || crypto.randomBytes(12).toString('base64url');
  db.prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)').run(
    config.adminEmail,
    hashPassword(password),
    new Date().toISOString()
  );

  if (!config.adminPassword) {
    const text = [
      'GRINGA — initial credentials generated (save them, they are shown only here):',
      `  Email:     ${config.adminEmail}`,
      `  Password:  ${password}`,
      'Change them with ADMIN_EMAIL / ADMIN_PASSWORD in .env and restart.',
      '',
    ].join('\n');
    console.log(text);
    fs.writeFileSync(path.join(config.dataDir, 'initial-credentials.txt'), text, { mode: 0o600 });
  }
}

export function authenticate(email: string, password: string): boolean {
  const user = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email.toLowerCase()) as
    | { id: number; password_hash: string }
    | undefined;
  if (!user) return false;
  if (!verifyPassword(password, user.password_hash)) return false;
  return true;
}

function makeToken(userId: number): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: `${config.sessionHours}h` });
}

export function setSessionCookie(res: Response, userId: number): void {
  res.cookie(COOKIE_NAME, makeToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.clientOrigin.startsWith('https://'),
    maxAge: config.sessionHours * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function getSessionEmail(req: Request): string | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(payload.sub) as { email: string } | undefined;
    return user?.email ?? null;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    req.userId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}
