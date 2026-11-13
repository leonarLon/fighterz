import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getStaffAccess } from "../access";
import { QueueItem, type QueueEntry } from "./queue-item";

export const metadata: Metadata = { title: "Denúncias" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ mostrar?: string }> }) {
  const access = await getStaffAccess();
  const closed = (await searchParams).mostrar === "fechadas";
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_report_queue", { p_status: closed ? "closed" : "open", p_limit: 100 });
  const items = (data ?? []) as unknown as QueueEntry[];

  return (
    <>
      <PageHeader
        title="Denúncias"
        description="Agrupadas por conteúdo. Segurança de menores primeiro, depois as com mais denúncias e as mais antigas."
      />
      <p className="mb-4 flex gap-4 text-sm">
        <Link href={routes.adminReports} aria-current={!closed ? "page" : undefined} className="font-semibold text-accent aria-[current=page]:underline">
          Abertas
        </Link>
        <Link
          href={`${routes.adminReports}?mostrar=fechadas`}
          aria-current={closed ? "page" : undefined}
          className="font-semibold text-accent aria-[current=page]:underline"
        >
          Fechadas
        </Link>
      </p>
      {items.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={closed ? "Nenhuma denúncia fechada" : "Fila vazia"} description="Nada aguardando decisão." />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={`${item.target_type}-${item.target_id}`}>
              <QueueItem item={item} closed={closed} isAdmin={access.admin} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
