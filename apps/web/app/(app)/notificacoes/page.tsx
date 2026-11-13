import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { NotificationList, type NotificationItem } from "./notification-list";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data }, { data: mentions }] = await Promise.all([
    supabase
      .from("notification_cards")
      .select("id, type, read_at, created_at, post_id, comment_id, actor_id, actor_username, actor_display_name, post_excerpt, academy_slug, academy_name, event_id, event_title, event_status")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("post_mentions").select("post_id, status").eq("user_id", user.id),
  ]);

  const mentionStatus = new Map((mentions ?? []).map((m) => [m.post_id, m.status]));
  const items: NotificationItem[] = (data ?? []).map((n) => ({
    id: n.id!,
    type: n.type!,
    unread: !n.read_at,
    createdAt: n.created_at!,
    postId: n.post_id,
    commentId: n.comment_id,
    actor: n.actor_id ? { id: n.actor_id, username: n.actor_username ?? "", displayName: n.actor_display_name ?? "" } : null,
    excerpt: n.post_excerpt,
    academy: n.academy_slug ? { slug: n.academy_slug, name: n.academy_name ?? "" } : null,
    event: n.event_id ? { id: n.event_id, title: n.event_title ?? "", cancelled: n.event_status === "cancelled" } : null,
    mentionStatus: n.type === "mention" && n.post_id ? (mentionStatus.get(n.post_id) ?? null) : null,
  }));

  return (
    <>
      <PageHeader title="Notificações" />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Nada por aqui ainda" description="Curtidas, comentários e novos seguidores vão aparecer aqui." />
      ) : (
        <NotificationList items={items} />
      )}
    </>
  );
}
