import { BadgeCheck } from "lucide-react";
import { PLAN_FEATURES, SUBSCRIPTION_STATUS_LABELS, formatDate } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

const RELEVANT: Record<"academy" | "business", string[]> = {
  academy: ["gallery_photos", "featured_listing"],
  business: ["catalog_items", "active_promotions", "featured_listing"],
};

/**
 * Plano da academia ou página, só leitura para a gestão. Os limites mostrados vêm do banco (entitlement),
 * os mesmos que barram a escrita. Ativação é feita pela equipe: não há pagamento pelo site.
 */
export async function PlanStatusCard({ kind, entityId }: { kind: "academy" | "business"; entityId: string }) {
  const supabase = await createClient();
  const column = kind === "academy" ? "academy_id" : "business_id";
  const keys = RELEVANT[kind];
  const [{ data: subs }, limits, { data: plans }] = await Promise.all([
    supabase.from("subscription_cards").select("id, status, starts_on, ends_on, plan_name").eq(column, entityId).order("created_at", { ascending: false }).limit(5),
    Promise.all(keys.map((k) => supabase.rpc("entitlement", { p_kind: kind, p_entity: entityId, p_key: k }))),
    supabase
      .from("plans")
      .select("id, name, description, price_label, audience, plan_features(feature_key, value)")
      .eq("is_active", true)
      .in("audience", [kind, "both"])
      .order("sort_order"),
  ]);
  const current = (subs ?? []).find((s) => s.status === "active" || s.status === "suspended") ?? null;
  const features = PLAN_FEATURES.filter((f) => keys.includes(f.key));

  return (
    <Card>
      <h2 id="plano" className="mb-1 font-display text-2xl font-semibold">
        Plano
      </h2>
      {current ? (
        <p className="mb-3">
          <span className="font-semibold">{current.plan_name}</span>
          <span className="text-muted">
            {" "}
            · {SUBSCRIPTION_STATUS_LABELS[current.status!]} · desde {formatDate(current.starts_on!)}
            {current.ends_on ? ` até ${formatDate(current.ends_on)}` : " · sem prazo"}
          </span>
        </p>
      ) : (
        <p className="mb-3 text-muted">Sem plano: tudo o que já existia continua gratuito, com os limites abaixo.</p>
      )}
      {current?.status === "suspended" && (
        <p className="mb-3 rounded-md border border-warning/40 px-3 py-2 text-[13px] font-medium text-warning">
          Assinatura suspensa pela equipe: os benefícios extras estão pausados.
        </p>
      )}
      <ul className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
        {features.map((f, i) => {
          const value = limits[i]?.data ?? f.default;
          return (
            <li key={f.key} className="rounded-md border border-border px-3 py-2">
              {f.kind === "flag" ? (
                <>
                  {f.label}: <span className="font-semibold">{value > 0 ? "sim" : "não"}</span>
                </>
              ) : (
                <>
                  {f.label}: <span className="font-semibold">{value}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {(plans ?? []).length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Planos disponíveis</summary>
          <ul className="mt-2 space-y-2 text-sm">
            {(plans ?? []).map((p) => (
              <li key={p.id} className="rounded-md border border-border p-3">
                <p className="flex items-center gap-1.5 font-semibold">
                  <BadgeCheck aria-hidden className="size-4 text-accent" /> {p.name}
                  {p.price_label && <span className="font-normal text-muted"> · {p.price_label}</span>}
                </p>
                {p.description && <p className="mt-1 text-muted">{p.description}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-3 text-[13px] text-muted">
        Planos são ativados pela equipe Fighterz. Nenhum pagamento é feito pelo site. Professores não precisam de plano.
      </p>
    </Card>
  );
}
