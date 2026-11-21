// Valores em reais guardados em centavos (inteiro), como no banco (academy_unit_access.price_cents).

/** Mesmos limites do banco: de R$ 1,00 a R$ 100.000,00. */
export const MIN_PRICE_CENTS = 100;
export const MAX_PRICE_CENTS = 10_000_000;

/**
 * Converte o que a pessoa digita em centavos. Aceita "40", "40,5", "40,50", "R$ 1.200,00", "1200.00".
 * Devolve null se não for um valor reconhecível (nada é arredondado de forma silenciosa além dos centavos).
 */
export function parseBrl(input: string): number | null {
  const raw = input.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!raw) return null;
  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw)) normalized = raw.replace(/\./g, '').replace(',', '.'); // 1.200,00
  else if (/^\d+(,\d{1,2})?$/.test(raw)) normalized = raw.replace(',', '.'); // 1200,5
  else if (/^\d+(\.\d{1,2})?$/.test(raw)) normalized = raw; // 1200.50
  else return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isFinite(cents) ? cents : null;
}

/** "R$ 1.200,00" (formato brasileiro, sem depender do Intl do sistema). */
export function formatBrl(cents: number): string {
  const reais = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${rest}`;
}
