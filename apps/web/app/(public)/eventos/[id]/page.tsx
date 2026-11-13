import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, MapPin, Users } from "lucide-react";
import { EVENT_TYPE_LABELS, formatAddress, formatEventRange, type EventType } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { AddressActions } from "@/components/academy/address-actions";
import { LeafletMap } from "@/components/map/map";
import { BeltDivider } from "@/components/ui/belt";
import { Card } from "@/components/ui/card";
import { ReportButton } from "@/components/report/report-button";
import { EventActions, EventManageActions } from "./event-actions";

type Props = { params: Promise<{ id: string }> };

async function loadEvent(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("event_cards").select("*").eq("id", id).maybeSingle();
  return data ? { ...data, ended: new Date(data.ends_at!).getTime() < Date.now() } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await loadEvent((await params).id);
  return { title: event?.title ?? "Evento não encontrado" };
}

export default async function EventPage({ params }: Props) {
  const event = await loadEvent((await params).id);
  if (!event) notFound();
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: isManager } =
    user && event.academy_id ? await supabase.rpc("is_academy_manager", { p_academy: event.academy_id }) : { data: false };
  const canManage = Boolean(user && (event.created_by === user.id || isManager));
  const { ended } = event;
  const title = event.title ?? "";
  const address = {
    street: event.street,
    number: event.number,
    neighborhood: event.neighborhood,
    city: event.city ?? "",
    state: event.state ?? "",
    postal_code: event.postal_code,
    latitude: event.latitude,
    longitude: event.longitude,
  };

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">
          {EVENT_TYPE_LABELS[event.type as EventType]}
          {event.martial_art_name ? ` · ${event.martial_art_name}` : " · Várias modalidades"}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight lg:text-4xl">{title}</h1>
        {event.status === "draft" && (
          <p role="status" className="mt-2 rounded-md border border-warning/40 px-3 py-2 text-sm font-medium text-warning">
            Rascunho: só a organização vê este evento.
          </p>
        )}
        {event.status === "cancelled" && (
          <p role="status" className="mt-2 rounded-md border border-danger/40 px-3 py-2 text-sm font-medium text-danger">
            Evento cancelado.
          </p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-2">
          <CalendarDays aria-hidden className="size-4 text-muted" />
          {formatEventRange(event.starts_at!, event.ends_at!)}
          {ended && event.status !== "cancelled" && <span className="text-sm text-muted">(já aconteceu)</span>}
        </p>
        <p className="mt-1 text-muted">
          Organização:{" "}
          {event.academy_slug ? (
            <Link href={routes.academy(event.academy_slug)} className="font-semibold text-accent hover:underline">
              {event.academy_name}
            </Link>
          ) : (
            <Link href={routes.teacher(event.organizer_username ?? "")} className="font-semibold text-accent hover:underline">
              {event.organizer_display_name}
            </Link>
          )}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Users aria-hidden className="size-4" /> {event.interest_count}{" "}
          {event.interest_count === 1 ? "pessoa interessada" : "pessoas interessadas"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {event.status === "published" && !ended && (
            <EventActions
              eventId={event.id!}
              loggedIn={Boolean(user)}
              interested={Boolean(event.viewer_interested)}
              saved={Boolean(event.viewer_saved)}
            />
          )}
          {event.external_url && (
            <a
              href={event.external_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 font-semibold hover:bg-bg"
            >
              Inscrição e regulamento <ExternalLink aria-hidden className="size-4" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
        </div>
        {canManage ? (
          <EventManageActions eventId={event.id!} status={event.status!} />
        ) : (
          <div className="mt-2">
            <ReportButton targetType="event" targetId={event.id!} title="Denunciar evento" loggedIn={Boolean(user)} returnTo={routes.event(event.id!)} />
          </div>
        )}
        <BeltDivider className="mt-6" />
      </Card>

      {event.description && (
        <Card>
          <h2 className="mb-2 font-display text-2xl font-semibold">Sobre</h2>
          <p className="whitespace-pre-line">{event.description}</p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-display text-2xl font-semibold">Onde</h2>
        {event.latitude != null && event.longitude != null && (
          <LeafletMap
            markers={[{ id: event.id!, lat: event.latitude, lng: event.longitude, title: event.venue_name ?? title }]}
            label={`Mapa do local de ${title}`}
            className="mb-4 h-64"
          />
        )}
        {event.venue_name && <p className="font-semibold">{event.venue_name}</p>}
        <p className="mb-3 flex items-start gap-1.5 text-sm text-muted">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" /> {formatAddress(address)}
        </p>
        <AddressActions address={address} name={event.venue_name ?? title} />
      </Card>
    </div>
  );
}
