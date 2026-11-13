"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDateTime } from "@figtherz/core";
import { setPlatformRole, suspendUser, unsuspendUser } from "@/app/actions/admin";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/field";

type Role = "moderator" | "admin" | "superadmin";

export type AdminUser = {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  status: "active" | "suspended" | "deleted";
  suspended_until: string | null;
  suspension_reason: string | null;
  roles: Role[];
  post_count: number;
  open_reports: number;
  created_at: string;
};

const ROLE_LABELS: Record<Role, string> = { moderator: "Moderador", admin: "Admin", superadmin: "Superadmin" };

export function UserRow({
  user,
  access,
  isSelf,
}: {
  user: AdminUser;
  access: { admin: boolean; superadmin: boolean };
  isSelf: boolean;
}) {
  const [status, setStatus] = useState(user.status);
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  const [notice, setNotice] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const id = `u-${user.id.slice(0, 8)}`;
  const isStaff = roles.length > 0;

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, onOk?: () => void) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result);
      if (result.ok) onOk?.();
    });
  }

  return (
    <article aria-labelledby={`${id}-name`} className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={`${id}-name`} className="font-semibold">
            {status === "active" ? (
              <Link href={routes.profile(user.username)} className="hover:underline">
                {user.display_name}
              </Link>
            ) : (
              user.display_name
            )}{" "}
            <span className="font-normal text-muted">@{user.username}</span>
          </h2>
          <p className="text-[13px] text-muted">
            {user.email ? `${user.email} · ` : ""}
            {user.post_count} posts · desde {formatDateTime(user.created_at)}
            {user.open_reports > 0 ? ` · ${user.open_reports} denúncias abertas` : ""}
          </p>
          {roles.length > 0 && <p className="text-[13px] font-semibold text-accent">{roles.map((r) => ROLE_LABELS[r]).join(", ")}</p>}
          {status === "suspended" && (
            <p className="mt-1 text-sm text-danger">
              Suspensa {user.suspended_until ? `até ${formatDateTime(user.suspended_until)}` : "sem prazo (banida)"}
              {user.suspension_reason ? `. Motivo: ${user.suspension_reason}` : ""}
            </p>
          )}
        </div>
      </div>

      {notice && (
        <p role="status" className={notice.ok ? "mt-2 text-sm font-medium text-success" : "mt-2 text-sm font-medium text-danger"}>
          {notice.message}
        </p>
      )}

      {!isSelf && (
        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Ações</summary>
          <div className="mt-2 space-y-3">
            {!isStaff && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-56 flex-1">
                  <InputField id={`${id}-reason`} label="Motivo" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                {status === "active" ? (
                  <>
                    <div className="w-40">
                      <SelectField id={`${id}-days`} label="Prazo" value={days} onChange={(e) => setDays(e.target.value)}>
                        <option value="1">1 dia</option>
                        <option value="3">3 dias</option>
                        <option value="7">7 dias</option>
                        <option value="30">30 dias</option>
                        {access.admin && <option value="90">90 dias</option>}
                        {access.admin && <option value="ban">Sem prazo</option>}
                      </SelectField>
                    </div>
                    <Button
                      variant="outline-danger"
                      disabled={pending || !reason.trim()}
                      onClick={() => run(() => suspendUser(user.id, days === "ban" ? null : Number(days), reason), () => setStatus("suspended"))}
                    >
                      Suspender
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" disabled={pending} onClick={() => run(() => unsuspendUser(user.id, reason), () => setStatus("active"))}>
                    Reativar conta
                  </Button>
                )}
              </div>
            )}
            {access.superadmin && (
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Papéis na plataforma</legend>
                <div className="flex flex-wrap gap-4">
                  {(["moderator", "admin", "superadmin"] as Role[]).map((role) => (
                    <label key={role} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={roles.includes(role)}
                        disabled={pending}
                        onChange={(e) => {
                          const grant = e.target.checked;
                          run(
                            () => setPlatformRole(user.id, role, grant),
                            () => setRoles((cur) => (grant ? [...cur, role] : cur.filter((r) => r !== role))),
                          );
                        }}
                        className="size-5 accent-(--primary)"
                      />
                      {ROLE_LABELS[role]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {isStaff && !access.superadmin && <p className="text-[13px] text-muted">Contas da equipe só são moderadas por um superadmin.</p>}
          </div>
        </details>
      )}
    </article>
  );
}
