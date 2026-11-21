import type { Metadata } from "next";
import { PLAN_AUDIENCE_LABELS, PLAN_FEATURES } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "../access";
import { PlanForm, type PlanRow } from "./plan-form";

export const metadata: Metadata = { title: "Planos · Administração" };

// Planos são catálogo informativo: preço é texto de referência e nada é cobrado pela plataforma.
export default async function AdminPlansPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, slug, name, description, price_label, audience, is_active, sort_order, plan_features(feature_key, value)")
    .order("sort_order")
    .order("name");
  const plans = (data ?? []) as unknown as PlanRow[];

  return (
    <>
      <PageHeader
        title="Planos"
        description="Benefícios para academias e páginas comerciais. Sem cobrança na plataforma: o preço é só referência e a ativação é feita em Assinaturas. Professores nunca precisam de plano."
      />
      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold">
                {plan.name} {!plan.is_active && <span className="text-sm font-normal text-muted">(inativo)</span>}
              </h2>
              <p className="text-sm text-muted">
                {PLAN_AUDIENCE_LABELS[plan.audience]}
                {plan.price_label ? ` · ${plan.price_label}` : ""}
              </p>
            </div>
            <ul className="mb-3 flex flex-wrap gap-2 text-sm">
              {PLAN_FEATURES.map((f) => {
                const value = plan.plan_features.find((pf) => pf.feature_key === f.key)?.value;
                if (value === undefined) return null;
                return (
                  <li key={f.key} className="rounded-sm border border-border px-2 py-1">
                    {f.kind === "flag" ? f.label : `${f.label}: ${value}`}
                  </li>
                );
              })}
            </ul>
            <details>
              <summary className="cursor-pointer font-semibold">Editar {plan.name}</summary>
              <div className="mt-3">
                <PlanForm plan={plan} />
              </div>
            </details>
          </Card>
        ))}
        <Card>
          <h2 className="mb-3 font-display text-2xl font-semibold">Novo plano</h2>
          <PlanForm />
        </Card>
      </div>
    </>
  );
}
