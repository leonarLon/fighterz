"use server";

import { revalidatePath } from "next/cache";
import { commentSchema, createPostSchema, reportSchema, type CreatePostInput } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { loadBusinessPosts, loadExplore, loadHomeFeed, loadProfilePosts, loadSavedPosts, type Page } from "@/lib/posts";
import { routes } from "@/lib/routes";

type Result = { ok: true } | { ok: false; message: string };

const RATE_LIMITED = "Você fez isso muitas vezes em pouco tempo. Tente de novo mais tarde.";

function failure(error: { code?: string; message?: string } | null, fallback: string): { ok: false; message: string } {
  if (error?.code === "P0429") return { ok: false, message: RATE_LIMITED };
  return { ok: false, message: fallback };
}

export async function createPost(input: CreatePostInput): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  await requireUser();
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  const supabase = await createClient();
  const args = {
    p_id: data.id,
    p_caption: data.caption,
    p_visibility: data.visibility,
    p_martial_art_id: data.martialArtId ?? undefined,
    p_location_label: data.locationLabel ?? undefined,
    p_media: data.media.map((m) => ({
      type: m.type,
      path: m.path,
      thumbnail: m.thumbnail ?? "",
      duration_ms: m.durationMs ?? null,
      width: m.width,
      height: m.height,
      size: m.size,
      alt: m.alt ?? "",
    })),
  };
  const { error } = data.businessId
    ? await supabase.rpc("create_page_post", { ...args, p_business: data.businessId })
    : await supabase.rpc("create_post", args);
  if (error?.message === "not_business_manager") return { ok: false, message: "Você não gerencia essa página." };
  if (error?.message === "business_not_active") return { ok: false, message: "A página está oculta. Publique a página antes." };
  if (error) return failure(error, "Não foi possível publicar. Tente novamente.");

  revalidatePath(routes.feed);
  return { ok: true, id: data.id };
}

export async function deletePost(postId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_post", { p_post_id: postId });
  if (error) return failure(error, "Não foi possível apagar o post.");
  revalidatePath(routes.feed);
  return { ok: true };
}

/** Idempotente: curtir duas vezes não duplica (PK composta + ON CONFLICT). */
export async function setLike(postId: string, liked: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = liked
    ? await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true })
    : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  return error ? failure(error, "Não foi possível curtir agora.") : { ok: true };
}

export async function setSaved(postId: string, saved: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = saved
    ? await supabase.from("saved_posts").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true })
    : await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
  return error ? failure(error, "Não foi possível salvar agora.") : { ok: true };
}

export async function setCommentLike(commentId: string, liked: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = liked
    ? await supabase.from("comment_likes").upsert({ comment_id: commentId, user_id: user.id }, { ignoreDuplicates: true })
    : await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
  return error ? failure(error, "Não foi possível curtir agora.") : { ok: true };
}

export async function addComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = commentSchema.safeParse({
    postId: text(formData, "postId"),
    parentId: text(formData, "parentId"),
    body: text(formData, "body"),
  });
  if (!parsed.success) return fromZodError(parsed.error, { body: text(formData, "body") });

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    post_id: parsed.data.postId,
    parent_id: parsed.data.parentId,
    author_id: user.id,
    body: parsed.data.body,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "P0429" ? RATE_LIMITED : "Não foi possível comentar neste post.",
      values: { body: parsed.data.body },
    };
  }
  revalidatePath(`/p/${parsed.data.postId}`);
  return { status: "success" };
}

export async function deleteComment(commentId: string, postId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_comment", { p_comment_id: commentId });
  if (error) return failure(error, "Não foi possível apagar o comentário.");
  revalidatePath(`/p/${postId}`);
  return { ok: true };
}

export async function reportContent(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = reportSchema.safeParse({
    targetType: text(formData, "targetType"),
    targetId: text(formData, "targetId"),
    reason: text(formData, "reason"),
    details: text(formData, "details"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });
  if (error && error.code !== "23505") {
    return { status: "error", message: error.code === "P0429" ? RATE_LIMITED : "Não foi possível enviar a denúncia." };
  }
  // Denúncia repetida (23505) recebe a mesma resposta: já está na fila.
  return { status: "success", message: "Denúncia enviada. Obrigado por ajudar a manter a comunidade segura." };
}

// ---------------------------------------------------------------------------
// Paginação (chamadas pelos componentes de lista no cliente)
// ---------------------------------------------------------------------------
export async function loadMoreHomeFeed(cursor: string): Promise<Page> {
  await requireUser();
  return loadHomeFeed(await createClient(), cursor);
}

export async function loadMoreProfilePosts(authorId: string, cursor: string): Promise<Page> {
  return loadProfilePosts(await createClient(), authorId, cursor);
}

export async function loadMoreBusinessPosts(businessId: string, cursor: string): Promise<Page> {
  return loadBusinessPosts(await createClient(), businessId, cursor);
}

export async function loadMoreSaved(cursor: string): Promise<Page> {
  await requireUser();
  return loadSavedPosts(await createClient(), cursor);
}

export async function loadMoreExplore(cursor: string): Promise<Page> {
  const page = Number.parseInt(cursor, 10);
  return loadExplore(await createClient(), Number.isFinite(page) && page > 0 ? Math.min(page, 50) : 0);
}
