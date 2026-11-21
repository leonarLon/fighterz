"use client";

import { useActionState, useState } from "react";
import { PLAN_AUDIENCES, PLAN_AUDIENCE_LABELS, PLAN_FEATURES, type PlanAudience } from "@figtherz/core";
import { savePlan } from "@/app/actions/plans";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export type PlanRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_label: string | null;
  audience: PlanAudience;
  is_active: boolean;
  sort_order: number;
  plan_features: { feature_key: string; value: number }[];
};

export function PlanForm({ plan }: { plan?: PlanRow }) {
  const [state, action, pending] = useActionState(savePlan.bind(null, plan?.id ?? null), idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const key = plan?.id.slice(0, 8) ?? "novo";
  const featureValue = (k: string) => plan?.plan_features.find((f) => f.feature_key === k)?.value;
  // Caixas controladas vão em campos ocultos: o React reinicia o form após cada envio.
  const [audience, setAudience] = useState<string>(v?.audience ?? plan?.audience ?? "both");
  const [isActive, setIsActive] = useState(v ? v.isActive === "on" : (plan?.is_active ?? true));
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PLAN_FEATURES.filter((f) => f.kind === "flag").map((f) => [f.key, v ? v[`feature-${f.key}`] === "on" : (featureValue(f.key) ?? 0) > 0])),
  );

  return (
    <form action={action} className="space-y-4" noValidate aria-label={plan ? `Editar plano ${plan.name}` : "Novo plano"}>
      <FormMessage status={state.status} message={state.message} />
      <input type="hidden" name="isActive" value={isActive ? "on" : ""} />
      <input type="hidden" name="audience" value={audience} />
      {Object.entries(flags).map(([k, on]) => (
        <input key={k} type="hidden" name={`feature-${k}`} value={on ? "on" : ""} />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id={`plan-name-${key}`} name="name" label="Nome" required maxLength={60} defaultValue={v?.name ?? plan?.name ?? ""} errors={e.name} />
        <InputField
          id={`plan-slug-${key}`}
          name="slug"
          label="Endereço (slug)"
          required
          maxLength={60}
          readOnly={Boolean(plan)}
          help={plan ? "Não muda depois de criado." : "Ex.: academia-destaque"}
          defaultValue={v?.slug ?? plan?.slug ?? ""}
          errors={e.slug}
        />
        <InputField
          id={`plan-price-${key}`}
          name="priceLabel"
          label="Preço de referência (opcional)"
          help="Só informativo. Ex.: R$ 49/mês. Nada é cobrado aqui."
          maxLength={60}
          defaultValue={v?.priceLabel ?? plan?.price_label ?? ""}
          errors={e.priceLabel}
        />
        <SelectField
          id={`plan-audience-${key}`}
          name={undefined}
          label="Para quem"
          value={audience}
          onChange={(ev) => setAudience(ev.target.value)}
          errors={e.audience}
        >
          {PLAN_AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {PLAN_AUDIENCE_LABELS[a]}
            </option>
          ))}
        </SelectField>
      </div>
      <TextareaField
        id={`plan-description-${key}`}
        name="description"
        label="Descrição (opcional)"
        rows={2}
        maxLength={1000}
        defaultValue={v?.description ?? plan?.description ?? ""}
        errors={e.description}
      />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Benefícios (vazio = valor padrão sem plano)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLAN_FEATURES.map((f) =>
            f.kind === "flag" ? (
              <label key={f.key} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={flags[f.key] ?? false}
                  onChange={(ev) => setFlags((cur) => ({ ...cur, [f.key]: ev.target.checked }))}
                  className="size-5 accent-(--primary)"
                />
                {f.label}
              </label>
            ) : (
              <InputField
                key={f.key}
                id={`plan-feature-${f.key}-${key}`}
                name={`feature-${f.key}`}
                label={f.label}
                type="number"
                min={0}
                max={10000}
                help={`Padrão sem plano: ${f.default}`}
                defaultValue={v?.[`feature-${f.key}`] ?? featureValue(f.key)?.toString() ?? ""}
                errors={e[`feature-${f.key}`]}
              />
            ),
          )}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id={`plan-sort-${key}`}
          name="sortOrder"
          label="Ordem"
          type="number"
          min={0}
          max={1000}
          defaultValue={v?.sortOrder ?? plan?.sort_order?.toString() ?? "0"}
          errors={e.sortOrder}
        />
        <label className="flex min-h-11 items-center gap-3 self-end">
          <input type="checkbox" checked={isActive} onChange={(ev) => setIsActive(ev.target.checked)} className="size-5 accent-(--primary)" />
          Plano ativo (pode ser associado)
        </label>
      </div>
      <Button type="submit" variant={plan ? "secondary" : "primary"} loading={pending}>
        {plan ? "Salvar plano" : "Criar plano"}
      </Button>
    </form>
  );
}
