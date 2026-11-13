import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Notificações" };

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notificações" />
      <EmptyState icon={Bell} title="Nada por aqui ainda" description="Curtidas, comentários e novos seguidores vão aparecer aqui." />
    </>
  );
}
