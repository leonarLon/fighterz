"use server";

import { revalidatePath } from "next/cache";
import { teacherProfileSchema } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

/** Cria ou edita o perfil profissional. O status é decidido no banco (pendente até o admin aprovar). */
export async function saveTeacherProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const keys = ["professionalName", "bio", "experienceYears", "lineage", "accessPlans", "certifications", "contactEmail", "contactPhone", "socialLinks"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const artIds = formData.getAll("martialArtIds").filter((v): v is string => typeof v === "string");

  const parsed = teacherProfileSchema.safeParse({
    ...values,
    experienceYears: values.experienceYears === "" ? null : values.experienceYears,
    showContact: formData.get("showContact") === "on",
    socialLinks: values.socialLinks!.split(/\s+/).map((s) => s.trim()).filter(Boolean),
    martialArts: artIds.map((id) => ({ martialArtId: id, rankId: text(formData, `rank-${id}`) })),
  });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const row = {
    professional_name: d.professionalName,
    bio: d.bio,
    experience_years: d.experienceYears ?? null,
    lineage: d.lineage,
    access_plans: d.accessPlans,
    certifications: d.certifications,
    contact_email: d.contactEmail,
    contact_phone: d.contactPhone,
    show_contact: d.showContact,
    social_links: d.socialLinks,
  };
  const { data: existing } = await supabase.from("teacher_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("teacher_profiles").update(row).eq("user_id", user.id)
    : await supabase.from("teacher_profiles").insert({ ...row, user_id: user.id });
  if (error) return { status: "error", message: "Não foi possível salvar o perfil profissional.", values };

  // Modalidades ensinadas: substitui o conjunto.
  await supabase.from("teacher_martial_arts").delete().eq("teacher_id", user.id);
  const { error: artsError } = await supabase
    .from("teacher_martial_arts")
    .insert(d.martialArts.map((m) => ({ teacher_id: user.id, martial_art_id: m.martialArtId, rank_id: m.rankId })));
  if (artsError) return { status: "error", message: "Perfil salvo, mas houve erro nas modalidades. Revise as graduações.", values };

  revalidatePath(routes.teacherArea);
  return {
    status: "success",
    message: existing ? "Perfil profissional atualizado." : "Pedido enviado! Um administrador vai analisar seu perfil.",
    values,
  };
}

export async function reviewTeacher(userId: string, status: "approved" | "rejected" | "revoked", notes: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_teacher", { p_user: userId, p_status: status, p_notes: notes });
  // Sem revalidar: o item mostra o resultado; a fila se atualiza na próxima visita.
  if (error) return { ok: false as const, message: error.code === "42501" ? "Apenas administradores." : "Não foi possível revisar." };
  return { ok: true as const };
}
