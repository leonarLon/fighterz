import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { isoToLocalDateTime } from "@figtherz/core";
import { createEvent } from "@/app/actions/events";
import { requireUser } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/event/event-form";
import { loadEventOptions } from "../load-options";

export const metadata: Metadata = { title: "Novo evento" };

export default async function NewEventPage() {
  const user = await requireUser();
  const { organizers, units, arts } = await loadEventOptions(user.id);

  if (organizers.length === 0) {
    return (
      <>
        <PageHeader title="Novo evento" />
        <EmptyState
          icon={CalendarPlus}
          title="Eventos são criados por professores e academias"
          description="Peça aprovação como professor ou gerencie uma academia para divulgar campeonatos, seminários e open mats."
          action={
            <Link href={routes.teacherArea} className="font-semibold text-accent hover:underline">
              Ir para a área do professor
            </Link>
          }
        />
      </>
    );
  }

  const now = isoToLocalDateTime(new Date().toISOString());
  return (
    <>
      <PageHeader title="Novo evento" description="Campeonato, seminário, open mat ou graduação. Os interessados são avisados se algo mudar." />
      <Card>
        <EventForm
          action={createEvent}
          isNew
          isDraft
          organizers={organizers}
          units={units}
          arts={arts}
          minDate={now.slice(0, 10) + "T00:00"}
          initial={{
            organizer: organizers[0]!.value,
            type: "seminar",
            martialArtId: "",
            title: "",
            description: "",
            startsAt: "",
            endsAt: "",
            unitId: "",
            venueName: "",
            street: "",
            number: "",
            neighborhood: "",
            postalCode: "",
            city: "",
            state: "",
            externalUrl: "",
          }}
        />
      </Card>
    </>
  );
}
