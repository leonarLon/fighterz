"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { REPORT_REASON_LABELS, timeAgo, type ReportReason, type ReportTarget } from "@figtherz/core";
import { closeReports, moderateContent, suspendUser } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField } from "@/components/ui/field";

export type QueueEntry = {
  target_type: ReportTarget;
  target_id: string;
  report_count: number;
  reasons: ReportReason[];
  priority: boolean;
  first_reported_at: string;
  last_reported_at: string;
  details: string[] | null;
  owner_id: string | null;
  owner_username: string | null;
  owner_status: string | null;
  preview: string | null;
  link: string | null;
  content_state: string | null;
};

const TARGET_LABELS: Record<ReportTarget, string> = {
  post: "Post",
  comment: "Comentário",
  profile: "Perfil",
  academy: "Academia",
  event: "Evento",
};

export const STATE_LABELS: Record<string, string> = {
  visible: "visível",
  under_review: "oculto preventivamente",
  removed: "removido",
  deleted: "apagado pelo autor",
  active: "ativo",
  suspended: "suspenso",
  hidden: "oculto",
  published: "publicado",
  cancelled: "cancelado",
  draft: "rascunho",
};

const REMOVE_LABEL: Partial<Record<ReportTarget, string>> = {
  post: "Remover post",
  comment: "Remover comentário",
  academy: "Suspender academia",
  event: "Cancelar evento",
};

export function QueueItem({ item, closed, isAdmin }: { item: QueueEntry; closed: boolean; isAdmin: boolean }) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const id = `${item.target_type}-${item.target_id.slice(0, 8)}`;
  const removed = item.content_state === "removed" || (item.target_type === "academy" && item.content_state === "suspended");
  const canRestore = removed && item.target_type !== "event";
  const noReason = !reason.trim();

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => setResult(await fn()));
  }

  return (
    <article
      aria-labelledby={`${id}-title`}
      className={item.priority ? "rounded-lg border-2 border-danger bg-surface p-4" : "rounded-lg border border-border bg-surface p-4"}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="font-semibold">
            {TARGET_LABELS[item.target_type]}
            {item.owner_username ? ` de @${item.owner_username}` : ""}
            {item.owner_status && item.owner_status !== "active" ? ` (conta ${STATE_LABELS[item.owner_status] ?? item.owner_status})` : ""}
          </h2>
          <p className="text-[13px] text-muted">
            {item.report_count} {item.report_count === 1 ? "denúncia" : "denúncias"} · primeira {timeAgo(item.first_reported_at)}
            {item.content_state ? ` · ${STATE_LABELS[item.content_state] ?? item.content_state}` : ""}
          </p>
        </div>
        {item.priority && (
          <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-[13px] font-semibold text-danger">
            <AlertTriangle aria-hidden className="size-4" /> Segurança de menores
          </span>
        )}
      </header>

      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Motivos">
        {item.reasons.map((r) => (
          <li key={r} className="rounded bg-bg px-2 py-0.5 text-[13px]">
            {REPORT_REASON_LABELS[r]}
          </li>
        ))}
      </ul>
      {item.preview && <blockquote className="mt-3 whitespace-pre-line border-l-4 border-border pl-3 text-sm">{item.preview}</blockquote>}
      {item.details && item.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-[13px] text-muted" aria-label="Detalhes enviados">
          {item.details.map((d, i) => (
            <li key={i}>“{d}”</li>
          ))}
        </ul>
      )}
      {item.link && (
        <Link href={item.link} className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
          Abrir conteúdo
        </Link>
      )}

      {result ? (
        <p role="status" className={result.ok ? "mt-3 text-sm font-medium text-success" : "mt-3 text-sm font-medium text-danger"}>
          {result.message}
        </p>
      ) : (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <TextareaField
            id={`${id}-reason`}
            label="Motivo da decisão"
            rows={2}
            maxLength={1000}
            help="Fica no histórico de moderação. Obrigatório para remover, restaurar ou suspender."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {!closed && !removed && REMOVE_LABEL[item.target_type] && (
              <Button
                variant="outline-danger"
                disabled={pending || noReason}
                onClick={() => run(() => moderateContent(item.target_type, item.target_id, true, reason))}
              >
                {REMOVE_LABEL[item.target_type]}
              </Button>
            )}
            {canRestore && (
              <Button
                variant="secondary"
                disabled={pending || noReason}
                onClick={() => run(() => moderateContent(item.target_type, item.target_id, false, reason))}
              >
                Restaurar
              </Button>
            )}
            {!closed && (
              <Button variant="secondary" disabled={pending} onClick={() => run(() => closeReports(item.target_type, item.target_id, true, reason))}>
                Descartar denúncias
              </Button>
            )}
          </div>
          {item.owner_id && item.owner_status === "active" && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-44">
                <SelectField id={`${id}-days`} label="Suspender a conta por" value={days} onChange={(e) => setDays(e.target.value)}>
                  <option value="1">1 dia</option>
                  <option value="3">3 dias</option>
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  {isAdmin && <option value="90">90 dias</option>}
                  {isAdmin && <option value="ban">Sem prazo (banir)</option>}
                </SelectField>
              </div>
              <Button
                variant="outline-danger"
                disabled={pending || noReason}
                onClick={() => run(() => suspendUser(item.owner_id!, days === "ban" ? null : Number(days), reason))}
              >
                Suspender @{item.owner_username}
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
