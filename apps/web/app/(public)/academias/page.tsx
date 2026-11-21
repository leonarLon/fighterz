import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, Plus } from "lucide-react";
import { MEMBERSHIP_ROLE_LABELS } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField, SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Academias" };

export default async function AcademiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const art = sp.modalidade && /^[0-9a-f-]{36}$/i.test(sp.modalidade) ? sp.modalidade : undefined;

  const [{ data: arts }, { data: found }, mine, { data: featuredIds }] = await Promise.all([
    supabase.from("martial_arts").select("id, name").order("sort_order"),
    supabase.rpc("search_academies", {
      p_query: sp.q?.trim() || undefined,
      p_city: sp.cidade?.trim() || undefined,
      p_martial_art: art,
      p_limit: 50,
    }),
    user
      ? supabase
          .from("academy_memberships")
          .select("role, status, academies(slug, name)")
          .eq("user_id", user.id)
          .in("status", ["active", "pending"])
      : Promise.resolve({ data: [] }),
    supabase.rpc("featured_entities", { p_kind: "academy" }),
  ]);
  // Destaque (benefício de plano) vem primeiro e é sinalizado.
  const featured = new Set((featuredIds ?? []) as unknown as string[]);
  const academies = [...(found ?? [])].sort((a, b) => Number(featured.has(b.id)) - Number(featured.has(a.id)));

  const myAcademies = (mine.data ?? []) as unknown as { role: keyof typeof MEMBERSHIP_ROLE_LABELS; status: string; academies: { slug: string; name: string } }[];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Academias" description="Encontre academias por nome, cidade e modalidade." />
        {user && (
          <ButtonLink href={routes.newAcademy}>
            <Plus aria-hidden className="size-4" /> Cadastrar academia
          </ButtonLink>
        )}
      </div>

      {myAcademies.length > 0 && (
        <section aria-labelledby="minhas" className="mb-6">
          <h2 id="minhas" className="mb-2 font-display text-xl font-semibold">
            Meus vínculos
          </h2>
          <ul className="flex flex-wrap gap-2">
            {myAcademies.map((m) => (
              <li key={`${m.academies.slug}-${m.role}`}>
                <Link
                  href={["owner", "admin"].includes(m.role) && m.status === "active" ? routes.manageAcademy(m.academies.slug) : routes.academy(m.academies.slug)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm hover:bg-bg"
                >
                  <span className="font-semibold">{m.academies.name}</span>
                  <span className="text-muted">
                    {MEMBERSHIP_ROLE_LABELS[m.role]}
                    {m.status === "pending" ? " (pendente)" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form role="search" action={routes.academies} className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <InputField id="q" label="Nome" defaultValue={sp.q ?? ""} placeholder="Ex.: Tatame" />
        <InputField id="cidade" label="Cidade" defaultValue={sp.cidade ?? ""} placeholder="Ex.: Curitiba" />
        <SelectField id="modalidade" label="Modalidade" defaultValue={art ?? ""}>
          <option value="">Todas</option>
          {(arts ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <Button type="submit">Buscar</Button>
      </form>

      {(academies ?? []).length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma academia encontrada" description="Tente outro nome ou cidade." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(academies ?? []).map((a) => (
            <li key={a.id}>
              <Link href={routes.academy(a.slug)} className="block h-full rounded-lg border border-border bg-surface p-4 hover:bg-bg">
                <p className="flex items-center gap-1.5 font-display text-xl font-semibold">
                  {a.name}
                  {a.is_verified && <BadgeCheck aria-label="Verificada" className="size-5 text-accent" />}
                </p>
                {featured.has(a.id) && <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">Em destaque</p>}
                <p className="text-sm text-muted">{a.martial_arts.join(" · ")}</p>
                <p className="mt-1 text-[13px] text-muted">{a.cities.join(", ") || "Endereço não informado"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
