import type { ReactNode } from "react";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { AdminNav, type AdminNavItem } from "./admin-nav";
import { requireModerator } from "./access";

// Painel só existe para moderadores, admins e superadmins (404 para os demais).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await requireModerator();
  const supabase = await createClient();
  const { data: overview } = await supabase.rpc("get_admin_overview");
  const o = (overview ?? {}) as Record<string, number>;

  const items: AdminNavItem[] = [
    { href: routes.admin, label: "Visão geral" },
    { href: routes.adminReports, label: "Denúncias", badge: o.open_reports },
    { href: routes.adminUsers, label: "Usuários" },
    ...(access.admin ? [{ href: routes.adminTeachers, label: "Professores", badge: o.pending_teachers }] : []),
    { href: routes.adminAcademies, label: "Academias" },
    { href: routes.adminEvents, label: "Eventos" },
    ...(access.admin
      ? [
          { href: routes.adminPlans, label: "Planos" },
          { href: routes.adminSubscriptions, label: "Assinaturas" },
          { href: routes.adminMartialArts, label: "Modalidades" },
        ]
      : []),
    { href: routes.adminHistory, label: "Histórico" },
    ...(access.admin ? [{ href: routes.adminSettings, label: "Configurações" }] : []),
  ];

  return (
    <>
      <AdminNav items={items} />
      {children}
    </>
  );
}
