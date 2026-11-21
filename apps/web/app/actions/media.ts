"use server";

import { revalidatePath } from "next/cache";
import { coverPathPattern } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { COVERS_BUCKET, type CoverEntity } from "@/lib/covers";
import { routes } from "@/lib/routes";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  gallery_limit: "A galeria chegou ao limite de fotos. Apague uma para adicionar outra.",
  cover_not_uploaded: "O arquivo não chegou ao servidor. Tente de novo.",
  account_suspended: "Sua conta está suspensa.",
  "42501": "Você não tem permissão para alterar esta página.",
  "23514": "Arquivo inválido.",
};

function message(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

async function revalidateEntity(entity: CoverEntity, id: string) {
  const supabase = await createClient();
  const table = entity === "academy" ? "academies" : "businesses";
  const { data } = await supabase.from(table).select("slug").eq("id", id).maybeSingle();
  if (!data?.slug) return;
  if (entity === "academy") {
    revalidatePath(routes.academy(data.slug));
    revalidatePath(routes.manageAcademy(data.slug));
  } else {
    revalidatePath(routes.business(data.slug));
    revalidatePath(routes.manageBusiness(data.slug));
  }
}

/** Grava logo ou banner (já enviado ao bucket) e apaga o arquivo anterior. O banco confere pasta e permissão. */
export async function setCoverImage(entity: CoverEntity, id: string, slot: "logo" | "banner", path: string | null): Promise<Result> {
  await requireUser();
  if (path !== null && !coverPathPattern(entity, id, slot).test(path)) return { ok: false, message: "Arquivo inválido." };
  const column = slot === "logo" ? "logo_path" : "cover_path";
  const supabase = await createClient();
  const table = entity === "academy" ? "academies" : "businesses";
  const patch = slot === "logo" ? { logo_path: path } : { cover_path: path };
  const { data: current } = await supabase.from(table).select("logo_path, cover_path").eq("id", id).maybeSingle();
  const { data, error } =
    entity === "academy"
      ? await supabase.from("academies").update(patch).eq("id", id).select("id")
      : await supabase.from("businesses").update(patch).eq("id", id).select("id");
  if (error) return { ok: false, message: message(error, "Não foi possível salvar a imagem.") };
  if (!data?.length) return { ok: false, message: ERRORS["42501"]! };
  const previous = current?.[column];
  if (previous && previous !== path) await supabase.storage.from(COVERS_BUCKET).remove([previous]);
  await revalidateEntity(entity, id);
  return { ok: true, message: path ? (slot === "logo" ? "Logo atualizado." : "Banner atualizado.") : "Imagem removida." };
}

export async function addAcademyPhoto(
  academyId: string,
  photo: { path: string; caption: string; width: number; height: number },
): Promise<Result> {
  await requireUser();
  if (!coverPathPattern("academy", academyId, "gallery").test(photo.path)) return { ok: false, message: "Arquivo inválido." };
  const caption = photo.caption.trim().slice(0, 200);
  const supabase = await createClient();
  const { error } = await supabase.from("academy_photos").insert({
    academy_id: academyId,
    path: photo.path,
    caption: caption || null,
    width: Math.round(photo.width),
    height: Math.round(photo.height),
  });
  if (error) {
    // Sem a linha, o arquivo enviado ficaria órfão.
    await supabase.storage.from(COVERS_BUCKET).remove([photo.path]);
    return { ok: false, message: message(error, "Não foi possível adicionar a foto.") };
  }
  await revalidateEntity("academy", academyId);
  return { ok: true, message: "Foto adicionada à galeria." };
}

export async function deleteAcademyPhoto(academyId: string, photoId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("academy_photos").delete().eq("id", photoId).eq("academy_id", academyId).select("path");
  if (error || !data?.length) return { ok: false, message: message(error, "Não foi possível apagar a foto.") };
  await supabase.storage.from(COVERS_BUCKET).remove(data.map((d) => d.path));
  await revalidateEntity("academy", academyId);
  return { ok: true, message: "Foto apagada." };
}
