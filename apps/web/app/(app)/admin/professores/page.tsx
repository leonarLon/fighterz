import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewItem } from "./review-item";
import { requireAdmin } from "../access";

export const metadata: Metadata = { title: "Professores" };

const PAGE = 50;

// Professores são ativados pelo critério de graduação (migration 31), sem fila. Aqui o admin revoga ou reativa.
// Acesso: admin no servidor; o banco também nega (review_teacher e RLS).
export default async function AdminTeachersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; pagina?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim().replace(/^@/, "").slice(0, 60);
  const status = params.status === "revoked" ? "revoked" : "approved";
  const page = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("teacher_profiles")
    .select(
      "user_id, professional_name, bio, experience_years, lineage, certifications, status, review_notes, created_at, profiles!teacher_profiles_user_id_fkey!inner(username, display_name)",
      { count: "exact" },
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.ilike("professional_name", `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const { data, count } = await query;

  const items = (data ?? []).map((t) => ({
    userId: t.user_id,
    professionalName: t.professional_name,
    bio: t.bio,
    experienceYears: t.experience_years,
    lineage: t.lineage,
    certifications: (t.certifications as { title: string; issuer: string | null; year: number | null }[]) ?? [],
    username: (t.profiles as unknown as { username: string }).username,
    createdAt: t.created_at,
    status: t.status as "approved" | "revoked",
    reviewNotes: t.review_notes,
  }));
  const total = count ?? 0;
  const href = (p: number) => `${routes.adminTeachers}?${new URLSearchParams({ ...(q && { q }), status, pagina: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Professores"
        description="Perfis ativados automaticamente: faixa preta (ou equivalente) em pelo menos uma modalidade, ou modalidade sem graduação. Revogue quem não deveria ensinar na plataforma."
      />
      <form role="search" className="mb-4 flex flex-wrap gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar professor
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Nome profissional"
          className="min-h-11 min-w-56 flex-1 rounded-md border border-border bg-surface px-3"
        />
        <label htmlFor="status" className="sr-only">
          Situação
        </label>
        <select id="status" name="status" defaultValue={status} className="min-h-11 rounded-md border border-border bg-surface px-3">
          <option value="approved">Ativos</option>
          <option value="revoked">Revogados</option>
        </select>
        <Button type="submit" variant="secondary">
          <Search aria-hidden className="size-4" /> Buscar
        </Button>
      </form>
      <p className="mb-3 text-sm text-muted">
        {total} {total === 1 ? "professor" : "professores"} {status === "approved" ? "ativos" : "revogados"}
        {q ? ` com “${q}”` : ""}.
      </p>
      {items.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Nenhum professor encontrado" description="Ajuste a busca ou a situação." />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.userId}>
              <ReviewItem item={item} />
            </li>
          ))}
        </ul>
      )}
      {total > PAGE && (
        <nav aria-label="Páginas" className="mt-6 flex justify-between">
          {page > 1 ? <Link href={href(page - 1)} className="font-semibold text-accent hover:underline">← Anteriores</Link> : <span />}
          {page * PAGE < total && <Link href={href(page + 1)} className="font-semibold text-accent hover:underline">Próximos →</Link>}
        </nav>
      )}
    </>
  );
}
