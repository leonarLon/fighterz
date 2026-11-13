"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eventSchema } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  P0429: "Limite de eventos por dia atingido. Tente amanhã.",
  not_academy_manager: "Só quem gerencia a academia cria eventos em nome dela.",
  not_approved_teacher: "Eventos pessoais são para professores aprovados. Você pode criar pela sua academia.",
  unit_not_in_academy: "A unidade escolhida não é dessa academia.",
  event_in_past: "O evento não pode começar no passado.",
  event_cancelled: "Evento cancelado não pode ser reaberto. Crie um novo.",
  "23514": "Revise datas e local do evento.",
};

function message(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

const KEYS = [
  "organizer", "type", "martialArtId", "title", "description", "startsAt", "endsAt", "unitId",
  "venueName", "street", "number", "neighborhood", "postalCode", "city", "state", "externalUrl",
];

function parse(formData: FormData) {
  const values = Object.fromEntries(KEYS.map((k) => [k, text(formData, k)]));
  const parsed = eventSchema.safeParse({ ...values, publish: formData.get("publish") === "on" });
  return { values, parsed };
}

function row(d: ReturnType<typeof eventSchema.parse>) {
  return {
    type: d.type,
    martial_art_id: d.martialArtId,
    title: d.title,
    description: d.description,
    starts_at: d.startsAt,
    ends_at: d.endsAt,
    unit_id: d.unitId,
    venue_name: d.venueName,
    street: d.street,
    number: d.number,
    neighborhood: d.neighborhood,
    postal_code: d.postalCode,
    // Com unidade, o banco copia cidade/UF dela; aqui só evita o NOT NULL.
    city: d.city ?? "-",
    state: d.state ?? "SP",
    external_url: d.externalUrl,
  };
}

export async function createEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { values, parsed } = parse(formData);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      ...row(d),
      created_by: user.id,
      academy_id: d.organizer === "personal" ? null : d.organizer,
      status: d.publish ? "published" : "draft",
    })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: message(error, "Não foi possível criar o evento."), values };
  revalidatePath(routes.events);
  redirect(routes.event(data.id));
}

export async function updateEvent(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { values, parsed } = parse(formData);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase.from("events").select("status").eq("id", eventId).maybeSingle();
  if (!current) return { status: "error", message: "Evento não encontrado.", values };
  const status = current.status === "draft" && d.publish ? "published" : current.status;
  const { data, error } = await supabase
    .from("events")
    .update({ ...row(d), status })
    .eq("id", eventId)
    .select("id");
  if (error) return { status: "error", message: message(error, "Não foi possível salvar o evento."), values };
  if (!data?.length) return { status: "error", message: "Você não pode editar este evento.", values };
  revalidatePath(routes.events);
  revalidatePath(routes.event(eventId));
  redirect(routes.event(eventId));
}

export async function setEventStatus(eventId: string, status: "published" | "cancelled"): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").update({ status }).eq("id", eventId).select("id");
  if (error) return { ok: false, message: message(error, "Não foi possível atualizar o evento.") };
  if (!data?.length) return { ok: false, message: "Você não pode alterar este evento." };
  revalidatePath(routes.events);
  revalidatePath(routes.event(eventId));
  return { ok: true, message: status === "cancelled" ? "Evento cancelado. Os interessados foram avisados." : "Evento publicado." };
}

export async function deleteEvent(eventId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").delete().eq("id", eventId).select("id");
  if (error || !data?.length) return { ok: false, message: "Só rascunhos podem ser excluídos. Eventos publicados são cancelados." };
  revalidatePath(routes.events);
  redirect(routes.events);
}

export async function setEventInterest(eventId: string, kind: "interested" | "saved", on: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("event_interests").upsert({ event_id: eventId, user_id: user.id, kind }, { ignoreDuplicates: true })
    : await supabase.from("event_interests").delete().eq("event_id", eventId).eq("user_id", user.id).eq("kind", kind);
  if (error) return { ok: false, message: "Não foi possível salvar. Tente de novo." };
  return { ok: true };
}
