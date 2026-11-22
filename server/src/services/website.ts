import net from 'node:net';
import { config } from '../config';
import type { WebsiteStatus } from '../types';

const NON_OWN_SITE_HOSTS = [
  'facebook.com', 'fb.com', 'fb.me', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'youtu.be', 'yelp.com', 'yelp.co.uk', 'tripadvisor.com',
  'tripadvisor.co.uk', 'google.com', 'google.co.uk', 'g.page', 'goo.gl', 'maps.app.goo.gl',
  'bing.com', 'apple.com', 'waze.com', 'foursquare.com', 'yellowpages.com', 'yellowpages.co.uk',
  'yp.com', 'whitepages.com', 'pagesjaunes.fr', 'amazon.com', 'ebay.com', 'etsy.com',
  'booking.com', 'airbnb.com', 'bbb.org', 'angi.com', 'homeadvisor.com', 'porch.com',
  'houzz.com', 'justdial.com', 'indiamart.com', 'alibaba.com', 'merchantcircle.com',
  'mapquest.com', 'tupalo.com', 'cylex', 'opencorporates.com', 'openstreetmap.org',
  'osm.org', 'whatsapp.com', 'wa.me', 'telegram.me', 't.me', 'pinterest.com', 'reddit.com',
];

export function normalizeWebsite(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!host.includes('.') || net.isIP(host) || host === 'localhost') return null;
    return `${url.protocol}//${url.host}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return null;
  }
}

export function websiteHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isNonOwnSiteHost(host: string | null): boolean {
  if (!host) return false;
  return NON_OWN_SITE_HOSTS.some((blocked) => host.includes(blocked));
}

export interface WebsiteClassification {
  status: WebsiteStatus;
  url: string | null;
  host: string | null;
  note: string;
  candidateUrl: string | null;
}

export function classifyFromListing(tags: Record<string, string>): WebsiteClassification {
  const raw = tags.website || tags['contact:website'] || tags.url || null;
  const url = normalizeWebsite(raw);
  const host = websiteHost(url);

  if (url && host && isNonOwnSiteHost(host)) {
    return {
      status: 'NO_WEBSITE_FOUND',
      url: null,
      host: null,
      candidateUrl: null,
      note: `Apenas ${host} aparece nos dados públicos (página social/diretório, não é website próprio).`,
    };
  }

  if (url && host) {
    return {
      status: 'UNVERIFIED',
      url,
      host,
      candidateUrl: url,
      note: 'Domínio próprio encontrado nos dados públicos; verificação ao vivo pendente.',
    };
  }

  const hasSignal = Boolean(
    tags.phone || tags['contact:phone'] || tags['contact:mobile'] ||
      tags.email || tags['contact:email'] ||
      tags.instagram || tags['contact:instagram'] || tags.facebook || tags['contact:facebook'] ||
      tags['addr:street'] || tags['addr:housenumber'] || tags['addr:city']
  );
  return {
    status: 'NO_WEBSITE_FOUND',
    url: null,
    host: null,
    candidateUrl: null,
    note: hasSignal
      ? 'Nenhum website próprio encontrado nos dados públicos. Ausência nas fontes não é prova absoluta.'
      : 'Sem link de website e com poucos dados públicos. Lead de baixa confiança — ausência nas fontes não é prova.',
  };
}

type Attempt =
  | { kind: 'ok'; status: number }
  | { kind: 'http'; status: number }
  | { kind: 'dns'; code: string }
  | { kind: 'timeout' }
  | { kind: 'error'; detail: string };

async function attempt(url: string, method: 'HEAD' | 'GET'): Promise<Attempt> {
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(config.websiteTimeoutMs),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GRINGA/1.0; website availability check)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
      },
    });
    if (response.body) await response.body.cancel().catch(() => undefined);
    return response.status < 400 ? { kind: 'ok', status: response.status } : { kind: 'http', status: response.status };
  } catch (error) {
    const err = error as Error & { cause?: { code?: string } };
    const code = err?.cause?.code || err?.name || '';
    if (code === 'TimeoutError' || code === 'ABORT_ERR') return { kind: 'timeout' };
    if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'ERR_TLS_CERT_ALTNAME_INVALID'].includes(code)) {
      return { kind: 'dns', code };
    }
    return { kind: 'error', detail: err.message };
  }
}

function classifyAttempt(result: Attempt): Pick<WebsiteClassification, 'status' | 'note'> {
  if (result.kind === 'ok') {
    return { status: 'WEBSITE_EXISTS', note: `Domínio próprio respondeu HTTP ${result.status}; excluído da lista principal.` };
  }
  if (result.kind === 'http') {
    if ([403, 406, 429].includes(result.status)) {
      return {
        status: 'WEBSITE_EXISTS',
        note: `Domínio próprio respondeu HTTP ${result.status} (verificação automatizada bloqueada); o site existe, mas não foi possível carregá-lo por completo.`,
      };
    }
    return { status: 'WEBSITE_BROKEN', note: `Domínio próprio retornou HTTP ${result.status}; o site parece indisponível.` };
  }
  if (result.kind === 'dns') {
    return { status: 'WEBSITE_BROKEN', note: `Não foi possível alcançar o domínio (${result.code}); o site parece fora do ar.` };
  }
  if (result.kind === 'timeout') {
    return { status: 'UNVERIFIED', note: 'A verificação ao vivo expirou; inconclusivo.' };
  }
  return { status: 'UNVERIFIED', note: `Verificação ao vivo inconclusiva (${result.detail}).` };
}

export async function probeWebsite(url: string): Promise<Pick<WebsiteClassification, 'status' | 'note'>> {
  const head = await attempt(url, 'HEAD');
  if (head.kind === 'ok' || head.kind === 'dns' || head.kind === 'timeout') return classifyAttempt(head);
  if (head.kind === 'http' && head.status >= 500) return classifyAttempt(head);
  const get = await attempt(url, 'GET');
  return classifyAttempt(get);
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}
