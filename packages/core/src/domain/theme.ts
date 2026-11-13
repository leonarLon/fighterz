/** Preferência de tema (DESIGN_SYSTEM.md §7). Mesmo enum do banco: theme_preference. */
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_COOKIE = 'theme';
export const DEFAULT_THEME: ThemePreference = 'system';

export function parseThemePreference(value: unknown): ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
    ? (value as ThemePreference)
    : DEFAULT_THEME;
}

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Automático',
};
