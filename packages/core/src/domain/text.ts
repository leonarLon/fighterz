export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string; username: string }
  | { type: 'link'; value: string; href: string };

const TOKEN = /(^|[^a-z0-9_.])@([a-z0-9_.]{3,30})|(https?:\/\/[^\s<>"]+)/gi;

/**
 * Quebra a legenda em texto, marcações e links. Só vira link a marcação **aprovada**
 * (DATA_MODEL.md: post_mentions). O resto continua texto puro. Nada aqui gera HTML.
 */
export function segmentText(text: string, approvedMentions: readonly string[] = []): TextSegment[] {
  const approved = new Set(approvedMentions.map((name) => name.toLowerCase()));
  const segments: TextSegment[] = [];
  let last = 0;
  const push = (segment: TextSegment) => {
    const prev = segments[segments.length - 1];
    if (segment.type === 'text' && prev?.type === 'text') prev.value += segment.value;
    else if (segment.value) segments.push(segment);
  };

  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    const [full, before = '', username, url] = match;
    push({ type: 'text', value: text.slice(last, index) });
    if (url) {
      const trimmed = url.replace(/[.,;:!?)]+$/, '');
      push({ type: 'link', value: trimmed, href: trimmed });
      push({ type: 'text', value: url.slice(trimmed.length) });
    } else if (username) {
      push({ type: 'text', value: before });
      const name = username.toLowerCase();
      push(approved.has(name) ? { type: 'mention', value: `@${username}`, username: name } : { type: 'text', value: `@${username}` });
    }
    last = index + full.length;
  }
  push({ type: 'text', value: text.slice(last) });
  return segments;
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "há 3 horas", "agora", em pt-BR. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const format = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return format.format(-Math.floor(seconds / size), unit);
  }
  return 'agora';
}

/** Contadores compactos: 1.234 → "1,2 mil". */
export function compactCount(value: number): string {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
