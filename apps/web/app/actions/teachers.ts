"use server";

import { revalidatePath } from "next/cache";
import { inviteSchema, teacherProfileSchema, teacherRankOptions } from "@figtherz/core";
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

  // Critério de professor (faixa preta ou equivalente): confere antes de mexer nas modalidades, para não
  // apagar as atuais e falhar no meio. O banco confere de novo (rank_below_teacher_min).
  const [{ data: artRows }, { data: rankRows }] = await Promise.all([
    supabase.from("martial_arts").select("id, has_ranks, teacher_min_ordinal").in("id", d.martialArts.map((m) => m.martialArtId)),
    supabase.from("martial_art_ranks").select("id, martial_art_id, ordinal, name").eq("track", "adult").in("martial_art_id", d.martialArts.map((m) => m.martialArtId)),
  ]);
  const invalid = d.martialArts.some((m) => {
    const art = artRows?.find((a) => a.id === m.martialArtId);
    if (!art) return true;
    if (!art.has_ranks) return false;
    const allowed = teacherRankOptions(
      { hasRanks: art.has_ranks, teacherMinOrdinal: art.teacher_min_ordinal },
      (rankRows ?? []).filter((r) => r.martial_art_id === art.id),
    );
    return !allowed.some((r) => r.id === m.rankId);
  });
  if (invalid) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: { martialArts: ["Nas modalidades com faixa, escolha sua graduação (faixa preta ou equivalente)."] },
      values,
    };
  }

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
  if (artsError) return { status: "error", message: "Perfil salvo, mas houve erro nas modalidades. Revise as graduações (faixa preta ou equivalente).", values };

  revalidatePath(routes.teacherArea);
  const { data: saved } = await supabase.from("teacher_profiles").select("status").eq("user_id", user.id).single();
  return {
    status: "success",
    message:
      saved?.status === "approved"
        ? existing
          ? "Perfil de professor atualizado."
          : "Pronto! Seu perfil de professor já está ativo."
        : saved?.status === "revoked"
          ? "Perfil salvo. Ele continua revogado pela equipe Fighterz."
          : "Perfil salvo, mas ainda não ativo: marque uma modalidade em que você é faixa preta (ou equivalente).",
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

// ---------------------------------------------------------------------------
// Alunos do professor (aceite mútuo: quem não iniciou decide)
// ---------------------------------------------------------------------------
type Result = { ok: true; message?: string } | { ok: false; message: string };

const STUDENT_ERRORS: Record<string, string> = {
  P0429: "Muitas tentativas em pouco tempo. Tente de novo mais tarde.",
  teacher_not_approved: "Só professores com perfil aprovado têm alunos.",
  teacher_not_found: "Professor não encontrado.",
  user_not_found: "Usuário não encontrado.",
  cannot_add_self: "Você não pode ser seu próprio aluno.",
  link_not_found: "Esse vínculo não existe mais.",
  forbidden: "Você não tem permissão para isso.",
  account_suspended: "Sua conta está suspensa.",
};

function studentError(error: { code?: string; message?: string }, fallback: string) {
  return STUDENT_ERRORS[error.message ?? ""] ?? STUDENT_ERRORS[error.code ?? ""] ?? fallback;
}

const studentInviteSchema = inviteSchema.pick({ username: true });

/** Professor convida um aluno pelo @usuário. A pessoa precisa aceitar (ou já tinha pedido). */
export async function inviteStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = { username: text(formData, "username") };
  const parsed = studentInviteSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_student", { p_username: parsed.data.username });
  if (error) return { status: "error", message: studentError(error, "Não foi possível enviar o convite."), values };
  revalidatePath(routes.teacherArea);
  return {
    status: "success",
    message:
      data === "active"
        ? `@${parsed.data.username} agora é seu aluno.`
        : `Convite enviado. @${parsed.data.username} precisa aceitar para entrar na sua lista.`,
  };
}

/** Pessoa pede para constar como aluno do professor. */
export async function requestTeacher(teacherId: string): Promise<Result & { status?: "pending" | "active" }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_teacher", { p_teacher: teacherId });
  if (error) return { ok: false, message: studentError(error, "Não foi possível enviar o pedido.") };
  const status = data === "active" ? "active" : "pending";
  return {
    ok: true,
    status,
    message: status === "active" ? "Pronto: você está na lista de alunos." : "Pedido enviado. O professor precisa confirmar.",
  };
}

/** Sem revalidar: a linha mostra o resultado localmente (o item sai da lista). */
export async function respondStudentLink(teacherId: string, studentId: string, accept: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_student_link", { p_teacher: teacherId, p_student: studentId, p_accept: accept });
  if (error) return { ok: false, message: studentError(error, "Não foi possível responder.") };
  return { ok: true, message: accept ? "Vínculo aceito." : "Pedido recusado." };
}

export async function removeStudentLink(teacherId: string, studentId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_student_link", { p_teacher: teacherId, p_student: studentId });
  if (error) return { ok: false, message: studentError(error, "Não foi possível desfazer o vínculo.") };
  return { ok: true, message: "Vínculo desfeito." };
}
