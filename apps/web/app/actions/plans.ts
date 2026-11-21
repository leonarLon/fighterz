"use server";

import { revalidatePath } from "next/cache";
import { newSubscriptionSchema, planSchema, subscriptionReasonError, PLAN_FEATURES, type SubscriptionStatus } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  not_admin: "Só a administração pode fazer isso.",
  plan_not_found: "Plano não encontrado ou inativo.",
  plan_audience_mismatch: "Esse plano não é para esse tipo de conta (academia × página).",
  entity_not_found: "Academia ou página não encontrada.",
  subscription_exists: "Já existe uma assinatura ativa ou suspensa para essa academia ou página.",
  subscription_not_found: "Assinatura não encontrada.",
  invalid_transition: "Essa mudança de situação não é permitida.",
  reason_required: "Informe o motivo.",
  invalid_dates: "A data de fim não pode ser antes do início.",
  "23505": "Já existe um plano com esse endereço (slug).",
  "42501": "Só a administração pode fazer isso.",
};

function message(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

function revalidatePlans() {
  revalidatePath(routes.adminPlans);
  revalidatePath(routes.adminSubscriptions);
}

/** Cria ou edita um plano e substitui o conjunto de benefícios. A RLS só deixa admin. */
export async function savePlan(planId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const keys = ["slug", "name", "description", "priceLabel", "audience", "sortOrder", "isActive"];
  const values: Record<string, string> = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const features: Record<string, string> = {};
  for (const f of PLAN_FEATURES) {
    features[f.key] = text(formData, `feature-${f.key}`);
    values[`feature-${f.key}`] = features[f.key]!;
  }
  const parsed = planSchema.safeParse({ ...values, isActive: values.isActive === "on", features });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const row = { name: d.name, description: d.description, price_label: d.priceLabel, audience: d.audience, is_active: d.isActive, sort_order: d.sortOrder };
  const { data, error } = planId
    ? await supabase.from("plans").update(row).eq("id", planId).select("id")
    : await supabase.from("plans").insert({ ...row, slug: d.slug }).select("id");
  const id = data?.[0]?.id;
  if (error || !id) return { status: "error", message: message(error ?? { code: "42501" }, "Não foi possível salvar o plano."), values };

  // Sem upsert: o UPDATE de plan_features só tem grant na coluna value.
  const { error: delError } = await supabase.from("plan_features").delete().eq("plan_id", id);
  const { error: insError } = d.features.length
    ? await supabase.from("plan_features").insert(d.features.map((f) => ({ plan_id: id, feature_key: f.key, value: f.value })))
    : { error: null };
  if (delError || insError) return { status: "error", message: "Plano salvo, mas houve erro nos benefícios. Revise e salve de novo.", values };

  revalidatePlans();
  return { status: "success", message: planId ? "Plano atualizado." : "Plano criado.", values: planId ? values : undefined };
}

export async function createSubscription(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const keys = ["planId", "entityKind", "entitySlug", "startsOn", "endsOn", "notes"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const parsed = newSubscriptionSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const table = d.entityKind === "academy" ? "academies" : "businesses";
  const { data: entity } = await supabase.from(table).select("id").eq("slug", d.entitySlug).maybeSingle();
  if (!entity) return { status: "error", message: ERRORS.entity_not_found!, fieldErrors: { entitySlug: [ERRORS.entity_not_found!] }, values };

  const { error } = await supabase.rpc("admin_create_subscription", {
    p_plan: d.planId,
    p_academy: d.entityKind === "academy" ? entity.id : undefined,
    p_business: d.entityKind === "business" ? entity.id : undefined,
    p_starts_on: d.startsOn ?? undefined,
    p_ends_on: d.endsOn ?? undefined,
    p_notes: d.notes ?? undefined,
  });
  if (error) return { status: "error", message: message(error, "Não foi possível criar a assinatura."), values };
  revalidatePlans();
  return { status: "success", message: "Assinatura criada e ativa." };
}

export async function setSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus, reason: string): Promise<Result> {
  await requireUser();
  const invalid = subscriptionReasonError(status, reason);
  if (invalid) return { ok: false, message: invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_subscription_status", { p_subscription: subscriptionId, p_status: status, p_reason: reason });
  if (error) return { ok: false, message: message(error, "Não foi possível alterar a assinatura.") };
  revalidatePlans();
  const labels: Record<string, string> = { active: "Assinatura reativada.", suspended: "Assinatura suspensa.", cancelled: "Assinatura cancelada." };
  return { ok: true, message: labels[status] ?? "Assinatura atualizada." };
}

export async function changeSubscription(subscriptionId: string, planId: string, endsOn: string, reason: string): Promise<Result> {
  await requireUser();
  if (endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return { ok: false, message: "Data inválida." };
  if (reason.length > 500) return { ok: false, message: "Máximo de 500 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_change_subscription", {
    p_subscription: subscriptionId,
    p_plan: planId,
    p_ends_on: (endsOn || null) as string,
    p_reason: reason,
  });
  if (error) return { ok: false, message: message(error, "Não foi possível alterar a assinatura.") };
  revalidatePlans();
  return { ok: true, message: "Plano e validade atualizados." };
}
