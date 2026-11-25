// Critério para ser professor (espelha teacher_min_rank_ordinal/teacher_art_qualifies, migration 31):
// faixa preta ou equivalente nas modalidades com graduação; modalidades sem graduação não exigem nada.

export type TeacherArt = { hasRanks: boolean; teacherMinOrdinal: number | null };
export type TeacherRank = { ordinal: number; name: string };

/** Ordem mínima da graduação para ser professor, ou `null` quando a modalidade não tem graduação. */
export function teacherMinOrdinal(art: TeacherArt, ranks: TeacherRank[]): number | null {
  if (!art.hasRanks) return null;
  if (art.teacherMinOrdinal != null) return art.teacherMinOrdinal;
  const black = ranks.filter((r) => /pret/i.test(r.name)).map((r) => r.ordinal);
  if (black.length > 0) return Math.min(...black);
  return ranks.length > 0 ? Math.max(...ranks.map((r) => r.ordinal)) : null;
}

/** Graduações que permitem ser professor naquela modalidade (vazio para modalidades sem graduação). */
export function teacherRankOptions<R extends TeacherRank>(art: TeacherArt, ranks: R[]): R[] {
  const min = teacherMinOrdinal(art, ranks);
  return min == null ? [] : ranks.filter((r) => r.ordinal >= min).sort((a, b) => a.ordinal - b.ordinal);
}

// ---------------------------------------------------------------------------
// Próxima aula (horário de Brasília, UTC-3 fixo desde 2019; ver APP_TIMEZONE)
// ---------------------------------------------------------------------------
const BRT_OFFSET_MIN = -3 * 60;
const SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function minutes(time: string) {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}

export type NextOccurrence = {
  /** Minutos até começar (0 quando está acontecendo agora). */
  inMinutes: number;
  happeningNow: boolean;
  /** "Agora", "Hoje, 19:00", "Amanhã, 07:00" ou "Qui, 19:00". */
  label: string;
};

/** Quando acontece a próxima ocorrência de uma aula semanal (weekday 0 = domingo; horários "HH:MM[:SS]"). */
export function nextClassOccurrence(
  slot: { weekday: number; starts_at: string; ends_at: string },
  now: Date = new Date(),
): NextOccurrence {
  const local = new Date(now.getTime() + BRT_OFFSET_MIN * 60_000);
  const today = local.getUTCDay();
  const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
  const start = minutes(slot.starts_at);
  const end = minutes(slot.ends_at);
  const hhmm = slot.starts_at.slice(0, 5);

  if (slot.weekday === today && nowMin >= start && nowMin < end) {
    return { inMinutes: 0, happeningNow: true, label: 'Agora' };
  }
  let days = (slot.weekday - today + 7) % 7;
  if (days === 0 && nowMin >= end) days = 7;
  const inMinutes = days * 1440 + start - nowMin;
  const label =
    days === 0 ? `Hoje, ${hhmm}` : days === 1 ? `Amanhã, ${hhmm}` : `${SHORT[slot.weekday]![0]!.toUpperCase()}${SHORT[slot.weekday]!.slice(1)}, ${hhmm}`;
  return { inMinutes, happeningNow: false, label };
}

/** Ordena aulas semanais pela próxima ocorrência. */
export function sortByNextOccurrence<T extends { weekday: number; starts_at: string; ends_at: string }>(items: T[], now: Date = new Date()) {
  return items
    .map((item) => ({ item, next: nextClassOccurrence(item, now) }))
    .sort((a, b) => a.next.inMinutes - b.next.inMinutes);
}
