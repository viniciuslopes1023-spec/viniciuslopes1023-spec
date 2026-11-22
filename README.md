# GRINGA

Ferramenta privada e leve de prospecção: encontra empresas de serviços locais em países estrangeiros **sem website próprio identificado**, reúne contatos públicos e prepara o prompt de criação do site e a mensagem de primeiro contato.

Tudo em uma única tela. Sem SaaS, sem cadastro público, sem APIs pagas.

## Executar

```bash
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite (normalmente `http://localhost:5173`; se a porta estiver ocupada, ele escolhe a próxima, por exemplo `5174`).

No primeiro start, se `ADMIN_PASSWORD` não estiver definido, o servidor gera uma senha aleatória, imprime no terminal e salva em `data/initial-credentials.txt`. Use essas credenciais para entrar.

Para rodar a versão compilada em uma porta só:

```bash
npm run build
npm start
```

Abra `http://localhost:4000` (o Express serve o frontend compilado).

## Como funciona

1. **Busca automática** — consultas periódicas à API pública do OpenStreetMap (Overpass), em 26 áreas metropolitanas estrangeiras, filtrando nichos como pintura, encanamento, telhado, limpeza, jardinagem, reparo de carros, mudanças etc. Uma varredura usa 3 áreas por execução e no máximo 30 empresas por área.
2. **Filtro de website** — links de Instagram, Facebook, Yelp, Google, marketplaces e diretórios **nunca** contam como website próprio. Quando existe um domínio próprio, ele é verificado em tempo real (HEAD/GET com timeout):
   - `NO WEBSITE FOUND` — nenhum website próprio identificado nas fontes consultadas (na lista principal; **ausência em fontes públicas não é prova absoluta**).
   - `WEBSITE EXISTS` — domínio próprio responde (inclusive 403/429 de proteção anti-bot); removido da lista principal.
   - `WEBSITE BROKEN` — domínio existe mas não responde ou retorna erro; oportunidade secundária.
   - `UNVERIFIED` — verificação inconclusiva (timeout, erro de rede); oportunidade secundária.
3. **Contatos** — telefone, e-mail, Instagram e Facebook são lidos das tags públicas do OSM (inclusive telefones extraídos de descrições públicas), junto com a URL da empresa no OpenStreetMap como fonte. Nada é inventado. A consulta prioriza negócios com telefone e sem tag de website. A aba **COM TELEFONE** mostra apenas oportunidades com número real. Quando não há contato, o botão **BUSCAR CONTATO** abre uma pesquisa manual.
4. **Score 0–100** — prioriza ausência de website, contato disponível, sinais de atividade, dados suficientes para personalizar e nicho de interesse. É apenas uma ordem de prioridade, não previsão de venda.
5. **Prompt e mensagem** — gerados por templates inteligentes a partir dos dados reais. A interface e o prompt de criação estão em **português**; o prompt marca `[CONFIRMAR COM O PROPRIETÁRIO]` para qualquer informação ausente. A mensagem de primeira abordagem permanece em **inglês** (o público é estrangeiro) e é curta, sem promessas falsas. **Nenhuma mensagem é enviada automaticamente** — WhatsApp abre o app para revisão, e-mail abre o cliente de e-mail.
6. **Persistência** — SQLite em `data/gringa.db`, com deduplicação por ID do OSM e por nome+cidade+país. Buscas duplicadas não criam leads repetidos.

A busca automática roda a cada 6 horas (cron no processo do servidor) e também 15 segundos após o start se o banco estiver vazio. O botão `RUN SCAN` dispara uma busca manual, com intervalo mínimo de 15 minutos. O computador precisa estar ligado.

## Configuração

Copie `.env.example` para `.env` e ajuste:

| Variável | Padrão | Uso |
|---|---|---|
| `ADMIN_EMAIL` | `admin@gringa.local` | Usuário único do sistema |
| `ADMIN_PASSWORD` | vazio (gerado) | Senha inicial — defina a sua |
| `JWT_SECRET` | gerado em `data/jwt-secret` | Assinatura da sessão |
| `SCAN_INTERVAL_HOURS` | `6` | Periodicidade da automação |
| `REGIONS_PER_RUN` | `3` | Áreas por varredura |
| `MAX_RESULTS_PER_REGION` | `30` | Limite de empresas por área |
| `OVERPASS_DELAY_MS` | `5000` | Intervalo entre consultas |
| `OVERPASS_TIMEOUT_MS` | `90000` | Timeout de cada consulta |
| `WEBSITE_TIMEOUT_MS` | `15000` | Timeout da verificação de domínio |

## Limitações reais

- O Overpass público é gratuito e compartilhado; em horários de pico pode responder devagar ou com erro. O sistema tenta 3 endpoints públicos com intervalo entre consultas e registra falhas em `scan_runs` sem insinuar sucesso.
- O OpenStreetMap é colaborativo: muitos negócios não têm telefone ou email cadastrado. Nesses casos o lead recebe o botão **BUSCAR CONTATO** e score menor.
- Não há IA paga: prompts e mensagens vêm de templates locais. São bons como ponto de partida, não como texto final pronto sem revisão.
- Verificações de sites são feitas com HEAD/GET. Sites protegidos por Cloudflare podem retornar 403 — isso é tratado como "site existe, não foi possível carregar", nunca como "site quebrado".
- O banco fica somente nesta máquina. Não há sincronização entre dispositivos.

## Segurança

- Sem registro público: apenas o usuário configurado no bootstrap.
- Senha armazenada com hash bcrypt.
- Sessão em cookie httpOnly com JWT; `/api/leads` e `/api/scan` exigem autenticação.
- Nenhuma credencial é enviada ao frontend.

## Fontes de dados

Dados de empresas: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), disponíveis sob ODbL. O sistema usa apenas a API pública do Overpass, com identificador de aplicação e intervalos entre consultas.
