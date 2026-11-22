import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import dotenv from 'dotenv';

const isServerless = Boolean(process.env.VERCEL);
const rootDir = isServerless ? process.cwd() : path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const dataDir = isServerless
  ? path.join(os.tmpdir(), 'gringa-data')
  : path.join(rootDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });

function readJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  const file = path.join(dataDir, 'jwt-secret');
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= 16) return existing;
  }
  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, generated, { mode: 0o600 });
  } catch {
    return generated;
  }
  return generated;
}

function intEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export const config = {
  rootDir,
  dataDir,
  dbPath: path.join(dataDir, 'gringa.db'),
  port: intEnv('PORT', 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: readJwtSecret(),
  sessionHours: intEnv('SESSION_HOURS', 72),
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@gringa.local').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  scanIntervalHours: intEnv('SCAN_INTERVAL_HOURS', 6),
  scanMinIntervalMinutes: intEnv('SCAN_MIN_INTERVAL_MINUTES', 15),
  regionsPerRun: intEnv('REGIONS_PER_RUN', 3),
  maxResultsPerRegion: intEnv('MAX_RESULTS_PER_REGION', 30),
  overpassTimeoutMs: intEnv('OVERPASS_TIMEOUT_MS', 90000),
  overpassDelayMs: intEnv('OVERPASS_DELAY_MS', 5000),
  websiteTimeoutMs: intEnv('WEBSITE_TIMEOUT_MS', 15000),
  websiteProbeConcurrency: intEnv('WEBSITE_PROBE_CONCURRENCY', 3),
  overpassEndpoints: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ],
};

export type Config = typeof config;
