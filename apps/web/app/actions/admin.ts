"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ReportTarget } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";

type Result = { ok: true; message?: string } | { ok: false; message: string };

// O banco decide quem pode o quê (has_role nas funções). Aqui só traduzimos os erros.
const ERRORS: Record<string, string> = {
  forbidden: "Você não tem permissão para isso.",
  admin_only: "Só administradores podem fazer isso.",
  cannot_moderate_peer: "Você não pode moderar alguém com papel igual ou maior que o seu.",
  reason_required: "Informe o motivo.",
  user_not_found: "Usuário não encontrado.",
  user_not_suspended: "Essa conta não está suspensa.",
  target_not_found: "Conteúdo não encontrado.",
  event_cannot_be_restored: "Evento cancelado não pode ser restaurado.",
  invalid_days: "Prazo inválido.",
  "42501": "Você não tem permissão para isso.",
  "23505": "Já existe um registro com esses dados.",
};

function message(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

// ---------------------------------------------------------------------------
// Denúncias e conteúdo
// ---------------------------------------------------------------------------
export async function moderateContent(targetType: ReportTarget, targetId: string, remove: boolean, reason: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_content", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_remove: remove,
    p_reason: reason,
  });
  if (error) return { ok: false, message: message(error, "Não foi possível aplicar a decisão.") };
  return { ok: true, message: remove ? "Conteúdo removido e denúncias resolvidas." : "Conteúdo restaurado." };
}

export async function closeReports(targetType: ReportTarget, targetId: string, dismiss: boolean, reason: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_reports", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_dismiss: dismiss,
    p_reason: reason,
  });
  if (error) return { ok: false, message: message(error, "Não foi possível fechar as denúncias.") };
  return { ok: true, message: dismiss ? "Denúncias descartadas." : "Denúncias marcadas como resolvidas." };
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------
export async function suspendUser(userId: string, days: number | null, reason: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("suspend_user", { p_user: userId, p_days: days as number, p_reason: reason });
  if (error) return { ok: false, message: message(error, "Não foi possível suspender.") };
  return { ok: true, message: days ? `Conta suspensa por ${days} ${days === 1 ? "dia" : "dias"}.` : "Conta banida." };
}

export async function unsuspendUser(userId: string, reason: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("unsuspend_user", { p_user: userId, p_reason: reason || undefined });
  if (error) return { ok: false, message: message(error, "Não foi possível reativar.") };
  return { ok: true, message: "Conta reativada." };
}

/** Papéis da plataforma: só superadmin (política de user_roles). Alterações vão para a auditoria. */
export async function setPlatformRole(userId: string, role: "moderator" | "admin" | "superadmin", grant: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = grant
    ? await supabase.from("user_roles").insert({ user_id: userId, role, granted_by: user.id }).select("user_id")
    : await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role).select("user_id");
  if (error) return { ok: false, message: message(error, "Não foi possível alterar o papel.") };
  if (!data?.length) return { ok: false, message: "Só superadmins alteram papéis." };
  return { ok: true, message: grant ? "Papel concedido." : "Papel removido." };
}

// ---------------------------------------------------------------------------
// Academias
// ---------------------------------------------------------------------------
export async function setAcademyVerified(academyId: string, verified: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_academy_verified", { p_academy: academyId, p_verified: verified });
  if (error) return { ok: false, message: message(error, "Não foi possível alterar o selo.") };
  return { ok: true, message: verified ? "Academia verificada." : "Selo removido." };
}

export async function setBusinessVerified(businessId: string, verified: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_business_verified", { p_business: businessId, p_verified: verified });
  if (error) return { ok: false, message: message(error, "Não foi possível alterar o selo.") };
  return { ok: true, message: verified ? "Página verificada." : "Selo removido." };
}

// ---------------------------------------------------------------------------
// Modalidades e graduações (RLS: só admin escreve; a auditoria registra por trigger)
// ---------------------------------------------------------------------------
const martialArtSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(60, "Máximo de 60 caracteres."),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens (ex.: jiu-jitsu)."),
  hasRanks: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export async function createMartialArt(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = { name: text(formData, "name"), slug: text(formData, "slug"), sortOrder: text(formData, "sortOrder") };
  const parsed = martialArtSchema.safeParse({ ...values, hasRanks: formData.get("hasRanks") === "on" });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const supabase = await createClient();
  const { error } = await supabase.from("martial_arts").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    has_ranks: parsed.data.hasRanks,
    sort_order: parsed.data.sortOrder,
  });
  if (error) return { status: "error", message: message(error, "Não foi possível criar a modalidade."), values };
  revalidatePath("/admin/modalidades");
  return { status: "success", message: "Modalidade criada." };
}

export async function setMartialArtActive(id: string, active: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("martial_arts").update({ is_active: active }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, message: message(error, "Só administradores alteram modalidades.") };
  revalidatePath("/admin/modalidades");
  return { ok: true, message: active ? "Modalidade ativada." : "Modalidade desativada (some das buscas e formulários)." };
}

const rankSchema = z.object({
  martialArtId: z.uuid(),
  name: z.string().trim().min(1, "Informe o nome.").max(60, "Máximo de 60 caracteres."),
  color: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.union([z.string().regex(/^#[0-9A-F]{6}$/, "Cor no formato #RRGGBB."), z.literal("")]))
    .transform((v) => v || null),
  maxDegrees: z.coerce.number().int().min(0, "De 0 a 10.").max(10, "De 0 a 10."),
});

export async function addRank(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = {
    martialArtId: text(formData, "martialArtId"),
    name: text(formData, "name"),
    color: text(formData, "color"),
    maxDegrees: text(formData, "maxDegrees"),
  };
  const parsed = rankSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("martial_art_ranks")
    .select("ordinal")
    .eq("martial_art_id", parsed.data.martialArtId)
    .eq("track", "adult")
    .order("ordinal", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("martial_art_ranks").insert({
    martial_art_id: parsed.data.martialArtId,
    name: parsed.data.name,
    color_hex: parsed.data.color,
    max_degrees: parsed.data.maxDegrees,
    ordinal: (last?.ordinal ?? 0) + 1,
  });
  if (error) return { status: "error", message: message(error, "Não foi possível adicionar a graduação."), values };
  revalidatePath("/admin/modalidades");
  return { status: "success", message: "Graduação adicionada ao fim da lista." };
}

// ---------------------------------------------------------------------------
// Configurações da plataforma
// ---------------------------------------------------------------------------
export async function savePlatformSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { announcement: text(formData, "announcement") };
  const parsed = z
    .object({ announcement: z.string().trim().max(280, "Máximo de 280 caracteres.") })
    .safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .update({
      signups_open: formData.get("signupsOpen") === "on",
      announcement: parsed.data.announcement || null,
      updated_by: user.id,
    })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { status: "error", message: "Só administradores alteram as configurações.", values };
  revalidatePath("/", "layout");
  return { status: "success", message: "Configurações salvas.", values };
}

// ---------------------------------------------------------------------------
// Limpeza de arquivos (fila preenchida pelo pg_cron: posts apagados há 30+ dias e uploads órfãos)
// ---------------------------------------------------------------------------
export async function processCleanupQueue(): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("has_role", { p_role: "admin" });
  if (!isAdmin) return { ok: false, message: ERRORS.admin_only! };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Configure SUPABASE_SECRET_KEY no servidor para apagar arquivos (veja DEPLOYMENT.md)." };

  const { data: queue, error } = await admin.from("storage_cleanup_queue").select("bucket_id, object_name").limit(500);
  if (error) return { ok: false, message: "Não foi possível ler a fila." };
  let removed = 0;
  for (const bucket of new Set((queue ?? []).map((q) => q.bucket_id))) {
    const names = (queue ?? []).filter((q) => q.bucket_id === bucket).map((q) => q.object_name);
    const { error: removeError } = await admin.storage.from(bucket).remove(names);
    if (removeError) continue;
    await admin.from("storage_cleanup_queue").delete().eq("bucket_id", bucket).in("object_name", names);
    removed += names.length;
  }
  return { ok: true, message: removed ? `${removed} arquivos apagados do Storage.` : "Nada para limpar." };
}
