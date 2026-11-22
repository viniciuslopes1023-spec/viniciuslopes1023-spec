import cron from 'node-cron';
import { config } from '../config';
import {
  countByWebsiteStatus,
  finishScanRun,
  getNextRegionIndexes,
  insertLead,
  lastScanStartedAt,
  leadExists,
  similarLeadExists,
  startScanRun,
  updateScanProgress,
} from '../db';
import type { OsmElement, OsmListing, Region, ScanTrigger, WebsiteStatus } from '../types';
import {
  addressOf, buildOpportunity, buildSummary, categoryForMessage, categoryOf, extractContacts, servicesOf,
} from './contacts';
import { buildFirstContactMessage, buildWebsitePrompt } from './generator';
import { fetchRegion, REGIONS } from './overpass';
import { hasContact, scoreListing } from './score';
import { classifyFromListing, mapWithConcurrency, probeWebsite, websiteHost } from './website';

let running = false;

function richness(element: Draft): number {
  const tags = element.tags;
  let value = 0;
  if (tags.phone || tags['contact:phone'] || tags['contact:mobile']) value += 3;
  if (tags.email || tags['contact:email']) value += 2;
  if (tags.instagram || tags['contact:instagram'] || tags.facebook || tags['contact:facebook']) value += 1;
  if (tags['addr:street'] || tags['addr:housenumber']) value += 1;
  if (tags.opening_hours) value += 1;
  if (tags.website || tags['contact:website']) value += 1;
  return value;
}

interface Draft {
  element: OsmElement;
  region: Region;
  name: string;
  category: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number | null;
  lon: number | null;
  address: string;
  tags: Record<string, string>;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
}

function toDraft(element: OsmElement, region: Region): Draft | null {
  const name = element.tags.name?.trim();
  if (!name) return null;
  const tags = element.tags;
  const contacts = extractContacts(tags);
  return {
    element,
    region,
    name,
    category: categoryOf(tags),
    city: tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || region.city,
    country: region.country,
    countryCode: region.countryCode,
    lat: element.lat ?? null,
    lon: element.lon ?? null,
    address: addressOf(tags, region),
    tags,
    phone: contacts.phone,
    email: contacts.email,
    instagram: contacts.instagram,
    facebook: contacts.facebook,
  };
}

function keyFor(draft: Draft): string {
  return `${draft.name.toLowerCase()}|${draft.city.toLowerCase()}|${draft.country.toLowerCase()}`;
}

function buildListing(draft: Draft, status: WebsiteStatus, note: string, websiteUrl: string | null): OsmListing {
  const now = new Date().toISOString();
  const contacts = {
    phone: draft.phone,
    email: draft.email,
    instagram: draft.instagram,
    facebook: draft.facebook,
  };
  const summary = buildSummary(
    draft.name,
    draft.category,
    draft.city,
    draft.country,
    draft.address,
    draft.tags,
    contacts
  );
  const opportunity = buildOpportunity(status, contacts, note);
  const prompt = buildWebsitePrompt({
    name: draft.name,
    category: draft.category,
    city: draft.city,
    country: draft.country,
    address: draft.address,
    summary,
    services: servicesOf(draft.tags),
    websiteStatus: status,
    websiteNote: note,
    contacts,
  });
  const message = buildFirstContactMessage({
    name: draft.name,
    category: categoryForMessage(draft.tags),
    city: draft.city,
    websiteStatus: status,
  });
  const score = scoreListing({
    websiteStatus: status,
    phone: draft.phone,
    email: draft.email,
    instagram: draft.instagram,
    facebook: draft.facebook,
    tags: draft.tags,
    category: draft.category,
    city: draft.city,
    address: draft.address,
  });

  return {
    osmId: draft.element.id,
    osmType: draft.element.type,
    name: draft.name,
    category: draft.category,
    city: draft.city,
    country: draft.country,
    countryCode: draft.countryCode,
    lat: draft.lat,
    lon: draft.lon,
    address: draft.address,
    websiteUrl,
    websiteHost: websiteHost(websiteUrl),
    websiteStatus: status,
    websiteNote: note,
    phone: draft.phone,
    email: draft.email,
    instagram: draft.instagram,
    facebook: draft.facebook,
    sourceUrl: `https://www.openstreetmap.org/${draft.element.type}/${draft.element.id}`,
    tagsJson: JSON.stringify(draft.tags),
    summary,
    opportunity,
    prompt,
    message,
    score,
    prospectStatus: 'new',
    discoveredAt: now,
    updatedAt: now,
    verifiedAt: now,
  };
}

export async function runScan(trigger: ScanTrigger): Promise<{ started: boolean; reason?: string }> {
  if (running) return { started: false, reason: 'A scan is already running' };

  const lastStarted = lastScanStartedAt();
  if (trigger === 'manual' && lastStarted) {
    const minutes = (Date.now() - new Date(lastStarted).getTime()) / 60000;
    if (minutes < config.scanMinIntervalMinutes) {
      return {
        started: false,
        reason: `Please wait ${Math.ceil(config.scanMinIntervalMinutes - minutes)} min before the next manual scan`,
      };
    }
  }

  running = true;
  const runId = startScanRun(trigger);
  const stats = { found: 0, created: 0, duplicates: 0, checked: 0, errors: 0, regionsDone: 0 };
  const notes: string[] = [];

  void (async () => {
    try {
      const regions = getNextRegionIndexes(REGIONS.length, config.regionsPerRun).map((index) => REGIONS[index]);
      const seen = new Set<string>();

      for (const region of regions) {
        let result: { elements: OsmElement[]; error?: string };
        try {
          result = await fetchRegion(region);
        } catch (error) {
          result = { elements: [], error: error instanceof Error ? error.message : String(error) };
        }
        if (result.error) {
          stats.errors += 1;
          notes.push(`${region.label}: ${result.error}`);
        }
        stats.regionsDone += 1;

        const drafts = result.elements
          .map((element) => toDraft(element, region))
          .filter((draft): draft is Draft => Boolean(draft))
          .filter((draft) => !leadExists(draft.element.type, draft.element.id))
          .filter((draft) => {
            const key = keyFor(draft);
            if (seen.has(key) || similarLeadExists(draft.name, draft.city, draft.country)) {
              stats.duplicates += 1;
              return false;
            }
            seen.add(key);
            return true;
          })
          .sort((a, b) => richness(b) - richness(a))
          .slice(0, config.maxResultsPerRegion);

        stats.found += drafts.length;
        updateScanProgress(runId, stats.regionsDone, stats.found, stats.created);

        const classifications = await mapWithConcurrency(drafts, config.websiteProbeConcurrency, async (draft) => {
          const classification = classifyFromListing(draft.tags);
          if (!classification.candidateUrl) return classification;
          stats.checked += 1;
          const probe = await probeWebsite(classification.candidateUrl);
          return { ...classification, status: probe.status, note: probe.note };
        });

        for (let i = 0; i < drafts.length; i += 1) {
          const draft = drafts[i];
          const classification = classifications[i];
          if (insertLead(buildListing(draft, classification.status, classification.note, classification.url))) {
            stats.created += 1;
          } else {
            stats.duplicates += 1;
          }
        }
      }

      finishScanRun(runId, {
        status: notes.length ? 'completed_with_errors' : 'completed',
        regionsDone: stats.regionsDone,
        found: stats.found,
        created: stats.created,
        duplicates: stats.duplicates,
        checked: stats.checked,
        errors: stats.errors,
        detail: notes.join(' | ').slice(0, 2000),
      });
    } catch (error) {
      stats.errors += 1;
      finishScanRun(runId, {
        status: 'failed',
        regionsDone: stats.regionsDone,
        found: stats.found,
        created: stats.created,
        duplicates: stats.duplicates,
        checked: stats.checked,
        errors: stats.errors,
        detail: (error instanceof Error ? error.message : String(error)).slice(0, 2000),
      });
    } finally {
      running = false;
    }
  })();

  return { started: true };
}

function nextRunAt(): string {
  const now = new Date();
  const interval = config.scanIntervalHours;
  const hoursUntil = interval - (now.getUTCHours() % interval);
  const next = new Date(now);
  next.setUTCHours(now.getUTCHours() + hoursUntil, 0, 0, 0);
  return next.toISOString();
}

export function getScanStatus() {
  return {
    running,
    lastRun: lastScanStartedAt(),
    nextRunAt: nextRunAt(),
    scheduleHours: config.scanIntervalHours,
    regionsTotal: REGIONS.length,
    regionsPerRun: config.regionsPerRun,
    manualCooldownMinutes: config.scanMinIntervalMinutes,
  };
}

export function startScanner(): void {
  const expression = `0 */${Math.min(23, config.scanIntervalHours)} * * *`;
  cron.schedule(expression, () => {
    void runScan('scheduled');
  });
  if (countByWebsiteStatus().NO_WEBSITE_FOUND === 0) {
    setTimeout(() => void runScan('startup'), 15000).unref();
  }
}
