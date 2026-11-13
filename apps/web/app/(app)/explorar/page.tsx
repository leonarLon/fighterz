import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Explorar" };

export default function ExplorePage() {
  return (
    <>
      <PageHeader title="Explorar" description="Publicações em alta, academias e professores." />
      <EmptyState icon={Compass} title="Em breve" description="O Explorar chega junto com as publicações." />
    </>
  );
}
