import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Store } from "lucide-react";
import { BUSINESS_CATEGORY_LABELS } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField, SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { getStaffAccess } from "../access";
import { TargetActions } from "../target-actions";

export const metadata: Metadata = { title: "Páginas comerciais · Administração" };

export default async function AdminBusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const access = await getStaffAccess();
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[%_,()*\\]/g, "").trim().slice(0, 60);
  const status = sp.status === "suspended" || sp.status === "active" || sp.status === "hidden" ? sp.status : "";
  const supabase = await createClient();

  let query = supabase
    .from("businesses")
    .select("id, slug, name, category, status, is_verified, created_at, profiles!businesses_created_by_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.ilike("name", `%${q}%`);
  if (status) query = query.eq("status", status);
  const { data } = await query;

  return (
    <>
      <PageHeader title="Páginas comerciais" description="Marcas, lojas e serviços: selo de verificação (admin) e suspensão (moderação). Denúncias de páginas chegam em Denúncias." />
      <form role="search" action={routes.adminBusinesses} className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <InputField id="q" label="Nome" defaultValue={q} />
        <SelectField id="status" label="Situação" defaultValue={status}>
          <option value="">Todas</option>
          <option value="active">Ativas</option>
          <option value="hidden">Ocultas pela gestão</option>
          <option value="suspended">Suspensas</option>
        </SelectField>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>
      {(data ?? []).length === 0 ? (
        <EmptyState icon={Store} title="Nenhuma página encontrada" description="Mude a busca ou o filtro." />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((a) => (
            <li key={a.id} className="rounded-lg border border-border bg-surface p-4">
              <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                <Link href={routes.business(a.slug)} className="hover:underline">
                  {a.name}
                </Link>
                {a.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[13px] text-accent">
                    <BadgeCheck aria-hidden className="size-4" /> Verificada
                  </span>
                )}
                {a.status !== "active" && (
                  <span className="rounded bg-danger/10 px-1.5 text-[13px] text-danger">{a.status === "suspended" ? "Suspensa" : "Oculta pela gestão"}</span>
                )}
              </h2>
              <p className="text-[13px] text-muted">
                {BUSINESS_CATEGORY_LABELS[a.category]} · criada por @{(a.profiles as unknown as { username: string } | null)?.username ?? "?"}
              </p>
              <TargetActions
                targetType="business"
                targetId={a.id}
                removed={a.status === "suspended"}
                removeLabel="Suspender página"
                restorable
                verified={a.is_verified}
                canVerify={access.admin}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
