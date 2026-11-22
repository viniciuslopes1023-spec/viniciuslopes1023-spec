import { useState } from 'react';
import type { Lead } from '../types';

interface LeadCardProps {
  lead: Lead;
  onCopied: (text: string) => void;
  onStatus: (id: number, status: 'worked' | 'ignored') => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  }
}

const STATUS_LABEL: Record<string, string> = {
  NO_WEBSITE_FOUND: 'SEM WEBSITE',
  WEBSITE_EXISTS: 'SITE EXISTE',
  WEBSITE_BROKEN: 'SITE QUEBRADO',
  UNVERIFIED: 'NÃO VERIFICADO',
};

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

function scoreClass(score: number): string {
  if (score >= 75) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

export default function LeadCard({ lead, onCopied, onStatus }: LeadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${lead.name}" ${lead.city} ${lead.country} website contato telefone`)}`;
  const whatsappUrl = lead.phone
    ? `https://wa.me/${phoneDigits(lead.phone)}?text=${encodeURIComponent(lead.message)}`
    : null;
  const emailUrl = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent(`Site para ${lead.name}`)}&body=${encodeURIComponent(lead.message)}`
    : null;

  async function handleCopy(text: string, label: string) {
    const ok = await copyText(text);
    onCopied(ok ? `${label} COPIADO` : 'FALHA AO COPIAR');
  }

  return (
    <article className={`lead-card ${lead.score >= 80 ? 'priority' : ''}`}>
      <div className="lead-top">
        <div className="lead-heading">
          <h3 title={lead.name}>{lead.name}</h3>
          <div className="lead-meta">
            <span>{lead.category}</span>
            <span className="sep">·</span>
            <span>{lead.city}, {lead.country}</span>
          </div>
        </div>
        <div className={`score score-${scoreClass(lead.score)}`} title="Pontuação de prioridade 0–100">
          <strong>{lead.score}</strong>
          <span>PONTOS</span>
        </div>
      </div>

      <div className="lead-badges">
        <span className={`status-badge status-${lead.websiteStatus.toLowerCase().replaceAll('_', '-')}`}>
          <i /> {STATUS_LABEL[lead.websiteStatus] || lead.websiteStatus}
        </span>
        {lead.phone && <span className="phone-badge">☎ TELEFONE REAL</span>}
        {(lead.email || lead.instagram || lead.facebook) && <span className="contact-badge">CONTATO DISPONÍVEL</span>}
      </div>

      <div className="lead-contacts">
        {lead.phone && <a href={`tel:${phoneDigits(lead.phone)}`} title={lead.phone}>☎ {lead.phone}</a>}
        {lead.email && <a href={`mailto:${lead.email}`} title={lead.email}>✉ {lead.email}</a>}
        {lead.instagram && <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noreferrer">◎ @{lead.instagram}</a>}
        {lead.facebook && <a href={`https://facebook.com/${lead.facebook}`} target="_blank" rel="noreferrer">f {lead.facebook}</a>}
        {!lead.phone && !lead.email && !lead.instagram && !lead.facebook && <span className="no-contact">SEM CONTATO DIRETO — USE BUSCAR CONTATO</span>}
      </div>

      <a className="source-link mono" href={lead.sourceUrl} target="_blank" rel="noreferrer">↗ FONTE OPENSTREETMAP · VERIFICAR DADOS</a>

      <p className="lead-summary">{lead.summary}</p>
      <div className="lead-opportunity">
        <span className="mono">OPORTUNIDADE</span>
        <p>{lead.opportunity}</p>
      </div>

      <div className="lead-actions">
        <button className="action action-primary" onClick={() => handleCopy(lead.prompt, 'PROMPT')}>COPIAR PROMPT</button>
        <button className="action" onClick={() => handleCopy(lead.message, 'MENSAGEM')}>COPIAR MENSAGEM</button>
        {whatsappUrl && <a className="action action-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">WHATSAPP ↗</a>}
        {emailUrl && <a className="action" href={emailUrl}>E-MAIL ↗</a>}
        {lead.phone && <a className="action" href={`tel:${phoneDigits(lead.phone)}`}>LIGAR</a>}
      </div>

      <div className="lead-actions secondary">
        <a className="action" href={searchUrl} target="_blank" rel="noreferrer">BUSCAR CONTATO ↗</a>
        <button className="action" onClick={() => onStatus(lead.id, 'worked')}>MARCADO</button>
        <button className="action action-danger" onClick={() => onStatus(lead.id, 'ignored')}>IGNORAR</button>
        <button className="action action-link" onClick={() => setExpanded((value) => !value)}>{expanded ? 'OCULTAR ▴' : 'VER TEXTOS ▾'}</button>
      </div>

      {expanded && (
        <div className="lead-details">
          <div className="detail-block">
            <div className="detail-head">
              <span className="mono">PROMPT DE CRIAÇÃO (PT-BR)</span>
              <button className="mini-copy" onClick={() => handleCopy(lead.prompt, 'PROMPT')}>COPIAR</button>
            </div>
            <pre>{lead.prompt}</pre>
          </div>
          <div className="detail-block">
            <div className="detail-head">
              <span className="mono">PRIMEIRA MENSAGEM (INGLÊS)</span>
              <button className="mini-copy" onClick={() => handleCopy(lead.message, 'MENSAGEM')}>COPIAR</button>
            </div>
            <pre>{lead.message}</pre>
          </div>
          <div className="detail-source mono">
            FONTE: <a href={lead.sourceUrl} target="_blank" rel="noreferrer">{lead.sourceUrl}</a>
            {lead.websiteNote ? ` · VERIFICAÇÃO: ${lead.websiteNote}` : ''}
          </div>
        </div>
      )}
    </article>
  );
}
