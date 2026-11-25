import Link from "next/link";
import { BadgeCheck, CalendarClock, Clock, MapPin } from "lucide-react";
import { CLASS_LEVEL_LABELS, formatAddress, formatTime, sortByNextOccurrence, type ClassLevel } from "@figtherz/core";
import { AddressActions } from "@/components/academy/address-actions";

export type WeeklySlot = {
  id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  level: ClassLevel;
  martialArtName: string;
  placeName: string;
  placeHref: string | null;
  /** null: local sem academia; true/false: academia confirmou ou não o professor. */
  confirmed: boolean | null;
  address: {
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string;
    state: string;
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
  };
};

/** Cartão com a próxima aula do professor (horário de Brasília), com rota e endereço. */
export function NextClassCard({ slots, compact = false, teacherHref }: { slots: WeeklySlot[]; compact?: boolean; teacherHref?: string }) {
  const [first] = sortByNextOccurrence(slots);
  if (!first) return null;
  const { item: s, next } = first;
  const when = next.happeningNow ? `Acontecendo agora, até ${formatTime(s.ends_at)}` : `${next.label}–${formatTime(s.ends_at)}`;

  if (compact) {
    return (
      <p className="mt-3 flex items-start gap-1.5 text-sm">
        <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>
          <span className="font-semibold">Próxima aula: </span>
          {when} · {s.martialArtName} · {s.placeName}
          {teacherHref && (
            <>
              {" "}
              <Link href={teacherHref} className="font-semibold text-accent hover:underline">
                Ver grade
              </Link>
            </>
          )}
        </span>
      </p>
    );
  }

  return (
    <section aria-labelledby="proxima-aula" className="rounded-lg border-2 border-accent/40 bg-accent-soft/40 p-4">
      <h2 id="proxima-aula" className="flex items-center gap-2 font-display text-xl font-semibold">
        <CalendarClock aria-hidden className="size-5 text-accent" /> Próxima aula
      </h2>
      <p className="mt-1 text-lg font-semibold">{when}</p>
      <p className="text-sm">
        {s.martialArtName} · {CLASS_LEVEL_LABELS[s.level]}
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-sm">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>
          {s.placeHref ? (
            <Link href={s.placeHref} className="font-semibold text-accent hover:underline">
              {s.placeName}
            </Link>
          ) : (
            <span className="font-semibold">{s.placeName}</span>
          )}
          <span className="text-muted"> · {formatAddress(s.address)}</span>
        </span>
      </p>
      <ConfirmationNote confirmed={s.confirmed} />
      <div className="mt-3">
        <AddressActions address={s.address} name={s.placeName} />
      </div>
    </section>
  );
}

export function ConfirmationNote({ confirmed }: { confirmed: boolean | null }) {
  if (confirmed === null) return null;
  return confirmed ? (
    <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-success">
      <BadgeCheck aria-hidden className="size-3.5" /> Confirmado pela academia
    </p>
  ) : (
    <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-warning">
      <Clock aria-hidden className="size-3.5" /> Aguardando a academia confirmar
    </p>
  );
}
