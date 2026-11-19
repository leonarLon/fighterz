"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type Result = { ok: true; status?: "accepted" | "pending" } | { ok: false; message: string };

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Segue (perfil público) ou envia solicitação (perfil privado). O banco decide o status.
 * `refresh: false` evita revalidar: no Next, revalidar numa action re-renderiza a página atual, e as
 * sugestões do Início vazio sumiriam no primeiro follow.
 */
export async function follow(targetId: string, { refresh = true }: { refresh?: boolean } = {}): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(targetId) || targetId === user.id) return { ok: false, message: "Perfil inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
  if (error && error.code !== "23505") {
    return { ok: false, message: error.code === "P0429" ? "Limite diário de follows atingido." : "Não foi possível seguir." };
  }
  const { data } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();
  if (refresh) revalidatePath("/u/[username]", "page");
  return { ok: true, status: data?.status ?? "pending" };
}

/** Deixar de seguir ou cancelar a solicitação. */
export async function unfollow(targetId: string, { refresh = true }: { refresh?: boolean } = {}): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
  if (refresh) revalidatePath("/u/[username]", "page");
  return error ? { ok: false, message: "Não foi possível deixar de seguir." } : { ok: true };
}

/** Aceitar ou recusar quem pediu para me seguir. */
export async function respondFollowRequest(followerId: string, accept: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const query = supabase.from("follows");
  const { error } = accept
    ? await query.update({ status: "accepted" }).eq("follower_id", followerId).eq("following_id", user.id)
    : await query.delete().eq("follower_id", followerId).eq("following_id", user.id);
  // Sem revalidar: a lista atualiza localmente (a notificação de solicitação some ao aceitar).
  return error ? { ok: false, message: "Não foi possível responder à solicitação." } : { ok: true };
}

/** Remover alguém que me segue (a RLS permite à parte seguida apagar a linha). */
export async function removeFollower(followerId: string): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(followerId) || followerId === user.id) return { ok: false, message: "Perfil inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", user.id);
  // Sem revalidar: a linha some localmente da lista.
  return error ? { ok: false, message: "Não foi possível remover o seguidor." } : { ok: true };
}

export async function setBlocked(targetId: string, blocked: boolean): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(targetId) || targetId === user.id) return { ok: false, message: "Perfil inválido." };
  const supabase = await createClient();
  const { error } = blocked
    ? await supabase.from("blocked_users").upsert({ blocker_id: user.id, blocked_id: targetId }, { ignoreDuplicates: true })
    : await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", targetId);
  revalidatePath("/u/[username]", "page");
  return error ? { ok: false, message: "Não foi possível concluir." } : { ok: true };
}

/** Aprovar ou recusar uma marcação em post de outra pessoa. */
export async function respondMention(postId: string, approve: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("post_mentions")
    .update({ status: approve ? "approved" : "rejected" })
    .eq("post_id", postId)
    .eq("user_id", user.id);
  // Sem revalidar: a lista de notificações atualiza localmente.
  return error ? { ok: false, message: "Não foi possível responder à marcação." } : { ok: true };
}

export async function markNotificationsRead(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");
}
