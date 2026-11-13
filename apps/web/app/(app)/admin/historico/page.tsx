import type { Metadata } from "next";
import { formatDateTime } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { getStaffAccess } from "../access";

export const metadata: Metadata = { title: "Histórico · Administração" };

const ACTION_LABELS: Record<string, string> = {
  remove_content: "Removeu conteúdo",
  restore_content: "Restaurou conteúdo",
  dismiss_reports: "Fechou denúncias",
  warn: "Advertiu",
  suspend: "Suspendeu conta",
  unsuspend: "Reativou conta",
  ban: "Baniu conta",
  verify: "Verificou academia",
  unverify: "Removeu verificação",
};

const TARGET_LABELS: Record<string, string> = {
  post: "post",
  comment: "comentário",
  profile: "perfil",
  academy: "academia",
  event: "evento",
};

/** Registros append-only: moderação (moderador+) e auditoria administrativa (admin). */
export default async function AdminHistoryPage() {
  const access = await getStaffAccess();
  const supabase = await createClient();
  const [{ data: actions }, audit] = await Promise.all([
    supabase
      .from("moderation_actions")
      .select("id, action, target_type, target_id, reason, expires_at, created_at, profiles!moderation_actions_moderator_id_fkey(username)")
      .order("created_at", { ascending: false })
      .limit(100),
    access.admin
      ? supabase
          .from("admin_audit_log")
          .select("id, action, target_type, target_id, created_at, actor_id")
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as { id: string; action: string; target_type: string; target_id: string | null; created_at: string; actor_id: string | null }[] }),
  ]);

  return (
    <>
      <PageHeader title="Histórico" description="Nada aqui pode ser alterado ou apagado, nem pela equipe." />
      <section aria-labelledby="moderacao" className="mb-8">
        <h2 id="moderacao" className="mb-3 font-display text-2xl font-semibold">
          Moderação
        </h2>
        {(actions ?? []).length === 0 ? (
          <p className="text-muted">Nenhuma ação ainda.</p>
        ) : (
          <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
            {(actions ?? []).map((a) => (
              <li key={a.id} className="px-4 py-2 text-sm">
                <p>
                  <span className="font-semibold">{ACTION_LABELS[a.action] ?? a.action}</span> ({TARGET_LABELS[a.target_type]}) ·{" "}
                  {(a.profiles as unknown as { username: string } | null)?.username ? `@${(a.profiles as unknown as { username: string }).username}` : "rotina automática"}
                </p>
                <p className="text-[13px] text-muted">
                  {formatDateTime(a.created_at)}
                  {a.expires_at ? ` · até ${formatDateTime(a.expires_at)}` : ""}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
      {access.admin && (
        <section aria-labelledby="auditoria">
          <h2 id="auditoria" className="mb-3 font-display text-2xl font-semibold">
            Auditoria administrativa
          </h2>
          <p className="mb-3 text-sm text-muted">Papéis, aprovações de professor, modalidades e configurações.</p>
          <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
            {(audit.data ?? []).map((a) => (
              <li key={a.id} className="px-4 py-2 text-sm">
                <span className="font-semibold">{a.action}</span> em {a.target_type}
                <span className="text-[13px] text-muted"> · {formatDateTime(a.created_at)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
