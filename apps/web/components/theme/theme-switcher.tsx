"use client";

import { useState, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_LABELS, THEME_PREFERENCES, type ThemePreference } from "@figtherz/core";
import { setThemePreference } from "@/app/actions/account";
import { cn } from "@/components/ui/cn";

const icons = { light: Sun, dark: Moon, system: Monitor } as const;

/** Troca o tema na hora (atributo no <html>) e persiste em cookie + conta. */
export function ThemeSwitcher({ initial }: { initial: ThemePreference }) {
  const [theme, setTheme] = useState(initial);
  const [pending, startTransition] = useTransition();

  function choose(next: ThemePreference) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    startTransition(() => setThemePreference(next));
  }

  return (
    <fieldset aria-busy={pending || undefined}>
      <legend className="mb-2 text-sm font-semibold">Tema</legend>
      <div className="inline-flex rounded-md border border-border bg-bg p-1" role="radiogroup">
        {THEME_PREFERENCES.map((option) => {
          const Icon = icons[option];
          const checked = theme === option;
          return (
            <label
              key={option}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-[8px] px-3 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-focus",
                checked ? "bg-surface text-text shadow-(--shadow-card)" : "text-muted hover:text-text",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={option}
                checked={checked}
                onChange={() => choose(option)}
                className="sr-only"
              />
              <Icon aria-hidden className="size-4" />
              {THEME_LABELS[option]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
