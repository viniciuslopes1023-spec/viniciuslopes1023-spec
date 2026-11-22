import type { Region } from '../types';
import { normalizeWebsite } from './website';

export interface Contacts {
  phone: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
}

const CATEGORY_PT: Record<string, string> = {
  painter: 'Pintor', plumber: 'Encanador', roofer: 'Telhadista', carpenter: 'Marceneiro',
  electrician: 'Eletricista', gardener: 'Jardineiro', landscaper: 'Paisagista', mason: 'Pedreiro',
  stone_mason: 'Pedreiro', tiler: 'Azulejista', cleaner: 'Limpeza', cleaning: 'Limpeza',
  pest_control: 'Controle de pragas', mover: 'Mudanças', moving: 'Mudanças', handyman: 'Consertos gerais',
  fencer: 'Cerceamento', concreter: 'Concretagem', locksmith: 'Chaveiro', welder: 'Soldador',
  mechanic: 'Mecânico', upholsterer: 'Estofador', floor_layer: 'Pisos', car_repair: 'Oficina mecânica',
  car_wash: 'Lavagem de carros', car_parts: 'Peças de carro', hardware: 'Ferragens',
  doityourself: 'Faça você mesmo', garden_centre: 'Centro de jardinagem', paint: 'Tintas',
  security: 'Segurança', floor: 'Pisos', tiles: 'Azulejos', curtains: 'Cortinas',
  trade: 'Serviços técnicos', vehicle_inspection: 'Vistoria veicular',
};

function firstDefined(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function cleanPhone(raw: string | null): string | null {
  if (!raw) return null;
  const compact = raw.replace(/[^\d+()\s.-]/g, '').trim();
  const digits = compact.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 18) return null;
  return compact;
}

export function phoneFromText(raw: string | null): string | null {
  if (!raw) return null;
  const candidates = raw.match(/\+?\d[\d\s().-]{6,22}\d/g) || [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 18) continue;
    if (/\d{4}-\d{2}-\d{2}/.test(candidate)) continue;
    return cleanPhone(candidate);
  }
  return null;
}

export function cleanEmail(raw: string | null): string | null {
  if (!raw) return null;
  const candidate = raw.replace(/^mailto:/i, '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(candidate) ? candidate : null;
}

export function cleanInstagram(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!url.hostname.includes('instagram.com')) return null;
      return url.pathname.split('/').filter(Boolean)[0]?.replace(/^@/, '') || null;
    } catch {
      return null;
    }
  }
  return value.replace(/^@/, '').replace(/^#/, '');
}

export function cleanFacebook(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!url.hostname.includes('facebook.com') && !url.hostname.includes('fb.com')) return null;
      const part = url.pathname.split('/').filter(Boolean)[0];
      return part ? decodeURIComponent(part) : 'facebook.com';
    } catch {
      return null;
    }
  }
  return value;
}

function profileFromWebsite(tags: Record<string, string>, network: 'instagram' | 'facebook'): string | null {
  const url = normalizeWebsite(tags.website || tags['contact:website'] || tags.url || null);
  if (!url) return null;
  try {
    return new URL(url).hostname.includes(network) ? url : null;
  } catch {
    return null;
  }
}

export function extractContacts(tags: Record<string, string>): Contacts {
  const directPhone = firstDefined(
    tags.phone, tags['contact:phone'], tags['contact:mobile'], tags['contact:whatsapp']
  );
  return {
    phone: cleanPhone(directPhone) || phoneFromText(firstDefined(tags.description, tags.note, tags.contact)),
    email: cleanEmail(firstDefined(tags.email, tags['contact:email'])),
    instagram: cleanInstagram(firstDefined(tags['contact:instagram'], tags.instagram, profileFromWebsite(tags, 'instagram'))),
    facebook: cleanFacebook(firstDefined(tags['contact:facebook'], tags.facebook, profileFromWebsite(tags, 'facebook'))),
  };
}

function pretty(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()).trim();
}

export function categoryOf(tags: Record<string, string>): string {
  const raw = firstDefined(tags.craft, tags.shop, tags.amenity, tags.office, tags.service);
  if (!raw) return 'Negócio de serviços locais';
  return CATEGORY_PT[raw.toLowerCase()] || pretty(raw);
}

export function categoryForMessage(tags: Record<string, string>): string {
  const raw = firstDefined(tags.craft, tags.shop, tags.amenity, tags.office, tags.service);
  return raw ? pretty(raw).toLowerCase() : 'local service';
}

export function servicesOf(tags: Record<string, string>): string[] {
  const services: string[] = [];
  const keys = ['service', 'product', 'cuisine', 'speciality', 'craft', 'shop', 'amenity'];
  for (const key of keys) {
    const value = tags[key];
    if (!value) continue;
    const label = CATEGORY_PT[value.toLowerCase()] || pretty(value);
    if (!services.includes(label)) services.push(label);
  }
  return services.slice(0, 4);
}

export function addressOf(tags: Record<string, string>, region: Region): string {
  const street = firstDefined(tags['addr:street']);
  const number = firstDefined(tags['addr:housenumber']);
  const postcode = firstDefined(tags['addr:postcode']);
  const city = firstDefined(tags['addr:city'], tags['addr:town'], tags['addr:village']) || region.city;
  const parts = [number && street ? `${number} ${street}` : street || number, postcode, city].filter(Boolean);
  return parts.join(', ');
}

export function buildSummary(
  name: string,
  category: string,
  city: string,
  country: string,
  address: string,
  tags: Record<string, string>,
  contacts: Contacts
): string {
  const place = `${city}, ${country}`;
  const addressPart = address && address !== city ? ` Endereço listado: ${address}.` : '';
  const services = servicesOf(tags).filter((service) => service.toLowerCase() !== category.toLowerCase());
  const servicePart = services.length ? ` A listagem pública menciona: ${services.join(', ')}.` : '';
  const activePart = tags.opening_hours ? ' Horário de funcionamento publicado na listagem.' : '';
  const contactParts: string[] = [];
  if (contacts.phone) contactParts.push('telefone');
  if (contacts.email) contactParts.push('e-mail');
  if (contacts.instagram || contacts.facebook) contactParts.push('perfil social');
  const contactPart = contactParts.length ? ` Dados públicos indicam ${contactParts.join(', ')}.` : '';
  return `${name} está listado como ${category.toLowerCase()} em ${place}.${addressPart}${servicePart}${activePart}${contactPart}`;
}

export function buildOpportunity(websiteStatus: string, contacts: Contacts, websiteNote: string): string {
  const reach = contacts.phone
    ? 'Há um telefone disponível para abordagem.'
    : contacts.email
      ? 'Há um e-mail disponível para abordagem.'
      : contacts.instagram || contacts.facebook
        ? 'Há um perfil social disponível para abordagem.'
        : 'Nenhum contato direto encontrado — vale pesquisar manualmente antes da abordagem.';

  if (websiteStatus === 'NO_WEBSITE_FOUND') {
    return `Nenhum website próprio foi identificado nas fontes públicas consultadas. ${reach} Um site simples e rápido pode ajudar clientes próximos a encontrar e contatar este negócio. ${websiteNote}`;
  }
  if (websiteStatus === 'WEBSITE_BROKEN') {
    return `Um domínio próprio aparece nos dados públicos, mas não respondeu. ${reach} Um site substituto funcional pode ser relevante. ${websiteNote}`;
  }
  return `A presença online é inconclusiva nos dados públicos. Verifique manualmente antes da abordagem. ${reach} ${websiteNote}`;
}
