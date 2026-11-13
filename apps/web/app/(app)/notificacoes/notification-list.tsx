"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AtSign, Heart, MessageCircle, Reply, UserPlus, UserRoundPlus } from "lucide-react";
import { timeAgo } from "@figtherz/core";
import { markNotificationsRead, respondFollowRequest, respondMention } from "@/app/actions/social";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

export type NotificationItem = {
  id: string;
  type: string;
  unread: boolean;
  createdAt: string;
  postId: string | null;
  actor: { id: string; username: string; displayName: string } | null;
  excerpt: string | null;
  mentionStatus: "pending" | "approved" | "rejected" | null;
};

const copy: Record<string, { text: string; icon: typeof Heart }> = {
  like: { text: "curtiu seu post", icon: Heart },
  comment: { text: "comentou no seu post", icon: MessageCircle },
  reply: { text: "respondeu seu comentário", icon: Reply },
  follow: { text: "começou a seguir você", icon: UserPlus },
  follow_request: { text: "pediu para seguir você", icon: UserRoundPlus },
  mention: { text: "marcou você em um post", icon: AtSign },
};

export function NotificationList({ items }: { items: NotificationItem[] }) {
  // Abrir a central marca tudo como lido (o destaque de "nova" continua nesta visita).
  useEffect(() => {
    void markNotificationsRead();
  }, []);

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {items.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </ul>
  );
}

function Row({ item }: { item: NotificationItem }) {
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const meta = copy[item.type] ?? { text: "interagiu com você", icon: Heart };
  const Icon = meta.icon;
  const target = item.postId ? routes.post(item.postId) : item.actor ? routes.profile(item.actor.username) : routes.notifications;

  function run(action: () => Promise<{ ok: boolean }>, label: string) {
    startTransition(async () => {
      const result = await action();
      setDone(result.ok ? label : "Não foi possível concluir.");
    });
  }

  return (
    <li className={cn("flex gap-3 px-4 py-3", item.unread && "bg-accent-soft/50")}>
      <span className="relative">
        <Avatar name={item.actor?.displayName ?? "?"} size="sm" />
        <Icon aria-hidden className="absolute -bottom-1 -right-1 size-4 rounded-full bg-surface p-0.5 text-accent" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {item.unread && <span className="sr-only">Nova: </span>}
          <Link href={target} className="hover:underline">
            <span className="font-semibold">{item.actor?.displayName ?? "Alguém"}</span> {meta.text}
            {item.excerpt ? <span className="text-muted">: “{item.excerpt}”</span> : null}
          </Link>
        </p>
        <p className="text-[13px] text-muted">
          <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </p>

        {done ? (
          <p className="mt-1 text-[13px] text-muted" role="status">
            {done}
          </p>
        ) : item.type === "follow_request" && item.actor ? (
          <div className="mt-2 flex gap-2">
            <Button loading={pending} onClick={() => run(() => respondFollowRequest(item.actor!.id, true), "Solicitação aceita.")}>
              Aceitar
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => respondFollowRequest(item.actor!.id, false), "Solicitação recusada.")}>
              Recusar
            </Button>
          </div>
        ) : item.type === "mention" && item.postId && item.mentionStatus === "pending" ? (
          <div className="mt-2 flex gap-2">
            <Button loading={pending} onClick={() => run(() => respondMention(item.postId!, true), "Marcação aprovada.")}>
              Aprovar marcação
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => respondMention(item.postId!, false), "Marcação recusada.")}>
              Recusar
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
