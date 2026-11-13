import "server-only";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseThemePreference, type ThemePreference } from "@figtherz/core";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function readThemeCookie(): Promise<ThemePreference> {
  return parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
}

/** Só pode ser chamado em Server Actions ou Route Handlers. */
export async function writeThemeCookie(theme: ThemePreference) {
  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
