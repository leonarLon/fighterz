import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { loadAcademy } from "@/lib/academies";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CoverImageUpload } from "@/components/media/cover-image-upload";
import { GalleryManager } from "@/components/media/gallery-manager";
import { PlanStatusCard } from "@/components/plans/plan-status-card";
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
      <PageHeader title={data.academy.name} description="Gerencie dados, imagens, unidades, grade de aulas e equipe." />
      <p className="-mt-4 mb-6">
        <Link href={routes.academy(data.academy.slug)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <ExternalLink aria-hidden className="size-4" /> Ver página pública
        </Link>
      </p>
      <div className="space-y-6">
        <AcademyInfoSection data={data} arts={arts ?? []} />
        <Card>
          <h2 className="mb-1 font-display text-2xl font-semibold">Logo, banner e galeria</h2>
          <p className="mb-4 text-sm text-muted">Aparecem na página pública da academia.</p>
          <div className="space-y-6">
            <div className="space-y-6">
              <CoverImageUpload entity="academy" entityId={data.academy.id} slot="logo" path={data.academy.logo_path} name={data.academy.name} />
              <CoverImageUpload entity="academy" entityId={data.academy.id} slot="banner" path={data.academy.cover_path} name={data.academy.name} />
            </div>
            <GalleryManager academyId={data.academy.id} photos={data.photos} limit={data.galleryLimit} />
          </div>
        </Card>
        <PlanStatusCard kind="academy" entityId={data.academy.id} />
        <UnitsSection data={data} />
        <ClassesSection data={data} />
        <TeamSection data={data} />
      </div>
    </>
  );
}
