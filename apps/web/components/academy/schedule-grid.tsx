import Link from "next/link";
import { CalendarX, Sparkles } from "lucide-react";
import { CLASS_LEVEL_LABELS, formatTime, groupByWeekday, type ClassLevel } from "@figtherz/core";
import { routes } from "@/lib/routes";
import { cn } from "@/components/ui/cn";

export type ScheduleItem = {
  id: string;
  name: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  level: ClassLevel;
  status: "active" | "paused" | "cancelled";
  accepts_trial: boolean;
  martial_art_name: string;
  teacher_username?: string | null;
  teacher_display_name?: string | null;
  academy_name?: string;
  academy_slug?: string;
  unit_name?: string;
  /** Grade própria do professor: local numa academia que ainda não confirmou o professor. */
  place_pending?: boolean;
  /** Grade própria do professor: local fora de academia cadastrada (parque, clube…). */
  place_free?: boolean;
  notes?: string | null;
};

/**
 * Grade semanal: colunas por dia no desktop, lista por dia no mobile (DESIGN_SYSTEM.md §5: ScheduleGrid).
 * `showAcademy` liga a grade unificada do professor (várias academias).
 */
export function ScheduleGrid({ items, showAcademy = false }: { items: ScheduleItem[]; showAcademy?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-muted">
        <CalendarX aria-hidden className="size-6 shrink-0" />
        <p>Nenhuma aula cadastrada ainda.</p>
      </div>
    );
  }

  const days = groupByWeekday(items).filter((day) => day.items.length > 0);
  return (
    <div className="grid gap-3 lg:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
      {days.map((day) => (
        <section key={day.weekday} aria-labelledby={`dia-${day.weekday}`} className="rounded-lg border border-border bg-surface">
          <h3 id={`dia-${day.weekday}`} className="border-b border-border px-3 py-2 font-display text-lg font-semibold">
            {day.label}
          </h3>
          <ul className="divide-y divide-border">
            {day.items.map((item) => (
              <li key={item.id} className={cn("px-3 py-2.5", item.status === "paused" && "opacity-70")}>
                <p className="text-sm font-semibold tabular-nums">
                  {formatTime(item.starts_at)}–{formatTime(item.ends_at)}
                </p>
                <p className="font-semibold leading-tight">{item.name}</p>
                <p className="text-[13px] text-muted">
                  {item.martial_art_name} · {CLASS_LEVEL_LABELS[item.level]}
                </p>
                {showAcademy && item.academy_slug && (
                  <p className="text-[13px]">
                    <Link href={`/academias/${item.academy_slug}`} className="font-semibold text-accent hover:underline">
                      {item.academy_name}
                    </Link>
                    {item.unit_name ? <span className="text-muted"> · {item.unit_name}</span> : null}
                  </p>
                )}
                {showAcademy && !item.academy_slug && item.academy_name && (
                  <p className="text-[13px] font-semibold">{item.academy_name}</p>
                )}
                {item.notes && <p className="text-[12px] text-muted">{item.notes}</p>}
                {!showAcademy && item.teacher_username && (
                  <p className="text-[13px] text-muted">
                    com{" "}
                    <Link href={routes.teacher(item.teacher_username)} className="hover:underline">
                      {item.teacher_display_name}
                    </Link>
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.accepts_trial && item.status === "active" && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-accent-soft px-1.5 py-0.5 text-[12px] font-semibold text-accent">
                      <Sparkles aria-hidden className="size-3" /> Aceita aula experimental
                    </span>
                  )}
                  {item.place_pending && (
                    <span className="rounded-sm border border-warning/50 px-1.5 py-0.5 text-[12px] font-semibold text-warning">Aguardando a academia confirmar</span>
                  )}
                  {item.status === "paused" && (
                    <span className="rounded-sm border border-warning/50 px-1.5 py-0.5 text-[12px] font-semibold text-warning">Pausada</span>
                  )}
                  {item.status === "cancelled" && (
                    <span className="rounded-sm border border-danger/50 px-1.5 py-0.5 text-[12px] font-semibold text-danger">Cancelada</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
