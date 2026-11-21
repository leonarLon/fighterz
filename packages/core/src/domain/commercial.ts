// Detecção de publicidade comercial em perfis pessoais (Fase 7). Só regras explicáveis, sem IA.
// Espelho de public.commercial_text_signals() no banco, que é a fonte da verdade (roda em trigger).
// Aqui serve para avisar no formulário de publicar antes de enviar. Os mesmos casos são testados nos dois lados.

export type CommercialSignalCode = 'shop_link' | 'coupon' | 'price' | 'sales_call' | 'sales_contact' | 'personal_context' | 'checkin';
export type CommercialSignal = { code: CommercialSignalCode; points: number; excerpt: string | null };

export const COMMERCIAL_SIGNAL_LABELS: Record<CommercialSignalCode, string> = {
  shop_link: 'Link de loja, checkout ou WhatsApp',
  coupon: 'Cupom ou desconto',
  price: 'Preço',
  sales_call: 'Chamada de venda',
  sales_contact: 'Contato para venda',
  personal_context: 'Contexto pessoal (treino, competição)',
  checkin: 'Registro de treino',
};

/** Limiar do risco do perfil para abrir revisão (igual a commercial_review_threshold()). */
export const COMMERCIAL_REVIEW_THRESHOLD = 60;
/** A partir daqui o formulário de publicar sugere usar uma página comercial. */
export const COMMERCIAL_HINT_SCORE = 40;

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const RULES: { code: Exclude<CommercialSignalCode, 'personal_context' | 'checkin'>; points: number; re: RegExp }[] = [
  {
    code: 'shop_link',
    points: 30,
    re: /((https?:\/\/|www\.)\S*(shopee|mercadoli[vb]re|amzn|amazon|hotmart|kiwify|eduzz|monetizze|aliexpress|shein|nuvemshop|lojaintegrada|pag\.ae|picpay|mpago|checkout|\/loja|loja\.)\S*|wa\.me\/\S*|api\.whatsapp\.com\S*)/,
  },
  { code: 'coupon', points: 25, re: /(cupom|cupon|codigo promocional|codigo de desconto|\b\d{1,2} ?% ?off\b|\d{1,2} ?% de desconto)/ },
  { code: 'price', points: 20, re: /(r\$ ?\d[\d.,]*)/ },
  {
    // "promoção" fica de fora: no esporte é graduação ("promoção de faixa"). "vendo" também (verbo ver).
    code: 'sales_call',
    points: 20,
    re: /\b(compre|comprem|compra ja|encomende|encomendas abertas|peca ja|peca o seu|peca a sua|(chama|chame) no (direct|dm|pv|privado|zap|whats|inbox)|link na bio|frete gratis|garanta o seu|garanta a sua|garanta ja|ultimas unidades|estoque limitado|a venda|pronta entrega)\b/,
  },
];

const PHONE = /(\(?\d{2}\)? ?9?\d{4}[ -]?\d{4})/;
const PERSONAL = /\b(treino|treinei|treinar|tatame|campeonato|graduacao|faixa|luta|competicao|aula|sparring|rola|seminario)\b/;

export function detectCommercialSignals(text: string | null | undefined): CommercialSignal[] {
  const t = normalize(text ?? '');
  if (t.trim() === '') return [];
  const signals: CommercialSignal[] = [];
  for (const rule of RULES) {
    const m = t.match(rule.re);
    if (m) signals.push({ code: rule.code, points: rule.points, excerpt: (m[1] ?? m[0]).slice(0, 120) });
  }
  if (/\b(whats|whatsapp|zap|wpp)\b/.test(t)) {
    const phone = t.match(PHONE);
    if (phone) signals.push({ code: 'sales_contact', points: 10, excerpt: phone[1]!.slice(0, 120) });
  }
  if (!signals.some((s) => s.code === 'shop_link')) {
    const m = t.match(PERSONAL);
    if (m) signals.push({ code: 'personal_context', points: -10, excerpt: m[1]! });
  }
  return signals;
}

export function commercialScore(text: string | null | undefined): number {
  const sum = detectCommercialSignals(text).reduce((acc, s) => acc + s.points, 0);
  return Math.max(0, Math.min(100, sum));
}

/** Risco do perfil, igual ao banco: metade do maior post + 20 por post com 40+ pontos + metade da bio. */
export function commercialRisk(postScores: number[], bioScore: number): number {
  const max = postScores.length ? Math.max(...postScores) : 0;
  const flagged = postScores.filter((s) => s >= 40).length;
  return Math.min(100, Math.floor(max / 2) + 20 * flagged + Math.floor(bioScore / 2));
}
