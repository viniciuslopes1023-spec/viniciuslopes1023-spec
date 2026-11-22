import type { Contacts } from './contacts';

const PRIORITY_NICHES = new Set([
  'painter', 'plumber', 'roofer', 'carpenter', 'electrician', 'cleaner', 'cleaning',
  'gardener', 'landscaper', 'garden_centre', 'mason', 'stone_mason', 'tiler',
  'pest_control', 'mover', 'moving', 'handyman', 'car_repair', 'car_wash',
  'fencer', 'concreter', 'locksmith', 'welder', 'floor_layer', 'doityourself', 'paint',
]);

export interface ScoreInput {
  websiteStatus: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  tags: Record<string, string>;
  category: string;
  city: string;
  address: string;
}

export function scoreListing(input: ScoreInput): number {
  let score = 0;

  if (input.websiteStatus === 'NO_WEBSITE_FOUND') score += 35;
  else if (input.websiteStatus === 'WEBSITE_BROKEN') score += 12;
  else if (input.websiteStatus === 'UNVERIFIED') score += 5;

  if (input.phone) score += 20;
  if (input.email) score += 10;
  if (input.instagram || input.facebook) score += 8;

  const active = Boolean(input.tags.opening_hours || input.tags.check_date || input.tags.start_date);
  if (active) score += 7;

  const detailCount = [input.category, input.city, input.address].filter(Boolean).length;
  if (detailCount >= 3) score += 10;
  else if (detailCount === 2) score += 5;

  const niche = [input.tags.craft, input.tags.shop, input.tags.amenity]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  if (niche.some((value) => PRIORITY_NICHES.has(value))) score += 10;

  return Math.max(0, Math.min(100, score));
}

export function hasContact(contacts: Contacts): boolean {
  return Boolean(contacts.phone || contacts.email || contacts.instagram || contacts.facebook);
}
