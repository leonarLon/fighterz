"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  forbidden: "Só a moderação pode fazer isso.",
  review_not_found: "Revisão não encontrada.",
  review_already_decided: "Essa revisão já foi decidida.",
  cannot_moderate_peer: "Você não pode moderar alguém da equipe com papel igual ou maior.",
  reason_required: "Informe o motivo (mínimo 3 caracteres).",
  invalid_decision: "Decisão inválida.",
  appeal_not_found: "Recurso não encontrado.",
  appeal_already_decided: "Esse recurso já foi decidido.",
  appeal_exists: "Você já enviou um recurso para essa revisão.",
  message_too_short: "Explique em pelo menos 10 caracteres.",
  P0429: "Muitas tentativas em pouco tempo. Tente de novo mais tarde.",
};

function message(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

export async function decideCommercialReview(reviewId: string, decision: "dismiss" | "warn" | "remove_posts", note: string): Promise<Result> {
  await requireUser();
  if (note.length > 1000) return { ok: false, message: "Máximo de 1000 caracteres." };
  if (decision !== "dismiss" && note.trim().length < 3) return { ok: false, message: ERRORS.reason_required! };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_commercial_review", { p_review: reviewId, p_decision: decision, p_note: note });
  if (error) return { ok: false, message: message(error, "Não foi possível registrar a decisão.") };
  revalidatePath(routes.adminCommercial);
  const labels = { dismiss: "Revisão arquivada: não era publicidade.", warn: "Pessoa avisada.", remove_posts: "Posts removidos e pessoa avisada." };
  return { ok: true, message: labels[decision] };
}

export async function createCommercialAppeal(reviewId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const value = text(formData, "message").trim();
  const values = { message: value };
  if (value.length < 10) return { status: "error", message: ERRORS.message_too_short!, fieldErrors: { message: [ERRORS.message_too_short!] }, values };
  if (value.length > 1000) return { status: "error", message: "Máximo de 1000 caracteres.", fieldErrors: { message: ["Máximo de 1000 caracteres."] }, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_commercial_appeal", { p_review: reviewId, p_message: value });
  if (error) return { status: "error", message: message(error, "Não foi possível enviar o recurso."), values };
  revalidatePath(routes.commercialReviews);
  return { status: "success", message: "Recurso enviado. A moderação vai responder por notificação." };
}

export async function decideCommercialAppeal(appealId: string, accept: boolean, response: string): Promise<Result> {
  await requireUser();
  if (response.trim().length < 3) return { ok: false, message: ERRORS.reason_required! };
  if (response.length > 1000) return { ok: false, message: "Máximo de 1000 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_commercial_appeal", { p_appeal: appealId, p_accept: accept, p_response: response });
  if (error) return { ok: false, message: message(error, "Não foi possível registrar a decisão.") };
  revalidatePath(routes.adminCommercial);
  return { ok: true, message: accept ? "Recurso aceito: decisão desfeita." : "Recurso negado." };
}
