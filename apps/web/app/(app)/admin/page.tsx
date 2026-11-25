import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { PageHeader } from "@/components/ui/page-header";
import { getStaffAccess } from "./access";

export const metadata: Metadata = { title: "Painel de administração" };

export default async function AdminOverviewPage() {
  const access = await getStaffAccess();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_admin_overview");
  const o = (data ?? {}) as Record<string, number>;

  const attention = [
    { label: "Alvos com denúncias abertas", value: o.open_reports, href: routes.adminReports },
    { label: "Envolvendo segurança de menores", value: o.priority_reports, href: routes.adminReports, urgent: true },
    { label: "Ocultos aguardando revisão", value: o.under_review, href: routes.adminReports },
    { label: "Contas suspensas", value: o.suspended_users, href: `${routes.adminUsers}?status=suspended` },
    { label: "Publicidade em perfis pessoais (revisões e recursos)", value: o.open_commercial, href: routes.adminCommercial },
  ];
  const numbers = [
    { label: "Usuários", value: o.users },
    { label: "Novos em 7 dias", value: o.new_users_7d },
    { label: "Posts nas últimas 24 h", value: o.posts_24h },
    { label: "Academias", value: o.academies },
    { label: "Páginas comerciais", value: o.businesses },
    ...(access.admin ? [{ label: "Assinaturas ativas", value: o.active_subscriptions }] : []),
    { label: "Eventos por vir", value: o.upcoming_events },
  ];

  return (
    <>
      <PageHeader
        title="Painel de administração"
        description={access.admin ? "Moderação, aprovações e configurações da plataforma." : "Fila de moderação e contas."}
      />
      <section aria-labelledby="atencao" className="mb-8">
        <h2 id="atencao" className="mb-3 font-display text-2xl font-semibold">
          Precisa de atenção
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attention.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={
                  item.urgent && item.value > 0
                    ? "block rounded-lg border-2 border-danger bg-surface p-4 hover:bg-bg"
                    : "block rounded-lg border border-border bg-surface p-4 hover:bg-bg"
                }
              >
                <span className="block font-display text-3xl font-bold tabular-nums">{item.value ?? 0}</span>
                <span className="text-sm text-muted">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="numeros">
        <h2 id="numeros" className="mb-3 font-display text-2xl font-semibold">
          Números
        </h2>
        <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {numbers.map((n) => (
            <div key={n.label} className="rounded-lg border border-border bg-surface p-4">
              <dt className="text-sm text-muted">{n.label}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{n.value ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
