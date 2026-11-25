"use server";

import { revalidatePath } from "next/cache";
import { teacherClassSchema, teacherPlaceSchema, type Database } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  teacher_not_approved: "Só professores com perfil ativo cadastram a grade.",
  teacher_places_limit: "Limite de 20 locais atingido. Remova um local que não usa mais.",
  teacher_classes_limit: "Limite de 80 aulas na semana atingido.",
  academy_not_found: "Academia não encontrada.",
  academy_without_unit: "Essa academia ainda não cadastrou endereço. Use \"Outro local\" por enquanto.",
  unit_not_in_academy: "A unidade não pertence a essa academia.",
  place_not_found: "Escolha um dos seus locais.",
  account_suspended: "Sua conta está suspensa.",
  P0429: "Muitas tentativas em pouco tempo. Tente de novo mais tarde.",
};

function message(error: { code?: string; message?: string }, fallback: string) {
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

async function revalidateTeacher(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  revalidatePath(routes.teacherArea);
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  if (data?.username) {
    revalidatePath(routes.teacher(data.username));
    revalidatePath(routes.profile(data.username));
  }
}

/** Cadastra um local: academia já cadastrada (endereço vem da unidade) ou outro lugar com endereço próprio. */
export async function saveTeacherPlace(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const keys = ["kind", "academyId", "unitId", "name", "postalCode", "street", "number", "complement", "neighborhood", "city", "state", "referencePoint", "latitude", "longitude"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const parsed = teacherPlaceSchema.safeParse({
    ...values,
    latitude: values.latitude === "" ? null : values.latitude,
    longitude: values.longitude === "" ? null : values.longitude,
  });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  // No local de academia o banco troca nome e endereço pelos da unidade; os valores abaixo só cumprem o NOT NULL.
  const row: Database["public"]["Tables"]["teacher_places"]["Insert"] =
    d.kind === "academy"
      ? { teacher_id: user.id, academy_id: d.academyId, unit_id: d.unitId, name: "Academia", city: "—", state: "SP" }
      : {
          teacher_id: user.id,
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
        };
  const { error } = await supabase.from("teacher_places").insert(row);
  if (error) return { status: "error", message: message(error, "Não foi possível salvar o local."), values };
  await revalidateTeacher(supabase, user.id);
  return {
    status: "success",
    message:
      d.kind === "academy"
        ? "Local salvo. A academia recebeu seu pedido de professor e vai confirmar que você dá aula lá."
        : "Local salvo. Agora cadastre as aulas nesse local.",
  };
}

export async function deleteTeacherPlace(placeId: string): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("teacher_places").delete().eq("id", placeId).eq("teacher_id", user.id).select("id");
  // Sem revalidar: a linha sai da lista localmente (revalidar remontaria a lista e perderia o aviso).
  if (error || !data?.length) return { ok: false, message: "Não foi possível remover o local." };
  return { ok: true, message: "Local e aulas dele removidos." };
}

/** Cadastra a aula em um ou mais dias da semana (uma linha por dia). */
export async function saveTeacherClasses(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const keys = ["placeId", "martialArtId", "level", "startsAt", "endsAt", "notes"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const weekdays = formData.getAll("weekdays").filter((v): v is string => typeof v === "string");
  const parsed = teacherClassSchema.safeParse({ ...values, weekdays, acceptsTrial: formData.get("acceptsTrial") === "on" });
  if (!parsed.success) return fromZodError(parsed.error, { ...values, weekdays: weekdays.join(",") });
  const d = parsed.data;

  const supabase = await createClient();
  const rows = [...new Set(d.weekdays)].map((weekday) => ({
    teacher_id: user.id,
    place_id: d.placeId,
    martial_art_id: d.martialArtId,
    level: d.level,
    weekday,
    starts_at: d.startsAt,
    ends_at: d.endsAt,
    accepts_trial: d.acceptsTrial,
    notes: d.notes,
  }));
  const { error } = await supabase.from("teacher_classes").insert(rows);
  if (error) return { status: "error", message: message(error, "Não foi possível salvar a aula."), values };
  await revalidateTeacher(supabase, user.id);
  return { status: "success", message: rows.length === 1 ? "Aula adicionada à sua grade." : `${rows.length} aulas adicionadas à sua grade.` };
}

export async function deleteTeacherClass(classId: string): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("teacher_classes").delete().eq("id", classId).eq("teacher_id", user.id).select("id");
  if (error || !data?.length) return { ok: false, message: "Não foi possível remover a aula." };
  return { ok: true, message: "Aula removida." };
}
