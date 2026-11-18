/** Idade mínima para criar conta (SECURITY.md §6). */
export const MIN_ACCOUNT_AGE = 18;
/** Teto de sanidade para a idade digitada no cadastro (igual ao check do banco). */
export const MAX_DECLARED_AGE = 120;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Converte "AAAA-MM-DD" em partes numéricas, validando se a data existe. */
export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

/** Idade completa em anos na data `today` (comparação por calendário, sem fuso). */
export function ageOn(birthDate: string, today: Date = new Date()): number | null {
  const birth = parseIsoDate(birthDate);
  if (!birth) return null;
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  let age = y - birth.year;
  if (m < birth.month || (m === birth.month && d < birth.day)) age -= 1;
  return age;
}

export function isAdult(birthDate: string, today: Date = new Date()): boolean {
  const age = ageOn(birthDate, today);
  return age !== null && age >= MIN_ACCOUNT_AGE;
}
