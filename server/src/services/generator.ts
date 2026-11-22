import type { Contacts } from './contacts';

interface PromptInput {
  name: string;
  category: string;
  city: string;
  country: string;
  address: string;
  summary: string;
  services: string[];
  websiteStatus: string;
  websiteNote: string;
  contacts: Contacts;
}

const PALETTES: Record<string, string> = {
  cleaning: 'verde-azulado profundo, branco suave e cinza claro',
  painter: 'branco quente, grafite e um único destaque (âmbar ou azul)',
  plumber: 'azul-marinho, branco e detalhes em laranja',
  roofer: 'cinza ardósia, azul escuro e detalhes âmbar',
  carpenter: 'marrom nogueira, creme e verde suave',
  electrician: 'azul meia-noite, branco e amarelo elétrico',
  gardener: 'verde floresta, creme e tons de pedra',
  mover: 'azul forte, branco e grafite',
  repair: 'grafite, azul-aço e laranja',
  default: 'ardósia escura, branco limpo e um destaque azul elétrico',
};

function paletteFor(category: string): string {
  const key = category.toLowerCase();
  if (key.includes('limpez')) return PALETTES.cleaning;
  if (key.includes('pintor')) return PALETTES.painter;
  if (key.includes('encan')) return PALETTES.plumber;
  if (key.includes('telh')) return PALETTES.roofer;
  if (key.includes('marcen')) return PALETTES.carpenter;
  if (key.includes('eletric')) return PALETTES.electrician;
  if (key.includes('jardin') || key.includes('paisag')) return PALETTES.gardener;
  if (key.includes('mudan')) return PALETTES.mover;
  if (key.includes('oficina') || key.includes('mecân') || key.includes('carro')) return PALETTES.repair;
  return PALETTES.default;
}

export function buildWebsitePrompt(input: PromptInput): string {
  const location = [input.city, input.country].filter(Boolean).join(', ');
  const services = input.services.length
    ? input.services.map((service) => `    - ${service}`).join('\n')
    : '    - [CONFIRMAR COM O PROPRIETÁRIO: listar os principais serviços]';
  const contactLines = [
    input.contacts.phone ? `    - Telefone: ${input.contacts.phone} (usar link tel:)` : null,
    input.contacts.email ? `    - E-mail: ${input.contacts.email} (usar link mailto:)` : null,
    input.contacts.instagram ? `    - Instagram: @${input.contacts.instagram}` : null,
    input.contacts.facebook ? `    - Facebook: ${input.contacts.facebook}` : null,
  ].filter(Boolean).join('\n') || '    - [CONFIRMAR COM O PROPRIETÁRIO: forma de contato preferida]';
  const statusLine =
    input.websiteStatus === 'NO_WEBSITE_FOUND'
      ? 'Nenhum website próprio identificado nas fontes públicas consultadas (ausência nessas fontes não é prova absoluta).'
      : input.websiteStatus === 'WEBSITE_BROKEN'
        ? 'Um domínio próprio aparece nos dados públicos, mas parece indisponível.'
        : 'Presença online própria inconclusiva; confirmar com o proprietário.';

  return [
    'Você é um designer sênior e desenvolvedor front-end.',
    `Crie um site completo e pronto para produção para ${input.name}.`,
    '',
    'FATOS VERIFICADOS DO NEGÓCIO (use apenas estes; não invente serviços, preços, prêmios ou depoimentos):',
    `  - Nome: ${input.name}`,
    `  - Categoria: ${input.category}`,
    `  - Localização: ${location || '[CONFIRMAR COM O PROPRIETÁRIO]'}`,
    `  - Endereço da listagem pública: ${input.address || '[CONFIRMAR COM O PROPRIETÁRIO]'}`,
    `  - Resumo da listagem pública: ${input.summary}`,
    `  - Situação do website: ${statusLine}`,
    '',
    '  Contatos conhecidos:',
    contactLines,
    '',
    'OBJETIVO',
    `Criar um site rápido, responsivo e de uma única página que facilite para clientes de ${input.city || 'região local'} entenderem o que o negócio faz e entrarem em contato.`,
    '',
    'IDENTIDADE VISUAL SUGERIDA',
    `  - Paleta: ${paletteFor(input.category)}.`,
    '  - Tipografia: sans geométrica moderna para títulos, sans neutra e legível para o corpo.',
    '  - Imagens: usar blocos de placeholder claramente identificados ou padrões abstratos. Não apresentar fotos de banco como se fossem do negócio real.',
    '  - Tom: direto, local, confiável — sem hype e sem afirmações não verificáveis.',
    '',
    'ESTRUTURA DAS SEÇÕES',
    '  1. Hero: nome do negócio, uma linha clara de valor baseada na categoria e localização verificadas, CTA principal para o contato conhecido.',
    '  2. Serviços: apenas os itens listados abaixo; se faltar algo, manter um placeholder óbvio.',
    services,
    '  3. Sobre: parafrasear somente o resumo da listagem pública. Não inventar datas de fundação, sócios ou prêmios.',
    `  4. Área de atendimento: ${location || '[CONFIRMAR COM O PROPRIETÁRIO]'}.`,
    '  5. Contato: links reais tel:/mailto:/redes quando conhecidos, mais formulário (nome, telefone, e-mail, mensagem) com aviso de que é necessário conectar um endpoint de recebimento.',
    `  6. Rodapé: ${input.name} · ${input.city || 'negócio local'} · rascunho de conceito — confirmar dados com o proprietário.`,
    '',
    'REQUISITOS TÉCNICOS',
    '  - HTML5 semântico, CSS responsivo mobile-first, contraste acessível e controles navegáveis por teclado.',
    `  - SEO: título "${input.name} | ${input.category} em ${input.city || 'região local'}"`,
    '  - Meta description derivada apenas do resumo verificado.',
    '  - Tags Open Graph e JSON-LD LocalBusiness usando somente fatos conhecidos.',
    '  - Nenhuma API paga, nenhum ativo pago, nenhum depoimento falso e nenhuma contagem de avaliações inventada.',
    '  - Entregar todos os arquivos prontos para rodar localmente, com instruções curtas de execução.',
    '',
    'REGRA DURA: quando faltar uma informação, escreva [CONFIRMAR COM O PROPRIETÁRIO] em vez de inventar.',
  ].join('\n');
}

interface MessageInput {
  name: string;
  category: string;
  city: string;
  websiteStatus: string;
}

export function buildFirstContactMessage(input: MessageInput): string {
  const team = `${input.name} team`;
  const place = input.city ? ` in ${input.city}` : '';

  if (input.websiteStatus === 'WEBSITE_BROKEN') {
    return `Hi ${team} — I tried to open the website listed for your business${place} and it didn't load. I build simple, fast websites for local businesses. If you'd like, I can put together a quick example for ${input.name} to look at. Want me to send it?`;
  }

  if (input.websiteStatus === 'NO_WEBSITE_FOUND') {
    return `Hi ${team} — I came across your ${input.category.toLowerCase()} business${place} while looking at local companies. I build simple, fast websites, and I couldn't find an own website for ${input.name} in the public listings I checked. If that's useful, I can put together a quick example at no cost. Want me to send it?`;
  }

  return `Hi ${team} — I came across your ${input.category.toLowerCase()} business${place} while looking at local companies. I build simple, fast websites for local businesses and would be glad to share a quick example for ${input.name} if it's useful. No pressure — just reply here.`;
}
