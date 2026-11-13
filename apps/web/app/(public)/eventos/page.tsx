import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus, Star, Users } from "lucide-react";
import {
  BRAZILIAN_STATES,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  formatEventRange,
  type EventType,
} from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField, SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Eventos" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const art = sp.modalidade && UUID.test(sp.modalidade) ? sp.modalidade : "";
  const type = EVENT_TYPES.includes(sp.tipo as EventType) ? (sp.tipo as EventType) : "";
  const uf = (BRAZILIAN_STATES as readonly string[]).includes(sp.uf ?? "") ? sp.uf! : "";
  const city = (sp.cidade ?? "").replace(/[%_,()*\\]/g, "").trim().slice(0, 60);
  const past = sp.quando === "passados";
  const saved = Boolean(user) && sp.salvos === "1";
  const now = new Date().toISOString();

  let query = supabase
    .from("event_cards")
    .select("id, title, type, starts_at, ends_at, city, state, venue_name, martial_art_name, academy_name, organizer_display_name, status, interest_count, viewer_saved, viewer_interested")
    .in("status", ["published", "cancelled"])
    .limit(50);
  query = past ? query.lt("ends_at", now).order("starts_at", { ascending: false }) : query.gte("ends_at", now).order("starts_at");
  if (art) query = query.eq("martial_art_id", art);
  if (type) query = query.eq("type", type);
  if (uf) query = query.eq("state", uf);
  if (city) query = query.ilike("city", `%${city}%`);
  if (saved) query = query.or("viewer_saved.eq.true,viewer_interested.eq.true");

  const [{ data: arts }, { data: events }, mine] = await Promise.all([
    supabase.from("martial_arts").select("id, name").order("sort_order"),
    query,
    user
      ? supabase.from("events").select("id, title, status, starts_at").eq("created_by", user.id).eq("status", "draft").order("starts_at")
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Eventos" description="Campeonatos, seminários, open mats e graduações perto de você." />
        {user && (
          <ButtonLink href={routes.newEvent}>
            <Plus aria-hidden className="size-4" /> Criar evento
          </ButtonLink>
        )}
      </div>

      {(mine.data ?? []).length > 0 && (
        <section aria-labelledby="rascunhos" className="mb-6">
          <h2 id="rascunhos" className="mb-2 font-display text-xl font-semibold">
            Meus rascunhos
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(mine.data ?? []).map((d) => (
              <li key={d.id}>
                <Link href={routes.event(d.id)} className="inline-flex min-h-11 items-center rounded-md border border-dashed border-border bg-surface px-3 text-sm font-semibold hover:bg-bg">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form role="search" action={routes.events} className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3 sm:items-end">
        <SelectField id="modalidade" label="Modalidade" defaultValue={art}>
          <option value="">Todas</option>
          {(arts ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <SelectField id="tipo" label="Tipo" defaultValue={type}>
          <option value="">Todos</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>
        <SelectField id="quando" label="Quando" defaultValue={past ? "passados" : ""}>
          <option value="">Próximos</option>
          <option value="passados">Já aconteceram</option>
        </SelectField>
        <SelectField id="uf" label="Estado" defaultValue={uf}>
          <option value="">Todos</option>
          {BRAZILIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <InputField id="cidade" label="Cidade" defaultValue={city} placeholder="Ex.: Curitiba" />
        <div className="flex flex-wrap items-center gap-3">
          {user && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="salvos" value="1" defaultChecked={saved} className="size-5 accent-(--primary)" />
              Só salvos e com interesse
            </label>
          )}
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </div>
      </form>

      {(events ?? []).length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nenhum evento encontrado" description="Mude os filtros ou volte mais tarde." />
      ) : (
        <ul className="space-y-3" aria-label="Eventos">
          {(events ?? []).map((ev) => (
            <li key={ev.id}>
              <Link href={routes.event(ev.id!)} className="block rounded-lg border border-border bg-surface p-4 hover:bg-bg">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">
                  {EVENT_TYPE_LABELS[ev.type as EventType]}
                  {ev.martial_art_name ? ` · ${ev.martial_art_name}` : ""}
                  {ev.status === "cancelled" && <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-danger normal-case">Cancelado</span>}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">{ev.title}</h2>
                <p className="mt-1 text-sm">{formatEventRange(ev.starts_at!, ev.ends_at!)}</p>
                <p className="text-sm text-muted">
                  {[ev.venue_name, `${ev.city}/${ev.state}`].filter(Boolean).join(" · ")} · por {ev.academy_name ?? ev.organizer_display_name}
                </p>
                <p className="mt-2 flex flex-wrap gap-4 text-[13px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users aria-hidden className="size-3.5" /> {ev.interest_count} {ev.interest_count === 1 ? "interessado" : "interessados"}
                  </span>
                  {(ev.viewer_saved || ev.viewer_interested) && (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <Star aria-hidden className="size-3.5" /> {ev.viewer_interested ? "Você tem interesse" : "Salvo"}
                    </span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
