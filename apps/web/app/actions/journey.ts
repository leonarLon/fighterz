"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  achievementSchema,
  checkinSchema,
  isValidDegree,
  journeyArtSchema,
  journeyPrivacySchema,
  promotionSchema,
} from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  P0429: "Limite atingido por hoje. Tente de novo amanhã.",
  "23505": "Essa modalidade já está na sua jornada.",
  degree_exceeds_max: "Essa graduação não aceita tantos graus.",
  rank_not_in_martial_art: "A graduação não pertence a essa modalidade.",
  promoted_on_in_future: "A data da graduação não pode ser no futuro.",
  teacher_not_approved: "Essa pessoa não é professor aprovado na plataforma.",
  trained_at_in_future: "O treino não pode ser no futuro.",
  trained_at_too_old: "Esse treino é antigo demais para registrar.",
  class_not_in_academy: "A aula escolhida não é dessa academia.",
  academy_not_found: "Academia não encontrada.",
  martial_art_not_found: "Escolha a modalidade.",
  achieved_on_in_future: "A data não pode ser no futuro.",
  started_on_in_future: "O início não pode ser no futuro.",
  not_the_teacher: "Só o professor indicado pode confirmar.",
};

function message(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

function values(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
}

// ---------------------------------------------------------------------------
// Modalidades e graduações
// ---------------------------------------------------------------------------
export async function addJourneyArt(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const v = values(formData, ["martialArtId", "startedOn", "federation"]);
  const parsed = journeyArtSchema.safeParse(v);
  if (!parsed.success) return fromZodError(parsed.error, v);

  const supabase = await createClient();
  const { error } = await supabase.from("user_martial_arts").insert({
    user_id: user.id,
    martial_art_id: parsed.data.martialArtId,
    started_on: parsed.data.startedOn,
    federation: parsed.data.federation,
  });
  if (error) return { status: "error", message: message(error, "Não foi possível adicionar a modalidade."), values: v };
  revalidatePath(routes.journey);
  return { status: "success", message: "Modalidade adicionada. Agora registre sua graduação." };
}

export async function removeJourneyArt(id: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("user_martial_arts").delete().eq("id", id);
  if (error) return { ok: false, message: "Não foi possível remover." };
  revalidatePath(routes.journey);
  return { ok: true };
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Texto da graduação atual depois de salvar, para a pessoa ver na hora qual ficou valendo. */
async function currentRankLabel(supabase: Awaited<ReturnType<typeof createClient>>, userMartialArtId: string) {
  const { data } = await supabase
    .from("journey_cards")
    .select("martial_art_name, rank_name, current_degree")
    .eq("id", userMartialArtId)
    .maybeSingle();
  if (!data?.rank_name) return "";
  const degrees = data.current_degree ? ` · ${data.current_degree} ${data.current_degree === 1 ? "grau" : "graus"}` : "";
  return ` Graduação atual em ${data.martial_art_name}: ${data.rank_name}${degrees}.`;
}

/** Registra uma graduação nova ou, com `promotionId`, corrige um registro existente. */
export async function addPromotion(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const v = values(formData, ["userMartialArtId", "rankId", "degree", "promotedOn", "academyId", "teacherUsername", "notes"]);
  const promotionId = text(formData, "promotionId");
  if (promotionId && !UUID.test(promotionId)) return { status: "error", message: "Registro inválido.", values: v };
  const parsed = promotionSchema.safeParse(v);
  if (!parsed.success) return fromZodError(parsed.error, v);
  const d = parsed.data;

  const supabase = await createClient();
  // Mensagem amigável antes do banco (que valida de novo).
  const { data: rank } = await supabase.from("martial_art_ranks").select("name, max_degrees").eq("id", d.rankId).maybeSingle();
  if (rank && !isValidDegree(d.degree, rank.max_degrees)) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: { degree: [rank.max_degrees === 0 ? `${rank.name} não tem graus.` : `${rank.name} vai até ${rank.max_degrees} graus.`] },
      values: v,
    };
  }

  let teacherId: string | null = null;
  if (d.teacherUsername) {
    const { data: teacher } = await supabase.from("teacher_cards").select("user_id").eq("username", d.teacherUsername).maybeSingle();
    if (!teacher) {
      return {
        status: "error",
        message: "Revise os campos destacados.",
        fieldErrors: { teacherUsername: ["Professor não encontrado. Use o @ de um professor aprovado."] },
        values: v,
      };
    }
    teacherId = teacher.user_id;
  }

  const fields = {
    rank_id: d.rankId,
    degree: d.degree,
    promoted_on: d.promotedOn,
    academy_id: d.academyId,
    teacher_id: teacherId,
    notes: d.notes,
  };
  // RLS: só o dono escreve. No update, `.select()` devolve vazio se o registro não for da pessoa.
  const { data: saved, error } = promotionId
    ? await supabase.from("rank_promotions").update(fields).eq("id", promotionId).eq("user_martial_art_id", d.userMartialArtId).select("id")
    : await supabase.from("rank_promotions").insert({ ...fields, user_martial_art_id: d.userMartialArtId, user_id: user.id }).select("id");
  if (error) return { status: "error", message: message(error, "Não foi possível salvar a graduação."), values: v };
  if (!saved?.length) return { status: "error", message: "Registro não encontrado.", values: v };
  revalidatePath(routes.journey);
  revalidatePath("/u/[username]", "page");
  const current = await currentRankLabel(supabase, d.userMartialArtId);
  const base = promotionId ? "Graduação corrigida." : "Graduação registrada.";
  const teacherNote = teacherId ? " O professor vai receber o pedido de confirmação." : "";
  return { status: "success", message: `${base}${current}${teacherNote}` };
}

export async function deletePromotion(id: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("rank_promotions").delete().eq("id", id);
  if (error) return { ok: false, message: "Não foi possível apagar." };
  revalidatePath(routes.journey);
  return { ok: true };
}

/** Professor confirma ou recusa. Sem revalidar: o item mostra o resultado (padrão da Fase 4). */
export async function confirmPromotion(id: string, confirm: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_promotion", { p_promotion: id, p_confirm: confirm });
  if (error) return { ok: false, message: message(error, "Não foi possível responder.") };
  return { ok: true, message: confirm ? "Graduação confirmada." : "Indicação recusada." };
}

// ---------------------------------------------------------------------------
// Conquistas
// ---------------------------------------------------------------------------
export async function addAchievement(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const v = values(formData, ["martialArtId", "type", "title", "eventName", "placement", "medal", "division", "achievedOn", "evidenceUrl"]);
  const parsed = achievementSchema.safeParse(v);
  if (!parsed.success) return fromZodError(parsed.error, v);
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("athlete_achievements").insert({
    martial_art_id: d.martialArtId,
    type: d.type,
    title: d.title,
    event_name: d.eventName,
    placement: d.placement,
    medal: d.medal,
    division: d.division,
    achieved_on: d.achievedOn,
    evidence_url: d.evidenceUrl,
  });
  if (error) return { status: "error", message: message(error, "Não foi possível salvar a conquista."), values: v };
  revalidatePath(routes.journey);
  return { status: "success", message: "Conquista registrada." };
}

export async function deleteAchievement(id: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("athlete_achievements").delete().eq("id", id);
  if (error) return { ok: false, message: "Não foi possível apagar." };
  revalidatePath(routes.journey);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Registro de treino
// ---------------------------------------------------------------------------
export async function createCheckin(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const v = values(formData, ["martialArtId", "trainedAt", "durationMin", "notes", "academyId", "classScheduleId", "visibility"]);
  const parsed = checkinSchema.safeParse({ ...v, share: formData.get("share") === "on" });
  if (!parsed.success) return fromZodError(parsed.error, v);
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_checkin", {
    p_trained_at: d.trainedAt,
    p_martial_art_id: d.martialArtId ?? undefined,
    p_duration_min: d.durationMin ?? undefined,
    p_notes: d.notes ?? undefined,
    p_academy_id: d.academyId ?? undefined,
    p_class_schedule_id: d.classScheduleId ?? undefined,
    p_share: d.share,
    p_visibility: d.visibility,
  });
  if (error) return { status: "error", message: message(error, "Não foi possível registrar o treino."), values: v };
  revalidatePath(routes.journey);
  if (d.share) revalidatePath(routes.feed);
  redirect(`${routes.journey}?treino=registrado#treinos`);
}

export async function deleteCheckin(id: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("training_checkins").delete().eq("id", id);
  if (error) return { ok: false, message: "Não foi possível apagar." };
  revalidatePath(routes.journey);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Privacidade da jornada
// ---------------------------------------------------------------------------
export async function saveJourneyPrivacy(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const v = values(formData, ["showRanks", "showAchievements", "showCheckins"]);
  const parsed = journeyPrivacySchema.safeParse(v);
  if (!parsed.success) return fromZodError(parsed.error, v);

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({
      show_ranks: parsed.data.showRanks,
      show_achievements: parsed.data.showAchievements,
      show_checkins: parsed.data.showCheckins,
    })
    .eq("user_id", user.id);
  if (error) return { status: "error", message: "Não foi possível salvar a privacidade.", values: v };
  return { status: "success", message: "Privacidade da jornada salva.", values: v };
}
