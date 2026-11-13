import type { Metadata } from "next";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField, SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getStaffAccess } from "../access";
import { UserRow, type AdminUser } from "./user-row";

export const metadata: Metadata = { title: "Usuários" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const access = await getStaffAccess();
  const me = await getCurrentUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const status = sp.status === "suspended" || sp.status === "active" ? sp.status : undefined;
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_search_users", { p_query: q || undefined, p_status: status, p_limit: 50 });
  const users = (data ?? []) as AdminUser[];

  return (
    <>
      <PageHeader
        title="Usuários"
        description={access.admin ? "Busque por nome, @usuário ou e-mail." : "Busque por nome ou @usuário. O e-mail só aparece para administradores."}
      />
      <form role="search" action={routes.adminUsers} className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <InputField id="q" label="Buscar" defaultValue={q} />
        <SelectField id="status" label="Situação" defaultValue={status ?? ""}>
          <option value="">Todas</option>
          <option value="active">Ativas</option>
          <option value="suspended">Suspensas</option>
        </SelectField>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>
      {users.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Mude a busca ou o filtro." />
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id}>
              <UserRow user={u} access={access} isSelf={u.id === me?.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
