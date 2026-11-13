import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, formatEventRange, type EventStatus, type EventType } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TargetActions } from "../target-actions";

export const metadata: Metadata = { title: "Eventos · Administração" };

function thirtyDaysAgo() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString();
}

export default async function AdminEventsPage() {
  const supabase = await createClient();
  // Moderadores enxergam todos os eventos pela política de leitura (inclusive rascunhos).
  const { data } = await supabase
    .from("event_cards")
    .select("id, title, type, status, starts_at, ends_at, city, state, organizer_username, academy_name, interest_count")
    .gte("ends_at", thirtyDaysAgo())
    .order("starts_at")
    .limit(100);

  return (
    <>
      <PageHeader title="Eventos" description="Eventos por vir e dos últimos 30 dias. Cancelar avisa quem marcou interesse." />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nenhum evento" description="Eventos criados aparecem aqui." />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((e) => (
            <li key={e.id} className="rounded-lg border border-border bg-surface p-4">
              <h2 className="font-semibold">
                <Link href={routes.event(e.id!)} className="hover:underline">
                  {e.title}
                </Link>{" "}
                <span className="text-[13px] font-normal text-muted">
                  {EVENT_TYPE_LABELS[e.type as EventType]} · {EVENT_STATUS_LABELS[e.status as EventStatus]}
                </span>
              </h2>
              <p className="text-[13px] text-muted">
                {formatEventRange(e.starts_at!, e.ends_at!)} · {e.city}/{e.state} · por {e.academy_name ?? `@${e.organizer_username}`} ·{" "}
                {e.interest_count} interessados
              </p>
              {e.status !== "cancelled" && (
                <TargetActions targetType="event" targetId={e.id!} removed={false} removeLabel="Cancelar evento" restorable={false} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
