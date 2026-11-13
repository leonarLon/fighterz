"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDate } from "@figtherz/core";
import { confirmPromotion } from "@/app/actions/journey";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { RankBelt } from "@/components/journey/rank-belt";

export type PromotionRequest = {
  id: string;
  username: string;
  displayName: string;
  martialArt: string;
  rankName: string;
  rankColor: string | null;
  rankSecondaryColor: string | null;
  degree: number;
  promotedOn: string;
  academyName: string | null;
};

/** Pedidos de confirmação de graduação. O resultado fica no item (sem recarregar a lista). */
export function PromotionRequests({ items }: { items: PromotionRequest[] }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<Record<string, string>>({});

  if (items.length === 0) return <p className="text-muted">Nenhuma graduação aguardando sua confirmação.</p>;

  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-surface">
      {items.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <p>
              <Link href={routes.profile(p.username)} className="font-semibold hover:underline">
                {p.displayName}
              </Link>{" "}
              <span className="text-[13px] text-muted">@{p.username}</span>
            </p>
            <p className="text-[13px] text-muted">
              {p.martialArt} · {formatDate(p.promotedOn)}
              {p.academyName ? ` · ${p.academyName}` : ""}
            </p>
            <RankBelt className="mt-1" name={p.rankName} color={p.rankColor} secondaryColor={p.rankSecondaryColor} degree={p.degree} />
          </div>
          {done[p.id] ? (
            <p role="status" className="text-sm font-medium">
              {done[p.id]}
            </p>
          ) : (
            <span className="flex gap-2">
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await confirmPromotion(p.id, true);
                    setDone((d) => ({ ...d, [p.id]: r.message ?? "" }));
                  })
                }
              >
                Confirmar
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await confirmPromotion(p.id, false);
                    setDone((d) => ({ ...d, [p.id]: r.message ?? "" }));
                  })
                }
              >
                Não fui eu
              </Button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
