interface LandingProps {
  onLogin: () => void;
}

const FEATURES = [
  {
    number: '01',
    title: 'BUSCA AUTOMÁTICA',
    text: 'Varreduras periódicas de listagens públicas do OpenStreetMap em mercados estrangeiros. Sem pesquisa manual.',
    icon: '⌖',
  },
  {
    number: '02',
    title: 'FILTRO DE WEBSITE',
    text: 'Instagram, Facebook e diretórios nunca contam como site. Domínios próprios são verificados em tempo real.',
    icon: '⊘',
  },
  {
    number: '03',
    title: 'CONTATO E SCORE',
    text: 'Telefone, e-mail e redes sociais com sua fonte, ordenados por uma pontuação clara de prioridade.',
    icon: '⌁',
  },
  {
    number: '04',
    title: 'PROMPT E MENSAGEM',
    text: 'Briefing de site e primeira mensagem prontos para copiar, revisar e usar na prospecção.',
    icon: '✦',
  },
];

const PIPELINE = ['BUSCAR', 'VERIFICAR', 'CONTATAR', 'PONTUAR', 'PROMPT', 'MENSAGEM'];

export default function Landing({ onLogin }: LandingProps) {
  return (
    <div className="landing">
      <div className="grid-bg" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <header className="landing-nav">
        <div className="brand">
          <span className="brand-mark">G</span>
          <span className="brand-name">GRINGA</span>
          <span className="brand-divider" />
          <span className="brand-sub">SISTEMA PRIVADO DE PROSPECÇÃO</span>
        </div>
        <div className="nav-right">
          <span className="nav-status"><i className="dot dot-live" /> SISTEMA ATIVO</span>
          <button className="btn btn-outline" onClick={onLogin}>ENTRAR <span aria-hidden="true">→</span></button>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> SERVIÇOS LOCAIS · MERCADOS ESTRANGEIROS</div>
            <h1>
              Encontre os negócios<br />
              <span className="accent-text">que a web esqueceu.</span>
            </h1>
            <p className="hero-lead">
              A GRINGA varre dados públicos de empresas no exterior, remove as que já têm website e prepara
              o contato, o briefing de criação e a mensagem de primeira abordagem — tudo para você revisar.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={onLogin}>ABRIR CONSOLE <span aria-hidden="true">↗</span></button>
              <a className="btn btn-ghost btn-lg" href="#como-funciona">COMO FUNCIONA</a>
            </div>
            <div className="hero-meta">
              <span><i className="dot dot-live" /> UMA TELA. SEM DISTRACÕES.</span>
              <span>DADOS © OPENSTREETMAP CONTRIBUTORS</span>
            </div>
          </div>

          <div className="radar-wrap" aria-hidden="true">
            <div className="radar">
              <div className="radar-grid" />
              <div className="radar-ring ring-1" />
              <div className="radar-ring ring-2" />
              <div className="radar-ring ring-3" />
              <div className="radar-ring ring-4" />
              <div className="radar-axis axis-x" />
              <div className="radar-axis axis-y" />
              <div className="radar-sweep" />
              <div className="radar-core">G</div>
              <span className="blip blip-1" />
              <span className="blip blip-2" />
              <span className="blip blip-3" />
              <span className="blip blip-4" />
              <span className="radar-coord coord-a">51.5°N</span>
              <span className="radar-coord coord-b">30.2°N</span>
            </div>
            <div className="radar-caption"><span className="mono">VARREDURA</span><span className="mono accent-text">AUTOMÁTICA</span></div>
          </div>
        </section>

        <section className="pipeline" aria-label="Fluxo de prospecção">
          {PIPELINE.map((step, index) => (
            <div className="pipeline-step" key={step}>
              <span className="mono pipeline-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="mono">{step}</span>
              {index < PIPELINE.length - 1 && <span className="pipeline-line" />}
            </div>
          ))}
        </section>

        <section className="features" id="como-funciona">
          <div className="section-heading">
            <span className="mono muted">// OPERAÇÃO</span>
            <h2>De listagens brutas a oportunidades prontas para abordagem.</h2>
          </div>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <div className="feature-top">
                  <span className="feature-icon">{feature.icon}</span>
                  <span className="feature-number mono">{feature.number}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <span className="feature-line" />
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>GRINGA — feita para prospecção privada.</span>
        <span>Ausência em fontes públicas não prova que a empresa não tem site. Revise sempre antes de contatar.</span>
      </footer>
    </div>
  );
}
