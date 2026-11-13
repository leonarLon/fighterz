import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isoToLocalDateTime } from "@figtherz/core";
import { updateEvent } from "@/app/actions/events";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/event/event-form";
import { loadEventOptions } from "../../load-options";

export const metadata: Metadata = { title: "Editar evento" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!event || event.status === "cancelled") notFound();
  const { data: canManage } = event.academy_id
    ? await supabase.rpc("is_academy_manager", { p_academy: event.academy_id })
    : { data: false };
  if (event.created_by !== user.id && !canManage) notFound();

  const { units, arts } = await loadEventOptions(user.id);
  return (
    <>
      <PageHeader title="Editar evento" />
      <Card>
        <EventForm
          action={updateEvent.bind(null, event.id)}
          isNew={false}
          isDraft={event.status === "draft"}
          organizers={[]}
          units={units}
          arts={arts}
          initial={{
            organizer: event.academy_id ?? "personal",
            type: event.type,
            martialArtId: event.martial_art_id ?? "",
            title: event.title,
            description: event.description ?? "",
            startsAt: isoToLocalDateTime(event.starts_at),
            endsAt: isoToLocalDateTime(event.ends_at),
            unitId: event.unit_id ?? "",
            venueName: event.venue_name ?? "",
            street: event.street ?? "",
            number: event.number ?? "",
            neighborhood: event.neighborhood ?? "",
            postalCode: event.postal_code ?? "",
            city: event.city,
            state: event.state,
            externalUrl: event.external_url ?? "",
          }}
        />
      </Card>
    </>
  );
}
