import type { Metadata } from "next";
import { SquarePen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Publicar" };

export default function PublishPage() {
  return (
    <>
      <PageHeader title="Publicar" description="Post, check-in de treino ou conquista." />
      <EmptyState icon={SquarePen} title="Em breve" description="A criação de publicações chega na próxima fase." />
    </>
  );
}
