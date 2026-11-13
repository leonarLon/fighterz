"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

export type AdminNavItem = { href: string; label: string; badge?: number };

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administração" className="-mx-1 mb-6 overflow-x-auto">
      <ul className="flex min-w-max gap-1 px-1">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold",
                  active ? "bg-accent-soft text-accent" : "text-text hover:bg-bg",
                )}
              >
                {item.label}
                {item.badge ? (
                  <span className="rounded-full bg-primary px-1.5 text-[12px] text-on-primary">
                    {item.badge}
                    <span className="sr-only"> pendentes</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
