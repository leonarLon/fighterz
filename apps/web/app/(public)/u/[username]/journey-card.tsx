import Link from "next/link";
import { ArrowRight, Dumbbell, Medal, Trophy } from "lucide-react";
import { MEDAL_LABELS, formatDate, placementLabel, type Medal as MedalKind } from "@figtherz/core";
import type { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { RankBelt } from "@/components/journey/rank-belt";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/lib/routes";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Jornada no perfil. A RLS aplica as escolhas de privacidade do dono (graduações, conquistas, treinos). */
export async function JourneyCard({ supabase, userId, isOwner = false }: { supabase: Supabase; userId: string; isOwner?: boolean }) {
  const [{ data: arts }, { data: achievements }, { data: summary }] = await Promise.all([
    supabase.from("journey_cards").select("*").eq("user_id", userId).order("sort_order"),
    supabase
      .from("athlete_achievements")
      .select("id, title, medal, placement, achieved_on, event_name")
      .eq("user_id", userId)
      .order("achieved_on", { ascending: false })
      .limit(5),
    supabase.rpc("get_training_summary", { p_user: userId }).maybeSingle(),
  ]);

  const trainings = summary?.total ? summary : null;
  if (!arts?.length && !achievements?.length && !trainings) {
    if (!isOwner) return null;
    return (
      <Card>
        <h2 className="mb-1 font-display text-2xl font-semibold">Jornada</h2>
        <p className="mb-4 text-muted">Mostre suas modalidades, sua faixa, seus treinos e suas conquistas no perfil.</p>
        <ButtonLink href={routes.journey} variant="secondary">
          <Medal aria-hidden className="size-4" /> Montar minha jornada
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Jornada</h2>
        {isOwner && (
          <Link href={routes.journey} className="flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Gerenciar <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      <div className="space-y-5">
        {arts && arts.length > 0 && (
          <section aria-labelledby="perfil-graduacoes">
            <h3 id="perfil-graduacoes" className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
              <Medal aria-hidden className="size-4" /> Modalidades
            </h3>
            <ul className="space-y-2">
              {arts.map((a) => (
                <li key={a.id} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-3">
                  <span className="font-semibold">{a.martial_art_name}</span>
                  {a.has_ranks && a.rank_name ? (
                    <RankBelt
                      name={a.rank_name}
                      color={a.rank_color}
                      secondaryColor={a.rank_secondary_color}
                      degree={a.current_degree}
                      confirmed={a.current_confirmed ?? false}
                    />
                  ) : (
                    <span className="text-sm text-muted">{a.started_on ? `Desde ${formatDate(a.started_on)}` : "Praticante"}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {trainings && (
          <section aria-labelledby="perfil-treinos">
            <h3 id="perfil-treinos" className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
              <Dumbbell aria-hidden className="size-4" /> Treinos registrados
            </h3>
            <dl className="flex flex-wrap gap-6">
              {[
                { label: "nos últimos 30 dias", value: trainings.last_30_days },
                { label: "neste ano", value: trainings.this_year },
              ].map((s) => (
                <div key={s.label} className="flex gap-1">
                  <dt className="order-2 text-muted">{s.label}</dt>
                  <dd className="font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {achievements && achievements.length > 0 && (
          <section aria-labelledby="perfil-conquistas">
            <h3 id="perfil-conquistas" className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
              <Trophy aria-hidden className="size-4" /> Conquistas
            </h3>
            <ul className="space-y-1">
              {achievements.map((a) => (
                <li key={a.id}>
                  <span className="font-semibold">{a.title}</span>
                  <span className="text-[13px] text-muted">
                    {a.medal ? ` · ${MEDAL_LABELS[a.medal as MedalKind]}` : ""}
                    {placementLabel(a.placement) ? ` · ${placementLabel(a.placement)}` : ""}
                    {a.event_name ? ` · ${a.event_name}` : ""} · {formatDate(a.achieved_on)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Card>
  );
}
