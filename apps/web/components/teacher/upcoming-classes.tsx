import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { formatTime, sortByNextOccurrence } from "@figtherz/core";
import { routes } from "@/lib/routes";
import type { WeeklySlot } from "./next-class";

export type UpcomingItem = WeeklySlot & { teacherName: string | null; teacherUsername: string | null };

/** Próximas aulas (horário de Brasília) para o Explorar: professor, horário e local, com link para a grade. */
export function UpcomingClasses({ items, limit = 6, city }: { items: UpcomingItem[]; limit?: number; city: string | null }) {
  const next = sortByNextOccurrence(items).slice(0, limit);
  return (
    <section aria-labelledby="proximas-aulas" className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="proximas-aulas" className="flex items-center gap-2 font-display text-2xl font-semibold">
          <CalendarClock aria-hidden className="size-6 text-accent" /> Próximas aulas{city ? ` em ${city}` : ""}
        </h2>
        <Link href={city ? `${routes.classes}?cidade=${encodeURIComponent(city)}` : routes.classes} className="text-sm font-semibold text-accent hover:underline">
          Ver todas as aulas
        </Link>
      </div>
      {next.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma aula cadastrada por aqui ainda.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {next.map(({ item, next: when }) => (
            <li key={item.id} className="rounded-lg border border-border bg-surface p-3">
              <p className="font-semibold tabular-nums">
                {when.happeningNow ? `Agora, até ${formatTime(item.ends_at)}` : `${when.label}–${formatTime(item.ends_at)}`}
              </p>
              <p className="text-sm">
                {item.martialArtName}
                {item.teacherUsername && (
                  <>
                    {" "}· com{" "}
                    <Link href={routes.teacher(item.teacherUsername)} className="font-semibold text-accent hover:underline">
                      {item.teacherName}
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-1 flex items-start gap-1 text-[13px] text-muted">
                <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {item.placeHref ? (
                    <Link href={item.placeHref} className="hover:underline">
                      {item.placeName}
                    </Link>
                  ) : (
                    item.placeName
                  )}
                  {item.address.neighborhood ? ` · ${item.address.neighborhood}` : ""} · {item.address.city}/{item.address.state}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
