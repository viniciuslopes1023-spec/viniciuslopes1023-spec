import { config } from '../config';
import type { OsmElement, Region } from '../types';

export const REGIONS: Region[] = [
  { id: 'us-austin', label: 'Austin, TX', city: 'Austin', country: 'United States', countryCode: 'US', lat: 30.2672, lon: -97.7431, radius: 6000 },
  { id: 'us-denver', label: 'Denver, CO', city: 'Denver', country: 'United States', countryCode: 'US', lat: 39.7392, lon: -104.9903, radius: 6000 },
  { id: 'us-portland', label: 'Portland, OR', city: 'Portland', country: 'United States', countryCode: 'US', lat: 45.5152, lon: -122.6784, radius: 6000 },
  { id: 'us-tampa', label: 'Tampa, FL', city: 'Tampa', country: 'United States', countryCode: 'US', lat: 27.9506, lon: -82.4572, radius: 6000 },
  { id: 'uk-manchester', label: 'Manchester, UK', city: 'Manchester', country: 'United Kingdom', countryCode: 'GB', lat: 53.4808, lon: -2.2426, radius: 6000 },
  { id: 'uk-leeds', label: 'Leeds, UK', city: 'Leeds', country: 'United Kingdom', countryCode: 'GB', lat: 53.8008, lon: -1.5491, radius: 6000 },
  { id: 'ca-toronto', label: 'Toronto, Canada', city: 'Toronto', country: 'Canada', countryCode: 'CA', lat: 43.6532, lon: -79.3832, radius: 6000 },
  { id: 'ca-calgary', label: 'Calgary, Canada', city: 'Calgary', country: 'Canada', countryCode: 'CA', lat: 51.0447, lon: -114.0719, radius: 6000 },
  { id: 'au-melbourne', label: 'Melbourne, Australia', city: 'Melbourne', country: 'Australia', countryCode: 'AU', lat: -37.8136, lon: 144.9631, radius: 6000 },
  { id: 'au-brisbane', label: 'Brisbane, Australia', city: 'Brisbane', country: 'Australia', countryCode: 'AU', lat: -27.4698, lon: 153.0251, radius: 6000 },
  { id: 'ie-dublin', label: 'Dublin, Ireland', city: 'Dublin', country: 'Ireland', countryCode: 'IE', lat: 53.3498, lon: -6.2603, radius: 6000 },
  { id: 'de-berlin', label: 'Berlin, Germany', city: 'Berlin', country: 'Germany', countryCode: 'DE', lat: 52.52, lon: 13.405, radius: 6000 },
  { id: 'nl-amsterdam', label: 'Amsterdam, Netherlands', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', lat: 52.3676, lon: 4.9041, radius: 6000 },
  { id: 'pt-lisbon', label: 'Lisbon, Portugal', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', lat: 38.7223, lon: -9.1393, radius: 6000 },
  { id: 'us-phoenix', label: 'Phoenix, AZ', city: 'Phoenix', country: 'United States', countryCode: 'US', lat: 33.4484, lon: -112.074, radius: 6000 },
  { id: 'us-orlando', label: 'Orlando, FL', city: 'Orlando', country: 'United States', countryCode: 'US', lat: 28.5383, lon: -81.3792, radius: 6000 },
  { id: 'us-charlotte', label: 'Charlotte, NC', city: 'Charlotte', country: 'United States', countryCode: 'US', lat: 35.2271, lon: -80.8431, radius: 6000 },
  { id: 'us-nashville', label: 'Nashville, TN', city: 'Nashville', country: 'United States', countryCode: 'US', lat: 36.1627, lon: -86.7816, radius: 6000 },
  { id: 'us-columbus', label: 'Columbus, OH', city: 'Columbus', country: 'United States', countryCode: 'US', lat: 39.9612, lon: -83.0007, radius: 6000 },
  { id: 'us-indianapolis', label: 'Indianapolis, IN', city: 'Indianapolis', country: 'United States', countryCode: 'US', lat: 39.7684, lon: -86.1581, radius: 6000 },
  { id: 'uk-glasgow', label: 'Glasgow, UK', city: 'Glasgow', country: 'United Kingdom', countryCode: 'GB', lat: 55.8642, lon: -4.2518, radius: 6000 },
  { id: 'uk-birmingham', label: 'Birmingham, UK', city: 'Birmingham', country: 'United Kingdom', countryCode: 'GB', lat: 52.4862, lon: -1.8904, radius: 6000 },
  { id: 'ca-vancouver', label: 'Vancouver, Canada', city: 'Vancouver', country: 'Canada', countryCode: 'CA', lat: 49.2827, lon: -123.1207, radius: 6000 },
  { id: 'ca-ottawa', label: 'Ottawa, Canada', city: 'Ottawa', country: 'Canada', countryCode: 'CA', lat: 45.4215, lon: -75.6972, radius: 6000 },
  { id: 'au-perth', label: 'Perth, Australia', city: 'Perth', country: 'Australia', countryCode: 'AU', lat: -31.9523, lon: 115.8613, radius: 6000 },
  { id: 'nz-auckland', label: 'Auckland, New Zealand', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', lat: -36.8485, lon: 174.7633, radius: 6000 },
];

const CRAFT_VALUES = [
  'painter', 'plumber', 'roofer', 'carpenter', 'electrician', 'gardener', 'landscaper',
  'mason', 'stone_mason', 'tiler', 'cleaner', 'pest_control', 'mover', 'handyman',
  'fencer', 'concreter', 'locksmith', 'welder', 'mechanic', 'upholsterer', 'floor_layer',
];

const SHOP_VALUES = [
  'cleaning', 'paint', 'hardware', 'doityourself', 'garden_centre', 'car_repair',
  'car_parts', 'security', 'locksmith', 'floor', 'tiles', 'curtains', 'moving', 'trade',
];

const AMENITY_VALUES = ['car_wash', 'pest_control', 'vehicle_inspection'];

function buildQuery(region: Region): string {
  const alt = (values: string[]) => `^(${values.join('|')})$`;
  const around = `around:${region.radius},${region.lat},${region.lon}`;
  const timeout = Math.ceil(config.overpassTimeoutMs / 1000);
  return [
    `[out:json][timeout:${timeout}];`,
    '(',
    `  nwr(${around})["name"]["craft"~"${alt(CRAFT_VALUES)}"];`,
    `  nwr(${around})["name"]["shop"~"${alt(SHOP_VALUES)}"];`,
    `  nwr(${around})["name"]["amenity"~"${alt(AMENITY_VALUES)}"];`,
    `  nwr(${around})["name"]["phone"]["craft"~"${alt(CRAFT_VALUES)}"]["website"!~"."];`,
    `  nwr(${around})["name"]["contact:phone"]["craft"~"${alt(CRAFT_VALUES)}"]["website"!~"."];`,
    `  nwr(${around})["name"]["phone"]["shop"~"${alt(SHOP_VALUES)}"]["website"!~"."];`,
    `  nwr(${around})["name"]["contact:phone"]["shop"~"${alt(SHOP_VALUES)}"]["website"!~"."];`,
    ');',
    'out center tags;',
  ].join('\n');
}

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTurn(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (lastRequestAt && elapsed < config.overpassDelayMs) {
    await sleep(config.overpassDelayMs - elapsed);
  }
  lastRequestAt = Date.now();
}

interface OverpassResponse {
  elements?: Array<{
    type?: string;
    id?: number;
    lat?: number;
    lon?: number;
    center?: { lat?: number; lon?: number };
    tags?: Record<string, string>;
  }>;
}

async function queryEndpoint(endpoint: string, query: string): Promise<OsmElement[]> {
  await waitForTurn();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.overpassTimeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'GRINGA/1.0 (private local prospecting tool; OSM ODbL attribution included)',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ data: query }).toString(),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
    const data = (await response.json()) as OverpassResponse;
    if (!Array.isArray(data.elements)) throw new Error('Overpass response has no elements');
    return data.elements
      .filter((el) => el.type && typeof el.id === 'number' && el.tags && el.tags.name)
      .map((el) => ({
        id: el.id as number,
        type: el.type as OsmElement['type'],
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
        tags: el.tags as Record<string, string>,
      }));
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRegion(region: Region): Promise<{ elements: OsmElement[]; error?: string }> {
  const query = buildQuery(region);
  const errors: string[] = [];
  for (const endpoint of config.overpassEndpoints) {
    try {
      const elements = await queryEndpoint(endpoint, query);
      return { elements };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${new URL(endpoint).hostname}: ${message}`);
    }
  }
  return { elements: [], error: errors.join(' | ') };
}
