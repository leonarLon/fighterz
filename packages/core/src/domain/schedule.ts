/** 0 = domingo, igual ao banco (class_schedules.weekday) e a Date.getDay(). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
/** Ordem de exibição da semana começando na segunda. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const CLASS_LEVELS = ['all', 'beginner', 'intermediate', 'advanced', 'kids', 'competition'] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];
export const CLASS_LEVEL_LABELS: Record<ClassLevel, string> = {
  all: 'Todos os níveis',
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  kids: 'Infantil',
  competition: 'Competição',
};

export const CLASS_STATUSES = ['active', 'paused', 'cancelled'] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];
export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

export const PERIODS = ['morning', 'afternoon', 'evening'] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_LABELS: Record<Period, string> = {
  morning: 'Manhã (até 12h)',
  afternoon: 'Tarde (12h–18h)',
  evening: 'Noite (a partir das 18h)',
};

/** "19:00:00" → "19:00" */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}

/** Agrupa aulas por dia, na ordem segunda → domingo, e por horário dentro do dia. */
export function groupByWeekday<T extends { weekday: number; starts_at: string }>(items: T[]) {
  return WEEK_ORDER.map((weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    items: items.filter((item) => item.weekday === weekday).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  }));
}
