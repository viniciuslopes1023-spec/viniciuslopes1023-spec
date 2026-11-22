export type WebsiteStatus = 'NO_WEBSITE_FOUND' | 'WEBSITE_EXISTS' | 'WEBSITE_BROKEN' | 'UNVERIFIED';
export type ProspectStatus = 'new' | 'worked' | 'ignored';
export type ScanTrigger = 'manual' | 'scheduled' | 'startup';

export interface OsmElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  tags: Record<string, string>;
}

export interface OsmListing {
  osmId: number;
  osmType: string;
  name: string;
  category: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number | null;
  lon: number | null;
  address: string;
  websiteUrl: string | null;
  websiteHost: string | null;
  websiteStatus: WebsiteStatus;
  websiteNote: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  sourceUrl: string;
  tagsJson: string;
  summary: string;
  opportunity: string;
  prompt: string;
  message: string;
  score: number;
  prospectStatus: ProspectStatus;
  discoveredAt: string;
  updatedAt: string;
  verifiedAt: string;
}

export interface Region {
  id: string;
  label: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  radius: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {};
