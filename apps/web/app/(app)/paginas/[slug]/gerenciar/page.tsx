import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { BUSINESS_CATEGORY_LABELS } from "@figtherz/core";
import { loadBusiness } from "@/lib/businesses";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { CoverImageUpload } from "@/components/media/cover-image-upload";
import { PlanStatusCard } from "@/components/plans/plan-status-card";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BusinessInfoSection, CatalogSection, MembersSection, PromotionsSection, VisibilitySection } from "./manage-sections";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Gerenciar página" };

// A checagem aqui é de UX: cada escrita é barrada no banco (RLS e funções) para quem não gerencia a página.
export default async function ManageBusinessPage({ params }: Props) {
  const user = await requireUser();
  const data = await loadBusiness((await params).slug);
  if (!data || !data.isManager) notFound();
  const supabase = await createClient();
  const { data: arts } = await supabase.from("martial_arts").select("id, name").order("sort_order");
  const { business } = data;

  return (
    <>
      <PageHeader
        title={business.name}
        description={`Página de ${BUSINESS_CATEGORY_LABELS[business.category].toLowerCase()}: dados, imagens, catálogo, promoções e administradores.`}
      />
      <p className="-mt-4 mb-6">
        <Link href={routes.business(business.slug)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <ExternalLink aria-hidden className="size-4" /> Ver página pública
        </Link>
      </p>
      <div className="space-y-6">
        <BusinessInfoSection data={data} arts={arts ?? []} />
        <Card>
          <h2 className="mb-1 font-display text-2xl font-semibold">Logo e banner</h2>
          <p className="mb-4 text-sm text-muted">Aparecem na página pública e nas publicações feitas como página.</p>
          <div className="space-y-6">
            <CoverImageUpload entity="business" entityId={business.id} slot="logo" path={business.logo_path} name={business.name} />
            <CoverImageUpload entity="business" entityId={business.id} slot="banner" path={business.cover_path} name={business.name} />
          </div>
        </Card>
        <PlanStatusCard kind="business" entityId={business.id} />
        <CatalogSection data={data} />
        <PromotionsSection data={data} />
        <MembersSection data={data} viewerId={user.id} />
        <VisibilitySection data={data} />
      </div>
    </>
  );
}
