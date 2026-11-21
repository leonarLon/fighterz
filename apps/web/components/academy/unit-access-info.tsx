import { BadgeCheck, CircleSlash, Ticket } from "lucide-react";
import { APP_TIMEZONE, UNIT_ACCESS_KINDS, UNIT_ACCESS_LABELS, formatBrl, formatDate } from "@figtherz/core";
import type { UnitAccess } from "@/lib/academies";

function headline(a: UnitAccess): string {
  if (a.kind !== "day_pass") return a.accepted ? `Aceita ${UNIT_ACCESS_LABELS[a.kind]}` : `Não aceita ${UNIT_ACCESS_LABELS[a.kind]}`;
  if (!a.accepted) return "Não oferece diária";
  if (a.price_status === "free") return "Diária gratuita";
  if (a.price_status === "paid" && a.price_cents) return `Diária: ${formatBrl(a.price_cents)}`;
  return "Diária: valor não divulgado";
}

/** TotalPass, Wellhub e diária de uma unidade na página pública. Só aparece o que a academia informou. */
export function UnitAccessInfo({ items, arts }: { items: UnitAccess[]; arts: { id: string; name: string }[] }) {
  const list = UNIT_ACCESS_KINDS.map((k) => items.find((i) => i.kind === k)).filter((i): i is UnitAccess => Boolean(i));
  if (list.length === 0) return null;
  const artName = new Map(arts.map((a) => [a.id, a.name]));

  return (
    <div className="mt-3 space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
        <Ticket aria-hidden className="size-4 text-accent" /> Acesso e diária
      </h4>
      <ul className="space-y-2">
        {list.map((a) => {
          const details = [
            a.plans.length > 0 && { label: "Planos", value: a.plans.join(", ") },
            a.martial_art_ids.length > 0 && {
              label: "Modalidades",
              value: a.martial_art_ids.map((id) => artName.get(id)).filter(Boolean).join(", ") || null,
            },
            a.access_hours && { label: "Horários", value: a.access_hours },
            a.restrictions && { label: "Restrições", value: a.restrictions },
            a.notes && { label: "Observações", value: a.notes },
          ].filter((d): d is { label: string; value: string } => Boolean(d && d.value));
          return (
            <li key={a.id} className="rounded-md border border-border px-3 py-2">
              <p className={`flex items-center gap-1.5 font-semibold ${a.accepted ? "" : "text-muted"}`}>
                {a.accepted ? <BadgeCheck aria-hidden className="size-4 text-success" /> : <CircleSlash aria-hidden className="size-4" />}
                {headline(a)}
              </p>
              {a.accepted && details.length > 0 && (
                <dl className="mt-1 space-y-0.5 text-sm">
                  {details.map((d) => (
                    <div key={d.label} className="flex flex-wrap gap-x-1">
                      <dt className="text-muted">{d.label}:</dt>
                      <dd className="whitespace-pre-line">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-1 text-[12px] text-muted">Atualizado em {formatDate(new Date(a.updated_at).toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE }))}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
