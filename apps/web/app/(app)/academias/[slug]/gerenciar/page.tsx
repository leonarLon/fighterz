import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { loadAcademy } from "@/lib/academies";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { PageHeader } from "@/components/ui/page-header";
import { AcademyInfoSection, ClassesSection, TeamSection, UnitsSection } from "./manage-sections";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Gerenciar academia" };

// Painel da gestão. A checagem aqui é de UX: cada escrita é barrada pela RLS para quem não é owner/admin.
export default async function ManageAcademyPage({ params }: Props) {
  await requireUser();
  const data = await loadAcademy((await params).slug);
  if (!data || !data.isManager) notFound();
  const supabase = await createClient();
  const { data: arts } = await supabase.from("martial_arts").select("id, name").order("sort_order");

  return (
    <>
      <PageHeader title={data.academy.name} description="Gerencie dados, unidades, grade de aulas e equipe." />
      <p className="-mt-4 mb-6">
        <Link href={routes.academy(data.academy.slug)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <ExternalLink aria-hidden className="size-4" /> Ver página pública
        </Link>
      </p>
      <div className="space-y-6">
        <AcademyInfoSection data={data} arts={arts ?? []} />
        <UnitsSection data={data} />
        <ClassesSection data={data} />
        <TeamSection data={data} />
      </div>
    </>
  );
}
