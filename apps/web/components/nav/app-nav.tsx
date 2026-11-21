"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bookmark, Building2, CalendarDays, CalendarSearch, Compass, GraduationCap, Medal, House, Plus, Settings, Store, UserRound, type LucideIcon } from "lucide-react";
import { routes } from "@/lib/routes";
import { cn } from "@/components/ui/cn";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBadge } from "./notification-badge";

type Item = { href: string; label: string; icon: LucideIcon; primary?: boolean; badge?: boolean };

// Mesmos destinos no mobile e no desktop (DESIGN_SYSTEM.md §6). Jornada, aulas, academias e eventos
// ficam no menu lateral (desktop) e em Explorar (mobile).
function items(username: string): Item[] {
  return [
    { href: routes.feed, label: "Início", icon: House },
    { href: routes.explore, label: "Explorar", icon: Compass },
    { href: routes.publish, label: "Publicar", icon: Plus, primary: true },
    { href: routes.notifications, label: "Notificações", icon: Bell, badge: true },
    { href: routes.profile(username), label: "Perfil", icon: UserRound },
  ];
}

// Menu lateral (desktop) também leva a aulas, academias e à área do professor (DESIGN_SYSTEM.md §6).
const secondary: Item[] = [
  { href: routes.journey, label: "Minha jornada", icon: Medal },
  { href: routes.events, label: "Eventos", icon: CalendarDays },
  { href: routes.classes, label: "Aulas", icon: CalendarSearch },
  { href: routes.academies, label: "Academias", icon: Building2 },
  { href: routes.businesses, label: "Marcas, lojas e serviços", icon: Store },
  { href: routes.teacherArea, label: "Área do professor", icon: GraduationCap },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ username, displayName, avatarPath }: { username: string; displayName: string; avatarPath: string | null }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface px-4 py-6 lg:flex"
    >
      <Logo href={routes.feed} className="px-3 text-3xl" />
      <ul className="mt-8 space-y-1">
        {items(username).map(({ href, label, icon: Icon, primary, badge }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold transition-colors",
                  primary
                    ? "mt-2 bg-primary text-on-primary hover:bg-primary-hover"
                    : active
                      ? "bg-accent-soft text-accent"
                      : "text-text hover:bg-bg",
                )}
              >
                <span className="relative">
                  <Icon aria-hidden className="size-5" strokeWidth={active ? 2.5 : 2} />
                  {badge && <NotificationBadge />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <ul className="mt-6 space-y-1 border-t border-border pt-4">
        {secondary.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold text-text hover:bg-bg aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-1 border-t border-border pt-4">
        <Link
          href={routes.saved}
          aria-current={isActive(pathname, routes.saved) ? "page" : undefined}
          className="flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold text-text hover:bg-bg aria-[current=page]:text-accent"
        >
          <Bookmark aria-hidden className="size-5" />
          Salvos
        </Link>
        <Link
          href={routes.settings}
          aria-current={isActive(pathname, routes.settings) ? "page" : undefined}
          className="flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold text-text hover:bg-bg aria-[current=page]:text-accent"
        >
          <Settings aria-hidden className="size-5" />
          Configurações
        </Link>
        <Link href={routes.profile(username)} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-bg">
          <Avatar name={displayName} path={avatarPath} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{displayName}</span>
            <span className="block truncate text-[13px] text-muted">@{username}</span>
          </span>
        </Link>
      </div>
    </nav>
  );
}

export function BottomNav({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items(username).map(({ href, label, icon: Icon, primary, badge }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                // Só o botão Publicar não tem texto visível; os demais usam o próprio rótulo (WCAG 2.5.3).
                aria-label={primary ? label : undefined}
                className={cn(
                  "flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                  active ? "text-accent" : "text-muted",
                )}
              >
                {primary ? (
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary text-on-primary">
                    <Icon aria-hidden className="size-6" strokeWidth={2.5} />
                  </span>
                ) : (
                  <>
                    <span className="relative">
                      <Icon aria-hidden className="size-6" strokeWidth={active ? 2.5 : 2} />
                      {badge && <NotificationBadge />}
                    </span>
                    <span>{label}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
      <Logo href={routes.feed} />
      <Link
        href={routes.settings}
        aria-label="Configurações"
        className="flex size-11 items-center justify-center rounded-md text-muted hover:text-text"
      >
        <Settings aria-hidden className="size-5" />
      </Link>
    </header>
  );
}
