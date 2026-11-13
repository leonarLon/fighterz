import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, SearchX, Sparkles } from "lucide-react";
import {
  CLASS_LEVEL_LABELS,
  CLASS_LEVELS,
  PERIOD_LABELS,
  PERIODS,
  WEEK_ORDER,
  WEEKDAY_LABELS,
  formatAddress,
  formatTime,
  type ClassLevel,
} from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { LeafletMap } from "@/components/map/map";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField, SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { NearMeButton } from "./near-me";

export const metadata: Metadata = { title: "Encontrar aulas" };

type Search = Record<string, string | undefined>;

const num = (v: string | undefined) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
const uuidOrUndefined = (v: string | undefined) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

export default async function ClassesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: arts } = await supabase.from("martial_arts").select("id, name").order("sort_order");

  const lat = num(sp.lat);
  const lng = num(sp.lng);
  const filters = {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: num(sp.raio) ?? 10,
    p_martial_art: uuidOrUndefined(sp.modalidade),
    p_level: CLASS_LEVELS.includes(sp.nivel as ClassLevel) ? (sp.nivel as ClassLevel) : undefined,
    p_weekday: sp.dia !== undefined && sp.dia !== "" && /^[0-6]$/.test(sp.dia) ? Number(sp.dia) : undefined,
    p_period: (PERIODS as readonly string[]).includes(sp.periodo ?? "") ? sp.periodo : undefined,
    p_trial_only: sp.experimental === "1",
    p_city: sp.cidade?.trim() || undefined,
    p_neighborhood: sp.bairro?.trim() || undefined,
    p_limit: 60,
  };
  const searched = Object.keys(sp).length > 0;
  const { data } = await supabase.rpc("search_classes", filters);
  const results = data ?? [];

  const units = new Map<string, { id: string; lat: number; lng: number; title: string; subtitle: string; href: string }>();
  for (const { class: c } of results) {
    if (c.latitude != null && c.longitude != null && c.unit_id && !units.has(c.unit_id)) {
      units.set(c.unit_id, {
        id: c.unit_id,
        lat: c.latitude,
        lng: c.longitude,
        title: `${c.academy_name} · ${c.unit_name}`,
        subtitle: `${c.neighborhood ?? ""} ${c.city}/${c.state}`.trim(),
        href: routes.academy(c.academy_slug),
      });
    }
  }

  return (
    <>
      <PageHeader title="Encontrar aulas" description="Filtre por modalidade, nível, dia e horário. Veja no mapa ou por cidade e bairro." />

      <form id="busca-aulas" action={routes.classes} className="mb-6 space-y-4 rounded-lg border border-border bg-surface p-4">
        <input type="hidden" name="lat" defaultValue={lat ?? ""} />
        <input type="hidden" name="lng" defaultValue={lng ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="modalidade" label="Modalidade" defaultValue={sp.modalidade ?? ""}>
            <option value="">Todas</option>
            {(arts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </SelectField>
          <SelectField id="nivel" label="Nível" defaultValue={sp.nivel ?? ""}>
            <option value="">Qualquer</option>
            {CLASS_LEVELS.filter((l) => l !== "all").map((l) => (
              <option key={l} value={l}>
                {CLASS_LEVEL_LABELS[l]}
              </option>
            ))}
          </SelectField>
          <SelectField id="dia" label="Dia" defaultValue={sp.dia ?? ""}>
            <option value="">Qualquer dia</option>
            {WEEK_ORDER.map((d) => (
              <option key={d} value={d}>
                {WEEKDAY_LABELS[d]}
              </option>
            ))}
          </SelectField>
          <SelectField id="periodo" label="Período" defaultValue={sp.periodo ?? ""}>
            <option value="">Qualquer horário</option>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </SelectField>
          <InputField id="cidade" label="Cidade" defaultValue={sp.cidade ?? ""} placeholder="Ex.: Curitiba" />
          <InputField id="bairro" label="Bairro" defaultValue={sp.bairro ?? ""} placeholder="Ex.: Batel" />
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="experimental" value="1" defaultChecked={sp.experimental === "1"} className="size-5 accent-(--primary)" />
          <span>Só aulas que aceitam aula experimental</span>
        </label>
        {lat !== undefined && (
          <SelectField id="raio" label="Distância máxima" defaultValue={sp.raio ?? "10"}>
            {[2, 5, 10, 25, 50].map((r) => (
              <option key={r} value={r}>
                Até {r} km
              </option>
            ))}
          </SelectField>
        )}
        <div className="flex flex-wrap items-start gap-3">
          <Button type="submit">Buscar aulas</Button>
          <NearMeButton formId="busca-aulas" />
          {searched && (
            <Link href={routes.classes} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent hover:underline">
              Limpar filtros
            </Link>
          )}
        </div>
        {lat !== undefined && <p className="text-[13px] text-muted">Ordenado pela distância até a sua localização (não guardamos sua localização).</p>}
      </form>

      <section aria-labelledby="resultados" aria-live="polite">
        <h2 id="resultados" className="mb-3 font-display text-2xl font-semibold">
          {results.length} {results.length === 1 ? "aula encontrada" : "aulas encontradas"}
        </h2>
        {units.size > 0 && <LeafletMap markers={[...units.values()]} label="Mapa das academias encontradas" className="mb-4 h-80" />}
        {results.length === 0 ? (
          <EmptyState icon={SearchX} title="Nenhuma aula com esses filtros" description="Tente outro dia, um raio maior ou remova algum filtro." />
        ) : (
          <ul className="space-y-3">
            {results.map(({ class: c, distance_km }) => (
              <li key={c.id}>
                <article className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">
                      {c.name} <span className="font-normal text-muted">· {c.martial_art_name}</span>
                    </h3>
                    {distance_km != null && <span className="text-sm font-semibold tabular-nums">{distance_km.toLocaleString("pt-BR")} km</span>}
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold">{WEEKDAY_LABELS[c.weekday]}</span>, {formatTime(c.starts_at)}–{formatTime(c.ends_at)} ·{" "}
                    {CLASS_LEVEL_LABELS[c.level]}
                    {c.teacher_display_name && c.teacher_username && (
                      <>
                        {" "}· com{" "}
                        <Link href={routes.teacher(c.teacher_username)} className="hover:underline">
                          {c.teacher_display_name}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="mt-1 flex items-start gap-1.5 text-[13px] text-muted">
                    <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      <Link href={routes.academy(c.academy_slug)} className="font-semibold text-accent hover:underline">
                        {c.academy_name}
                      </Link>{" "}
                      · {formatAddress({ ...c, postal_code: null })}
                    </span>
                  </p>
                  {c.accepts_trial && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-sm bg-accent-soft px-1.5 py-0.5 text-[12px] font-semibold text-accent">
                      <Sparkles aria-hidden className="size-3" /> Aceita aula experimental
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
