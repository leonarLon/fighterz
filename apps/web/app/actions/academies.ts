"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { academySchema, classSchema, inviteSchema, unitSchema } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  P0429: "Muitas tentativas em pouco tempo. Tente de novo mais tarde.",
  teacher_not_approved: "Essa pessoa ainda não tem perfil de professor aprovado.",
  user_not_found: "Usuário não encontrado.",
  last_owner: "Você é o único responsável. Adicione outro responsável antes de sair.",
  cannot_remove_owner: "Responsáveis só saem por conta própria.",
  teacher_not_active_in_academy: "Esse professor não tem vínculo ativo com a academia.",
  unit_not_in_academy: "A unidade não pertence a esta academia.",
  forbidden: "Você não tem permissão para isso.",
};

function message(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

function martialArtIds(formData: FormData) {
  return formData.getAll("martialArtIds").filter((v): v is string => typeof v === "string");
}

async function slugOf(academyId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("academies").select("slug").eq("id", academyId).maybeSingle();
  return data?.slug ?? null;
}

function revalidateAcademy(slug: string | null) {
  if (!slug) return;
  revalidatePath(routes.academy(slug));
  revalidatePath(routes.manageAcademy(slug));
}

// ---------------------------------------------------------------------------
// Academia
// ---------------------------------------------------------------------------
export async function createAcademy(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = { name: text(formData, "name"), description: text(formData, "description") };
  const parsed = academySchema.safeParse({ ...values, martialArtIds: martialArtIds(formData) });
  if (!parsed.success) return fromZodError(parsed.error, values);

  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("create_academy", {
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? undefined,
    p_martial_art_ids: parsed.data.martialArtIds,
  });
  if (error || !slug) return { status: "error", message: message(error, "Não foi possível criar a academia."), values };
  redirect(routes.manageAcademy(slug));
}

export async function updateAcademy(academyId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = Object.fromEntries(
    ["name", "description", "website", "instagram", "contactEmail", "contactPhone"].map((k) => [k, text(formData, k)]),
  );
  const parsed = academySchema.safeParse({ ...values, martialArtIds: martialArtIds(formData) });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("academies")
    .update({
      name: d.name,
      description: d.description,
      website: d.website,
      instagram: d.instagram,
      contact_email: d.contactEmail,
      contact_phone: d.contactPhone,
    })
    .eq("id", academyId);
  if (error) return { status: "error", message: message(error, "Não foi possível salvar."), values };

  // Modalidades: substitui o conjunto (RLS garante que só a gestão altera).
  await supabase.from("academy_martial_arts").delete().eq("academy_id", academyId).not("martial_art_id", "in", `(${d.martialArtIds.join(",")})`);
  await supabase
    .from("academy_martial_arts")
    .upsert(d.martialArtIds.map((id) => ({ academy_id: academyId, martial_art_id: id })), { ignoreDuplicates: true });

  revalidateAcademy(await slugOf(academyId));
  return { status: "success", message: "Dados da academia salvos.", values };
}

export async function setAcademyVisibility(academyId: string, visible: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("academies").update({ status: visible ? "active" : "hidden" }).eq("id", academyId);
  revalidateAcademy(await slugOf(academyId));
  return error ? { ok: false, message: message(error, "Não foi possível alterar a visibilidade.") } : { ok: true };
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------
export async function saveUnit(academyId: string, unitId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const keys = ["name", "postalCode", "street", "number", "complement", "neighborhood", "city", "state", "referencePoint", "latitude", "longitude", "coordsSource"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const parsed = unitSchema.safeParse({
    ...values,
    latitude: values.latitude || null,
    longitude: values.longitude || null,
    coordsSource: values.coordsSource || null,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;
  const row = {
    name: d.name,
    postal_code: d.postalCode,
    street: d.street,
    number: d.number,
    complement: d.complement,
    neighborhood: d.neighborhood,
    city: d.city,
    state: d.state,
    reference_point: d.referencePoint,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    coords_source: d.latitude == null ? null : (d.coordsSource ?? "manual"),
    is_active: d.isActive,
  };

  const supabase = await createClient();
  const { error } = unitId
    ? await supabase.from("academy_units").update(row).eq("id", unitId).eq("academy_id", academyId)
    : await supabase.from("academy_units").insert({ ...row, academy_id: academyId });
  if (error) return { status: "error", message: message(error, "Não foi possível salvar a unidade."), values };

  revalidateAcademy(await slugOf(academyId));
  return { status: "success", message: unitId ? "Unidade atualizada." : "Unidade criada." };
}

export async function deleteUnit(academyId: string, unitId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("academy_units").delete().eq("id", unitId).eq("academy_id", academyId);
  revalidateAcademy(await slugOf(academyId));
  return error ? { ok: false, message: message(error, "Não foi possível remover a unidade.") } : { ok: true };
}

// ---------------------------------------------------------------------------
// Grade
// ---------------------------------------------------------------------------
export async function saveClass(academyId: string, classId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const keys = ["unitId", "martialArtId", "teacherId", "name", "level", "weekday", "startsAt", "endsAt", "notes", "status"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const parsed = classSchema.safeParse({ ...values, acceptsTrial: formData.get("acceptsTrial") === "on" });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;
  const row = {
    unit_id: d.unitId,
    martial_art_id: d.martialArtId,
    teacher_id: d.teacherId,
    name: d.name,
    level: d.level,
    weekday: d.weekday,
    starts_at: d.startsAt,
    ends_at: d.endsAt,
    accepts_trial: d.acceptsTrial,
    notes: d.notes,
    status: d.status,
  };

  const supabase = await createClient();
  const { error } = classId
    ? await supabase.from("class_schedules").update(row).eq("id", classId).eq("academy_id", academyId)
    : await supabase.from("class_schedules").insert({ ...row, academy_id: academyId });
  if (error) return { status: "error", message: message(error, "Não foi possível salvar a aula."), values };

  revalidateAcademy(await slugOf(academyId));
  return { status: "success", message: classId ? "Aula atualizada." : "Aula adicionada à grade." };
}

export async function deleteClass(academyId: string, classId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("class_schedules").delete().eq("id", classId).eq("academy_id", academyId);
  revalidateAcademy(await slugOf(academyId));
  return error ? { ok: false, message: message(error, "Não foi possível remover a aula.") } : { ok: true };
}

// ---------------------------------------------------------------------------
// Vínculos e seguidores
// ---------------------------------------------------------------------------
export async function inviteMember(academyId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = { username: text(formData, "username"), role: text(formData, "role") };
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_member", {
    p_academy: academyId,
    p_username: parsed.data.username,
    p_role: parsed.data.role,
  });
  if (error) return { status: "error", message: message(error, "Não foi possível enviar o convite."), values };
  revalidateAcademy(await slugOf(academyId));
  return {
    status: "success",
    message: data === "active" ? "Vínculo ativado (a pessoa já tinha pedido)." : `Convite enviado para @${parsed.data.username}.`,
  };
}

export async function requestMembership(academyId: string, role: "student" | "teacher"): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_membership", { p_academy: academyId, p_role: role });
  revalidateAcademy(await slugOf(academyId));
  if (error) return { ok: false, message: message(error, "Não foi possível enviar o pedido.") };
  return { ok: true, message: data === "active" ? "Vínculo ativo." : "Pedido enviado. A academia precisa aprovar." };
}

export async function respondMembership(academyId: string, userId: string, role: string, accept: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_membership", {
    p_academy: academyId,
    p_user: userId,
    p_role: role as "student" | "teacher" | "admin" | "owner",
    p_accept: accept,
  });
  revalidateAcademy(await slugOf(academyId));
  revalidatePath(routes.teacherArea);
  if (error) return { ok: false, message: message(error, "Não foi possível responder.") };
  return { ok: true, message: accept ? "Vínculo aceito." : "Pedido recusado." };
}

export async function leaveMembership(academyId: string, role: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_membership", {
    p_academy: academyId,
    p_role: role as "student" | "teacher" | "admin" | "owner",
  });
  revalidateAcademy(await slugOf(academyId));
  revalidatePath(routes.teacherArea);
  return error ? { ok: false, message: message(error, "Não foi possível sair.") } : { ok: true, message: "Você saiu do vínculo." };
}

export async function removeMember(academyId: string, userId: string, role: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", {
    p_academy: academyId,
    p_user: userId,
    p_role: role as "student" | "teacher" | "admin" | "owner",
  });
  revalidateAcademy(await slugOf(academyId));
  return error ? { ok: false, message: message(error, "Não foi possível remover.") } : { ok: true };
}

export async function setAcademyFollow(academyId: string, follow: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = follow
    ? await supabase.from("academy_followers").upsert({ academy_id: academyId, user_id: user.id }, { ignoreDuplicates: true })
    : await supabase.from("academy_followers").delete().eq("academy_id", academyId).eq("user_id", user.id);
  revalidateAcademy(await slugOf(academyId));
  return error ? { ok: false, message: "Não foi possível seguir a academia." } : { ok: true };
}
