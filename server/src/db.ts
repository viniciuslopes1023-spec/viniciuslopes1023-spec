import Database from 'better-sqlite3';
import { config } from './config';
import type { OsmListing, ProspectStatus, WebsiteStatus } from './types';

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    osm_id INTEGER NOT NULL,
    osm_type TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    country_code TEXT NOT NULL DEFAULT '',
    lat REAL,
    lon REAL,
    address TEXT NOT NULL DEFAULT '',
    website_url TEXT,
    website_host TEXT,
    website_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    website_note TEXT NOT NULL DEFAULT '',
    phone TEXT,
    email TEXT,
    instagram TEXT,
    facebook TEXT,
    source_url TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL DEFAULT '',
    opportunity TEXT NOT NULL DEFAULT '',
    prompt TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL DEFAULT 0,
    prospect_status TEXT NOT NULL DEFAULT 'new',
    discovered_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    verified_at TEXT,
    UNIQUE(osm_type, osm_id)
  );

  CREATE INDEX IF NOT EXISTS idx_leads_website_status ON leads(website_status);
  CREATE INDEX IF NOT EXISTS idx_leads_prospect_status ON leads(prospect_status);
  CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
  CREATE INDEX IF NOT EXISTS idx_leads_name_city ON leads(name, city);

  CREATE TABLE IF NOT EXISTS scan_state (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scan_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    trigger TEXT NOT NULL,
    status TEXT NOT NULL,
    regions_done INTEGER NOT NULL DEFAULT 0,
    found INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL DEFAULT 0,
    duplicates INTEGER NOT NULL DEFAULT 0,
    checked INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    detail TEXT NOT NULL DEFAULT ''
  );
`);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO leads (
    osm_id, osm_type, name, category, city, country, country_code,
    lat, lon, address, website_url, website_host, website_status, website_note,
    phone, email, instagram, facebook, source_url, tags_json,
    summary, opportunity, prompt, message, score, prospect_status,
    discovered_at, updated_at, verified_at
  ) VALUES (
    @osmId, @osmType, @name, @category, @city, @country, @countryCode,
    @lat, @lon, @address, @websiteUrl, @websiteHost, @websiteStatus, @websiteNote,
    @phone, @email, @instagram, @facebook, @sourceUrl, @tagsJson,
    @summary, @opportunity, @prompt, @message, @score, @prospectStatus,
    @discoveredAt, @updatedAt, @verifiedAt
  )
`);

export function insertLead(lead: OsmListing): boolean {
  return insertStmt.run(lead).changes > 0;
}

export function leadExists(osmType: string, osmId: number): boolean {
  return Boolean(db.prepare('SELECT 1 FROM leads WHERE osm_type = ? AND osm_id = ? LIMIT 1').get(osmType, osmId));
}

export function similarLeadExists(name: string, city: string, country: string): boolean {
  return Boolean(
    db
      .prepare(
        `SELECT 1 FROM leads
         WHERE lower(name) = lower(?) AND lower(city) = lower(?) AND lower(country) = lower(?)
         LIMIT 1`
      )
      .get(name, city, country)
  );
}

export function setProspectStatus(id: number, status: ProspectStatus): boolean {
  return (
    db
      .prepare('UPDATE leads SET prospect_status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id).changes > 0
  );
}

export interface LeadFilters {
  view: 'main' | 'phone' | 'secondary' | 'all' | 'worked' | 'ignored';
  q: string;
  limit: number;
}

export function getLeads(filters: LeadFilters) {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.view === 'main') {
    conditions.push("website_status = 'NO_WEBSITE_FOUND'", "prospect_status = 'new'");
  } else if (filters.view === 'phone') {
    conditions.push("website_status = 'NO_WEBSITE_FOUND'", "prospect_status = 'new'", "phone IS NOT NULL AND phone != ''");
  } else if (filters.view === 'secondary') {
    conditions.push("website_status IN ('WEBSITE_BROKEN','UNVERIFIED')", "prospect_status = 'new'");
  } else if (filters.view === 'worked') {
    conditions.push("prospect_status = 'worked'");
  } else if (filters.view === 'ignored') {
    conditions.push("prospect_status = 'ignored'");
  }

  if (filters.q) {
    conditions.push('(lower(name) LIKE @q OR lower(city) LIKE @q OR lower(category) LIKE @q OR lower(country) LIKE @q)');
    params.q = `%${filters.q.toLowerCase()}%`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.limit = filters.limit;
  const rows = db
    .prepare(`SELECT * FROM leads ${where} ORDER BY score DESC, discovered_at DESC LIMIT @limit`)
    .all(params) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function getStats() {
  const main = "website_status = 'NO_WEBSITE_FOUND' AND prospect_status = 'new'";
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const row = db
    .prepare(
      `SELECT
        COUNT(*) AS total_all,
        SUM(CASE WHEN ${main} THEN 1 ELSE 0 END) AS opportunities,
        SUM(CASE WHEN discovered_at >= @dayAgo THEN 1 ELSE 0 END) AS recent_24h,
        SUM(CASE WHEN ${main} AND phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) AS with_phone,
        SUM(CASE WHEN ${main} AND email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) AS with_email,
        SUM(CASE WHEN ${main} AND (instagram IS NOT NULL OR facebook IS NOT NULL) THEN 1 ELSE 0 END) AS with_social,
        SUM(CASE WHEN ${main} AND (phone IS NOT NULL AND phone != '' OR email IS NOT NULL AND email != '' OR instagram IS NOT NULL OR facebook IS NOT NULL) THEN 1 ELSE 0 END) AS with_contact,
        SUM(CASE WHEN website_status = 'WEBSITE_EXISTS' THEN 1 ELSE 0 END) AS with_website,
        SUM(CASE WHEN website_status = 'WEBSITE_BROKEN' THEN 1 ELSE 0 END) AS broken,
        SUM(CASE WHEN website_status = 'UNVERIFIED' THEN 1 ELSE 0 END) AS unverified,
        SUM(CASE WHEN prospect_status = 'worked' THEN 1 ELSE 0 END) AS worked,
        SUM(CASE WHEN prospect_status = 'ignored' THEN 1 ELSE 0 END) AS ignored,
        MAX(discovered_at) AS last_discovery
      FROM leads`
    )
    .get({ dayAgo }) as Record<string, number | string | null>;
  return {
    totalAll: Number(row.total_all || 0),
    opportunities: Number(row.opportunities || 0),
    recent24h: Number(row.recent_24h || 0),
    withPhone: Number(row.with_phone || 0),
    withEmail: Number(row.with_email || 0),
    withSocial: Number(row.with_social || 0),
    withContact: Number(row.with_contact || 0),
    withWebsite: Number(row.with_website || 0),
    broken: Number(row.broken || 0),
    unverified: Number(row.unverified || 0),
    worked: Number(row.worked || 0),
    ignored: Number(row.ignored || 0),
    lastDiscovery: row.last_discovery || null,
  };
}

export function countByWebsiteStatus(): Record<WebsiteStatus, number> {
  const rows = db.prepare('SELECT website_status, COUNT(*) AS n FROM leads GROUP BY website_status').all() as {
    website_status: WebsiteStatus;
    n: number;
  }[];
  const out: Record<WebsiteStatus, number> = {
    NO_WEBSITE_FOUND: 0,
    WEBSITE_EXISTS: 0,
    WEBSITE_BROKEN: 0,
    UNVERIFIED: 0,
  };
  for (const row of rows) out[row.website_status] = row.n;
  return out;
}

export function getNextRegionIndexes(total: number, count: number): number[] {
  const row = db.prepare("SELECT value FROM scan_state WHERE key = 'region_cursor'").get() as
    | { value: number }
    | undefined;
  const start = row?.value ?? 0;
  const indexes = Array.from({ length: Math.min(count, total) }, (_, i) => (start + i) % total);
  db.prepare(
    `INSERT INTO scan_state (key, value) VALUES ('region_cursor', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run((start + count) % total);
  return indexes;
}

export function startScanRun(trigger: string): number {
  const info = db
    .prepare('INSERT INTO scan_runs (started_at, trigger, status) VALUES (?, ?, ?)')
    .run(new Date().toISOString(), trigger, 'running');
  return Number(info.lastInsertRowid);
}

export function updateScanProgress(id: number, regionsDone: number, found: number, created: number): void {
  db.prepare(
    'UPDATE scan_runs SET regions_done = ?, found = ?, created = ? WHERE id = ?'
  ).run(regionsDone, found, created, id);
}

export function finishScanRun(
  id: number,
  result: {
    status: string;
    regionsDone: number;
    found: number;
    created: number;
    duplicates: number;
    checked: number;
    errors: number;
    detail: string;
  }
): void {
  db.prepare(
    `UPDATE scan_runs
       SET finished_at = ?, status = ?, regions_done = ?, found = ?, created = ?,
           duplicates = ?, checked = ?, errors = ?, detail = ?
     WHERE id = ?`
  ).run(
    new Date().toISOString(),
    result.status,
    result.regionsDone,
    result.found,
    result.created,
    result.duplicates,
    result.checked,
    result.errors,
    result.detail,
    id
  );
}

export function getLastScanRun() {
  return (
    (db.prepare('SELECT * FROM scan_runs ORDER BY id DESC LIMIT 1').get() as Record<string, unknown> | undefined) ||
    null
  );
}

export function lastScanStartedAt(): string | null {
  const row = db
    .prepare("SELECT started_at FROM scan_runs WHERE status = 'running' ORDER BY id DESC LIMIT 1")
    .get() as { started_at: string } | undefined;
  if (row) return row.started_at;
  const last = getLastScanRun();
  return last ? String(last.started_at) : null;
}

export function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    osmId: row.osm_id,
    osmType: row.osm_type,
    name: row.name,
    category: row.category,
    city: row.city,
    country: row.country,
    countryCode: row.country_code,
    lat: row.lat,
    lon: row.lon,
    address: row.address,
    websiteUrl: row.website_url,
    websiteHost: row.website_host,
    websiteStatus: row.website_status,
    websiteNote: row.website_note,
    phone: row.phone,
    email: row.email,
    instagram: row.instagram,
    facebook: row.facebook,
    sourceUrl: row.source_url,
    summary: row.summary,
    opportunity: row.opportunity,
    prompt: row.prompt,
    message: row.message,
    score: row.score,
    prospectStatus: row.prospect_status,
    discoveredAt: row.discovered_at,
    updatedAt: row.updated_at,
    verifiedAt: row.verified_at,
  };
}
