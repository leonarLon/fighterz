import type { Metadata } from "next";
import Link from "next/link";
import { SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABELS, type SubscriptionStatus } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "../access";
import { NewSubscriptionForm, SubscriptionActions, type SubscriptionEvent } from "./subscription-forms";

export const metadata: Metadata = { title: "Assinaturas · Administração" };

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = SUBSCRIPTION_STATUSES.includes(sp.situacao as SubscriptionStatus) ? (sp.situacao as SubscriptionStatus) : undefined;
  const supabase = await createClient();
  let query = supabase.from("subscription_cards").select("*").order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  const [{ data: subs }, { data: plans }] = await Promise.all([
    query,
    supabase.from("plans").select("id, name, audience, is_active").eq("is_active", true).order("sort_order"),
  ]);
  const ids = (subs ?? []).map((s) => s.id!);
  const { data: events } = ids.length
    ? await supabase
        .from("subscription_events")
        .select("id, subscription_id, action, from_status, to_status, reason, created_at, profiles!subscription_events_actor_id_fkey(username)")
        .in("subscription_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <>
      <PageHeader
        title="Assinaturas"
        description="Associe planos a academias e páginas, suspenda, reative, renove ou cancele. Cada mudança fica no histórico, que não pode ser alterado."
      />
      <Card className="mb-6">
        <h2 className="mb-3 font-display text-2xl font-semibold">Nova assinatura</h2>
        <NewSubscriptionForm plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name, audience: p.audience }))} />
      </Card>

      <nav aria-label="Filtrar por situação" className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={routes.adminSubscriptions} aria-current={!status ? "page" : undefined} className="rounded-md border border-border px-3 py-2 aria-[current=page]:bg-accent-soft">
          Todas
        </Link>
        {SUBSCRIPTION_STATUSES.map((s) => (
          <Link
            key={s}
            href={`${routes.adminSubscriptions}?situacao=${s}`}
            aria-current={status === s ? "page" : undefined}
            className="rounded-md border border-border px-3 py-2 aria-[current=page]:bg-accent-soft"
          >
            {SUBSCRIPTION_STATUS_LABELS[s]}
          </Link>
        ))}
      </nav>

      {(subs ?? []).length === 0 ? (
        <p className="text-muted">Nenhuma assinatura.</p>
      ) : (
        <ul className="space-y-3">
          {(subs ?? []).map((s) => (
            <li key={s.id}>
              <Card className="p-4 sm:p-4">
                <SubscriptionActions
                  sub={{
                    id: s.id!,
                    status: s.status!,
                    planId: s.plan_id!,
                    planName: s.plan_name ?? "",
                    entityName: s.entity_name ?? "",
                    entityHref: s.entity_kind === "academy" ? routes.academy(s.entity_slug ?? "") : routes.business(s.entity_slug ?? ""),
                    entityKind: s.entity_kind === "academy" ? "academy" : "business",
                    startsOn: s.starts_on!,
                    endsOn: s.ends_on,
                    notes: s.notes,
                  }}
                  plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name, audience: p.audience }))}
                  events={((events ?? []) as unknown as SubscriptionEvent[]).filter((e) => e.subscription_id === s.id)}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
