// Jornada esportiva e eventos: rótulos e regras puras (sem banco, sem navegador).

export const ACHIEVEMENT_TYPES = ['competition_result', 'milestone', 'certification', 'other'] as const;
export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];
export const ACHIEVEMENT_TYPE_LABELS: Record<AchievementType, string> = {
  competition_result: 'Resultado em competição',
  milestone: 'Marco pessoal',
  certification: 'Certificação',
  other: 'Outra',
};

export const MEDALS = ['gold', 'silver', 'bronze'] as const;
export type Medal = (typeof MEDALS)[number];
export const MEDAL_LABELS: Record<Medal, string> = { gold: 'Ouro', silver: 'Prata', bronze: 'Bronze' };

export const EVENT_TYPES = ['championship', 'seminar', 'open_mat', 'graduation', 'workshop', 'special_training', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  championship: 'Campeonato',
  seminar: 'Seminário',
  open_mat: 'Open mat',
  graduation: 'Graduação',
  workshop: 'Workshop',
  special_training: 'Treino especial',
  other: 'Outro',
};

export const EVENT_STATUSES = ['draft', 'published', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  cancelled: 'Cancelado',
};

/** Graus aceitos por uma graduação: 0..max (ex.: faixa azul do BJJ = 0 a 4). */
export function degreeOptions(maxDegrees: number): number[] {
  const max = Math.max(0, Math.min(10, Math.trunc(maxDegrees)));
  return Array.from({ length: max + 1 }, (_, i) => i);
}

export function isValidDegree(degree: number, maxDegrees: number): boolean {
  return Number.isInteger(degree) && degree >= 0 && degree <= maxDegrees;
}

/** "Faixa Azul · 2 graus" / "Faixa Azul" / "Faixa Preta · 1 grau". */
export function rankLabel(rankName: string | null | undefined, degree: number | null | undefined): string {
  if (!rankName) return 'Sem graduação';
  if (!degree) return rankName;
  return `${rankName} · ${degree} ${degree === 1 ? 'grau' : 'graus'}`;
}

export function placementLabel(placement: number | null | undefined): string | null {
  if (!placement) return null;
  return `${placement}º lugar`;
}

/** Fuso usado na interface e nos formulários. O Brasil de Brasília não tem horário de verão desde 2019. */
export const APP_TIMEZONE = 'America/Sao_Paulo';
const APP_OFFSET = '-03:00';

/** "2026-11-13T19:30" (datetime-local, horário de Brasília) → ISO com fuso. Inválido → null. */
export function localDateTimeToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00${APP_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO → "2026-11-13T19:30" no horário de Brasília (valor inicial de datetime-local). */
export function isoToLocalDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Dia (AAAA-MM-DD) de um instante no horário de Brasília. */
export function localDay(iso: string): string {
  return isoToLocalDateTime(iso).slice(0, 10);
}

/** "sex., 13 de nov. · 19:30" */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(/,?\s(\d{2}:\d{2})$/, ' · $1');
}

/** "13 de novembro de 2026" (datas sem hora, como promoções e conquistas). */
export function formatDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}

/** Período do evento: mesmo dia mostra só a hora final. */
export function formatEventRange(startsAt: string, endsAt: string): string {
  const start = formatDateTime(startsAt);
  if (localDay(startsAt) === localDay(endsAt)) {
    return `${start}–${isoToLocalDateTime(endsAt).slice(11)}`;
  }
  return `${start} até ${formatDateTime(endsAt)}`;
}

export type CalendarDay = { day: string; inMonth: boolean; count: number };

/**
 * Grade do mês (semanas começando na segunda) com a contagem de treinos por dia.
 * `month` = "AAAA-MM"; `days` = dias com treino (AAAA-MM-DD, repetidos contam mais de uma vez).
 */
export function monthGrid(month: string, days: string[]): CalendarDay[][] {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d, (counts.get(d) ?? 0) + 1);

  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // segunda = 0
  const start = new Date(Date.UTC(y, m - 1, 1 - lead));
  const weeks: CalendarDay[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const day = cursor.toISOString().slice(0, 10);
      week.push({ day, inMonth: cursor.getUTCMonth() === m - 1, count: counts.get(day) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === m - 1);
  return weeks;
}

/** "2026-11" → "2026-10" / "2026-12". */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}
