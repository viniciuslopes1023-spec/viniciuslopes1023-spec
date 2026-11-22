export type WebsiteStatus = 'NO_WEBSITE_FOUND' | 'WEBSITE_EXISTS' | 'WEBSITE_BROKEN' | 'UNVERIFIED';
export type ProspectStatus = 'new' | 'worked' | 'ignored';
export type LeadView = 'main' | 'phone' | 'secondary' | 'all' | 'worked' | 'ignored';

export interface Lead {
  id: number;
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

export interface Stats {
  totalAll: number;
  opportunities: number;
  recent24h: number;
  withPhone: number;
  withEmail: number;
  withSocial: number;
  withContact: number;
  withWebsite: number;
  broken: number;
  unverified: number;
  worked: number;
  ignored: number;
  lastDiscovery: string | null;
}

export interface WebsiteCounts {
  NO_WEBSITE_FOUND: number;
  WEBSITE_EXISTS: number;
  WEBSITE_BROKEN: number;
  UNVERIFIED: number;
}

export interface ScanStatus {
  running: boolean;
  lastRun: string | null;
  nextRunAt: string | null;
  scheduleHours: number;
  regionsTotal: number;
  regionsPerRun: number;
  manualCooldownMinutes: number;
  lastRunRow: Record<string, unknown> | null;
}

export interface LeadsResponse {
  leads: Lead[];
  stats: Stats;
  counts: WebsiteCounts;
  lastScan: Record<string, unknown> | null;
}
