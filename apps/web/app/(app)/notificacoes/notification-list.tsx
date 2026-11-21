"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AtSign, BadgeCheck, Building2, CalendarDays, Heart, Medal, MessageCircle, Reply, ShieldCheck, UserPlus, UserRoundPlus } from "lucide-react";
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
  commentId: string | null;
  actor: { id: string; username: string; displayName: string; avatarPath: string | null } | null;
  excerpt: string | null;
  academy: { slug: string; name: string } | null;
  event: { id: string; title: string; cancelled: boolean } | null;
  mentionStatus: "pending" | "approved" | "rejected" | null;
};

const copy: Record<string, { text: string; icon: typeof Heart }> = {
  like: { text: "curtiu seu post", icon: Heart },
  comment: { text: "comentou no seu post", icon: MessageCircle },
  reply: { text: "respondeu seu comentário", icon: Reply },
  follow: { text: "começou a seguir você", icon: UserPlus },
  follow_request: { text: "pediu para seguir você", icon: UserRoundPlus },
  mention: { text: "marcou você em um post", icon: AtSign },
  membership_request: { text: "enviou um pedido de vínculo", icon: Building2 },
  moderation: { text: "revisou seu perfil profissional", icon: ShieldCheck },
  promotion_request: { text: "pediu que você confirme uma graduação", icon: Medal },
  promotion_confirmed: { text: "confirmou sua graduação", icon: BadgeCheck },
  event_update: { text: "atualizou um evento que você marcou interesse", icon: CalendarDays },
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

/** Para onde a notificação leva. Vínculo: quem gerencia vai ao painel; quem foi convidado vai à área do professor. */
function metaOf(item: NotificationItem): { text: string; icon: typeof Heart } {
  if (item.type === "event_update" && item.event?.cancelled) {
    return { text: "cancelou um evento que você marcou interesse", icon: CalendarDays };
  }
  if (item.type === "moderation") {
    if (item.commentId) return { text: "removeu um comentário seu por violar as diretrizes", icon: ShieldCheck };
    if (item.postId) return { text: "removeu um post seu por violar as diretrizes", icon: ShieldCheck };
    if (item.academy) return { text: "suspendeu a página da sua academia", icon: ShieldCheck };
  }
  return copy[item.type] ?? { text: "interagiu com você", icon: Heart };
}

function targetOf(item: NotificationItem): string {
  if (item.postId) return routes.post(item.postId);
  if (item.type === "membership_request" && item.academy) return `${routes.manageAcademy(item.academy.slug)}#equipe`;
  if (item.type === "moderation" && item.academy) return routes.academy(item.academy.slug);
  if (item.type === "moderation") return routes.teacherArea;
  if (item.type === "promotion_request") return `${routes.teacherArea}#graduacoes-pendentes`;
  if (item.type === "promotion_confirmed") return routes.journey;
  if (item.event) return routes.event(item.event.id);
  if (item.actor) return routes.profile(item.actor.username);
  return routes.notifications;
}

function Row({ item }: { item: NotificationItem }) {
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const meta = metaOf(item);
  // Moderação nunca mostra quem decidiu.
  const actorName = item.type === "moderation" ? "Equipe Fighterz" : (item.actor?.displayName ?? "Alguém");
  const Icon = meta.icon;
  const target = targetOf(item);

  function run(action: () => Promise<{ ok: boolean }>, label: string) {
    startTransition(async () => {
      const result = await action();
      setDone(result.ok ? label : "Não foi possível concluir.");
    });
  }

  return (
    <li className={cn("flex gap-3 px-4 py-3", item.unread && "bg-accent-soft/50")}>
      <span className="relative">
        <Avatar name={actorName} path={item.type === "moderation" ? null : item.actor?.avatarPath} size="sm" />
        <Icon aria-hidden className="absolute -bottom-1 -right-1 size-4 rounded-full bg-surface p-0.5 text-accent" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {item.unread && <span className="sr-only">Nova: </span>}
          <Link href={target} className="hover:underline">
            <span className="font-semibold">{actorName}</span> {meta.text}
            {item.excerpt ? <span className="text-muted">: “{item.excerpt}”</span> : null}
            {item.academy ? <span className="text-muted"> · {item.academy.name}</span> : null}
            {item.event ? <span className="text-muted">: “{item.event.title}”</span> : null}
          </Link>
        </p>
        <p className="text-[13px] text-muted">
          <time dateTime={item.createdAt} suppressHydrationWarning>{timeAgo(item.createdAt)}</time>
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
