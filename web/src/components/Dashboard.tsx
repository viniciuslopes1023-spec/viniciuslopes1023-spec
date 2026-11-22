import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { LeadView, LeadsResponse, ScanStatus } from '../types';
import LeadCard from './LeadCard';

interface DashboardProps {
  email: string | null;
  onLogout: () => void;
}

const VIEWS: Array<{ id: LeadView; label: string }> = [
  { id: 'main', label: 'OPORTUNIDADES' },
  { id: 'phone', label: 'COM TELEFONE' },
  { id: 'secondary', label: 'SECUNDÁRIOS' },
  { id: 'all', label: 'TODOS' },
  { id: 'worked', label: 'TRABALHADOS' },
  { id: 'ignored', label: 'IGNORADOS' },
];

function span(value: string | null): string {
  if (!value) return 'NUNCA';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return '—';
  const minutes = Math.floor(Math.abs(diff) / 60000);
  if (minutes < 1) return 'AGORA';
  const amount = minutes < 60 ? `${minutes} MIN` : minutes < 1440 ? `${Math.floor(minutes / 60)} H` : `${Math.floor(minutes / 1440)} D`;
  return diff >= 0 ? `HÁ ${amount}` : `EM ${amount}`;
}

export default function Dashboard({ email, onLogout }: DashboardProps) {
  const [view, setView] = useState<LeadView>('main');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [scan, setScan] = useState<ScanStatus | null>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [leads, status] = await Promise.all([api.leads(view, search), api.scanStatus()]);
      setData(leads);
      setScan(status);
    } catch (err) {
      if (err instanceof Error && err.message.includes('autentic')) {
        onLogout();
        return;
      }
      setToast(err instanceof Error ? err.message.toUpperCase() : 'FALHA AO CARREGAR');
    }
  }, [view, search, onLogout]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), scan?.running ? 4000 : 15000);
    return () => window.clearInterval(timer);
  }, [load, scan?.running]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function startScan() {
    setBusy(true);
    try {
      const result = await api.startScan();
      setToast(result.started ? 'BUSCA INICIADA' : (result.reason || 'BUSCA NÃO INICIADA').toUpperCase());
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message.toUpperCase() : 'FALHA NA BUSCA');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: number, status: 'worked' | 'ignored') {
    try {
      await api.setStatus(id, status);
      setToast(status === 'worked' ? 'MARCADO COMO TRABALHADO' : 'LEAD IGNORADO');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message.toUpperCase() : 'FALHA AO ATUALIZAR');
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(query.trim());
  }

  const stats = data?.stats;
  const countFor = (id: LeadView) => {
    if (!stats) return 0;
    if (id === 'main') return stats.opportunities;
    if (id === 'phone') return stats.withPhone;
    if (id === 'secondary') return stats.broken + stats.unverified;
    if (id === 'all') return stats.totalAll;
    if (id === 'worked') return stats.worked;
    return stats.ignored;
  };

  const run = scan?.lastRunRow as Record<string, number | string> | null | undefined;
  const progress = run && scan?.running ? Math.min(100, (Number(run.regions_done || 0) / Math.max(1, scan.regionsPerRun)) * 100) : 0;

  return (
    <div className="dashboard">
      <div className="grid-bg" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-dash" aria-hidden="true" />

      <header className="dash-header">
        <div className="brand">
          <span className="brand-mark">G</span>
          <span className="brand-name">GRINGA</span>
          <span className="brand-divider" />
          <span className="brand-sub">CONSOLE DE PROSPECÇÃO</span>
        </div>
        <div className="dash-header-right">
          <span className={`scan-pill ${scan?.running ? 'scanning' : ''}`}>
            <i className="dot dot-live" />
            {scan?.running ? 'VARREDURA EM ANDAMENTO' : `AUTO SCAN · A CADA ${scan?.scheduleHours ?? 6}H`}
          </span>
          <button className="btn btn-outline btn-sm" onClick={startScan} disabled={busy || scan?.running}>
            {scan?.running ? 'BUSCANDO…' : 'BUSCAR AGORA'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={async () => { await api.logout(); onLogout(); }}>SAIR</button>
        </div>
        {scan?.running && (
          <div className="scan-progress">
            <div className="scan-progress-bar" style={{ width: `${progress}%` }} />
            <span className="mono">ETAPA {Number(run?.regions_done || 0)}/{scan.regionsPerRun} · {Number(run?.found || 0)} ENCONTRADOS · {Number(run?.created || 0)} SALVOS</span>
          </div>
        )}
      </header>

      <main className="dash-main">
        <section className="stats-row">
          <div className="stat-card accent">
            <span className="stat-label mono">OPORTUNIDADES</span>
            <strong>{stats?.opportunities ?? '—'}</strong>
            <span className="stat-note">SEM WEBSITE IDENTIFICADO</span>
          </div>
          <div className="stat-card phone">
            <span className="stat-label mono">COM TELEFONE <em>REAL</em></span>
            <strong>{stats?.withPhone ?? '—'}</strong>
            <span className="stat-note">DADOS PÚBLICOS VERIFICÁVEIS</span>
          </div>
          <div className="stat-card">
            <span className="stat-label mono">NOVOS LEADS <em>24H</em></span>
            <strong>{stats?.recent24h ?? '—'}</strong>
            <span className="stat-note">DESCOBERTOS RECENTEMENTE</span>
          </div>
          <div className="stat-card">
            <span className="stat-label mono">ÚLTIMA BUSCA</span>
            <strong className="stat-time">{span(scan?.lastRun ?? null)}</strong>
            <span className="stat-note">PRÓXIMA {span(scan?.nextRunAt ?? null)}</span>
          </div>
        </section>

        <section className="toolbar">
          <div className="view-tabs">
            {VIEWS.map((item) => (
              <button key={item.id} className={`view-tab ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
                {item.label} <span>{countFor(item.id)}</span>
              </button>
            ))}
          </div>
          <form className="search-box" onSubmit={submitSearch}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar por nome, cidade ou nicho…"
              aria-label="Filtrar leads"
            />
            <button type="submit" className="mono">FILTRAR</button>
          </form>
        </section>

        {data && data.leads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-mark">◎</div>
            <h2>{view === 'main' ? 'Nenhuma oportunidade ainda.' : 'Nada por aqui ainda.'}</h2>
            <p>
              {view === 'main'
                ? 'A primeira varredura automática começa pouco após a inicialização. Você também pode disparar uma agora — usamos dados públicos do OpenStreetMap e respeitamos os limites da fonte.'
                : 'Experimente outra visualização ou rode uma nova busca para coletar mais listagens públicas.'}
            </p>
            <button className="btn btn-primary" onClick={startScan} disabled={busy || scan?.running}>BUSCAR AGORA →</button>
          </div>
        ) : (
          <section className="lead-grid">
            {data?.leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onCopied={setToast} onStatus={(id, status) => void changeStatus(id, status)} />
            ))}
          </section>
        )}

        <footer className="dash-footer mono">
          <span>SESSÃO: {email || '—'}</span>
          <span>DADOS © OPENSTREETMAP CONTRIBUTORS (ODbL) · AUSÊNCIA EM FONTES PÚBLICAS NÃO É PROVA · MENSAGENS NUNCA SÃO ENVIADAS AUTOMATICAMENTE</span>
        </footer>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
