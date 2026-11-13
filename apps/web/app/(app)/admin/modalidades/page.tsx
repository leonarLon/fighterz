import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RankBelt } from "@/components/journey/rank-belt";
import { requireAdmin } from "../access";
import { ActiveToggle, MartialArtForm, RankForm } from "./forms";

export const metadata: Metadata = { title: "Modalidades · Administração" };

export default async function AdminMartialArtsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: arts }, { data: ranks }] = await Promise.all([
    supabase.from("martial_arts").select("id, slug, name, has_ranks, is_active, sort_order").order("sort_order"),
    supabase
      .from("martial_art_ranks")
      .select("id, martial_art_id, ordinal, name, color_hex, secondary_color_hex, max_degrees")
      .eq("track", "adult")
      .order("ordinal"),
  ]);

  return (
    <>
      <PageHeader
        title="Modalidades"
        description="Catálogo usado em perfis, aulas, jornada e eventos. Desativar esconde dos formulários sem apagar o histórico."
      />
      <Card className="mb-6">
        <h2 className="mb-3 font-display text-xl font-semibold">Nova modalidade</h2>
        <MartialArtForm />
      </Card>
      <ul className="space-y-3">
        {(arts ?? []).map((art) => {
          const artRanks = (ranks ?? []).filter((r) => r.martial_art_id === art.id);
          return (
            <li key={art.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">
                  {art.name} <span className="text-[13px] font-normal text-muted">/{art.slug}</span>
                  {!art.is_active && <span className="ml-2 rounded bg-danger/10 px-1.5 text-[13px] text-danger">Inativa</span>}
                </h2>
                <ActiveToggle id={art.id} name={art.name} active={art.is_active} />
              </div>
              {art.has_ranks && (
                <details className="mt-2">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
                    Graduações ({artRanks.length})
                  </summary>
                  <ol className="mt-2 space-y-1">
                    {artRanks.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="w-6 text-right tabular-nums text-muted">{r.ordinal}.</span>
                        <RankBelt name={r.name} color={r.color_hex} secondaryColor={r.secondary_color_hex} degree={0} />
                        <span className="text-[13px] text-muted">
                          {r.max_degrees === 0 ? "sem graus" : `até ${r.max_degrees} ${r.max_degrees === 1 ? "grau" : "graus"}`}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 rounded-md border border-dashed border-border p-3">
                    <RankForm martialArtId={art.id} artName={art.name} />
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
