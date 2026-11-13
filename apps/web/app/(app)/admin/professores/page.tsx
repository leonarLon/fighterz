import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { GraduationCap } from "lucide-react";
import { ReviewItem } from "./review-item";

export const metadata: Metadata = { title: "Aprovar professores" };

// Fila de aprovação de professores. O painel admin completo é a Fase 6; esta tela destrava a Fase 4.
// Acesso: has_role('admin') no servidor; o banco também nega (review_teacher e RLS).
export default async function AdminTeachersPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("has_role", { p_role: "admin" });
  if (!isAdmin) notFound();

  const { data } = await supabase
    .from("teacher_profiles")
    .select("user_id, professional_name, bio, experience_years, lineage, certifications, status, created_at, profiles!teacher_profiles_user_id_fkey(username, display_name)")
    .eq("status", "pending")
    .order("created_at");

  const items = (data ?? []).map((t) => ({
    userId: t.user_id,
    professionalName: t.professional_name,
    bio: t.bio,
    experienceYears: t.experience_years,
    lineage: t.lineage,
    certifications: (t.certifications as { title: string; issuer: string | null; year: number | null }[]) ?? [],
    username: (t.profiles as unknown as { username: string }).username,
    createdAt: t.created_at,
  }));

  return (
    <>
      <PageHeader title="Aprovar professores" description="Pedidos de perfil profissional aguardando análise." />
      {items.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Nenhum pedido pendente" description="Novos pedidos aparecem aqui." />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.userId}>
              <ReviewItem item={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
