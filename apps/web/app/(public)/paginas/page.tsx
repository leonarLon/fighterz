import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Plus, Store } from "lucide-react";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_LABELS, type BusinessCategory } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { PageLogo } from "@/components/media/page-banner";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField, SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { InviteResponse } from "./invite-response";

export const metadata: Metadata = { title: "Marcas, lojas e serviços" };

// Diretório público das páginas comerciais. Logado: minhas páginas e convites para administrar.
export default async function BusinessesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const category = BUSINESS_CATEGORIES.includes(sp.tipo as BusinessCategory) ? (sp.tipo as BusinessCategory) : undefined;
  const q = sp.q?.trim().slice(0, 80);

  let query = supabase
    .from("businesses")
    .select("id, slug, name, category, city, state, logo_path, is_verified")
    .eq("status", "active")
    .order("is_verified", { ascending: false })
    .order("name")
    .limit(50);
  if (category) query = query.eq("category", category);
  // Escapa curingas do ILIKE para buscar o texto literal.
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);

  const [{ data: rows }, mine, { data: featuredIds }] = await Promise.all([
    query,
    user
      ? supabase.from("business_members").select("role, status, businesses(id, slug, name)").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    supabase.rpc("featured_entities", { p_kind: "business" }),
  ]);
  // Destaque (benefício de plano) vem primeiro e é sinalizado: nunca disfarçado de resultado comum.
  const featured = new Set((featuredIds ?? []) as unknown as string[]);
  const list = [...(rows ?? [])].sort((a, b) => Number(featured.has(b.id)) - Number(featured.has(a.id)));
  const myPages = (mine.data ?? []) as unknown as {
    role: "owner" | "admin";
    status: "pending" | "active";
    businesses: { id: string; slug: string; name: string } | null;
  }[];
  const active = myPages.filter((m) => m.status === "active" && m.businesses);
  const invites = myPages.filter((m) => m.status === "pending" && m.businesses);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Marcas, lojas e serviços" description="Páginas comerciais do mundo das lutas, separadas dos perfis pessoais." />
        {user && (
          <ButtonLink href={routes.newBusiness}>
            <Plus aria-hidden className="size-4" /> Criar página
          </ButtonLink>
        )}
      </div>

      {sp.excluida && <p role="status" className="mb-4 rounded-md border border-border px-3 py-2 text-sm">Página excluída.</p>}

      {invites.length > 0 && (
        <section id="convites" aria-labelledby="convites-titulo" className="mb-6">
          <h2 id="convites-titulo" className="mb-2 font-display text-xl font-semibold">
            Convites para administrar
          </h2>
          <ul className="space-y-2">
            {invites.map((m) => (
              <li key={m.businesses!.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
                <span>
                  <Link href={routes.business(m.businesses!.slug)} className="font-semibold hover:underline">
                    {m.businesses!.name}
                  </Link>
                  <span className="text-muted"> · convite para administrador</span>
                </span>
                <InviteResponse businessId={m.businesses!.id} slug={m.businesses!.slug} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section aria-labelledby="minhas-paginas" className="mb-6">
          <h2 id="minhas-paginas" className="mb-2 font-display text-xl font-semibold">
            Minhas páginas
          </h2>
          <ul className="flex flex-wrap gap-2">
            {active.map((m) => (
              <li key={m.businesses!.id}>
                <Link
                  href={routes.manageBusiness(m.businesses!.slug)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm hover:bg-bg"
                >
                  <span className="font-semibold">{m.businesses!.name}</span>
                  <span className="text-muted">{m.role === "owner" ? "Dono" : "Administrador"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form role="search" action={routes.businesses} className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <InputField id="q" label="Nome" defaultValue={q ?? ""} placeholder="Ex.: kimonos" />
        <SelectField id="tipo" label="Tipo" defaultValue={category ?? ""}>
          <option value="">Todos</option>
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {BUSINESS_CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        <Button type="submit">Buscar</Button>
      </form>

      {(list ?? []).length === 0 ? (
        <EmptyState icon={Store} title="Nenhuma página encontrada" description="Tente outro nome ou tipo." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(list ?? []).map((b) => (
            <li key={b.id}>
              <Link href={routes.business(b.slug)} className="flex h-full items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-bg">
                <PageLogo path={b.logo_path} className="size-12" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-display text-xl font-semibold">
                    {b.name}
                    {b.is_verified && <BadgeCheck aria-label="Verificada" className="size-5 text-accent" />}
                  </span>
                  {featured.has(b.id) && <span className="text-[12px] font-semibold uppercase tracking-wide text-accent">Em destaque</span>}
                  <span className="block text-sm text-muted">
                    {BUSINESS_CATEGORY_LABELS[b.category]}
                    {b.city ? ` · ${b.city}${b.state ? `/${b.state}` : ""}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
