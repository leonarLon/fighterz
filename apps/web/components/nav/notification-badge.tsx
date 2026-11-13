"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const UnreadContext = createContext(0);

/**
 * Contador de notificações não lidas via Supabase Realtime (incluso, sem custo).
 * A RLS do Realtime garante que só chegam eventos do próprio destinatário.
 */
export function UnreadProvider({ userId, initial, children }: { userId: string; initial: number; children: ReactNode }) {
  const [count, setCount] = useState(initial);
  const pathname = usePathname();

  // Ao abrir a central, as notificações são marcadas como lidas.
  const onNotificationsPage = pathname === "/notificacoes";
  const shown = onNotificationsPage ? 0 : count;

  // Ajuste de estado durante a renderização (padrão recomendado pelo React, sem efeito em cascata):
  // ao entrar na central, zera o contador.
  const [wasOnPage, setWasOnPage] = useState(onNotificationsPage);
  if (wasOnPage !== onNotificationsPage) {
    setWasOnPage(onNotificationsPage);
    if (onNotificationsPage) setCount(0);
  }

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // O canal precisa do JWT antes de assinar; sem ele entra como anônimo e a RLS descarta os eventos.
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
          () => setCount((n) => n + 1),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  return <UnreadContext value={shown}>{children}</UnreadContext>;
}

export function NotificationBadge() {
  const count = useContext(UnreadContext);
  if (count <= 0) return null;
  return (
    <span
      data-testid="unread-badge"
      className="absolute -right-1.5 -top-1 min-w-4.5 rounded-full bg-primary px-1 text-center text-[11px] font-bold leading-4.5 text-on-primary"
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> não lidas</span>
    </span>
  );
}
