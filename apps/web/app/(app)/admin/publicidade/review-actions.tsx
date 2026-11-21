"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COMMERCIAL_SIGNAL_LABELS, type CommercialSignalCode } from "@figtherz/core";
import { decideCommercialAppeal, decideCommercialReview } from "@/app/actions/commercial";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";

export type Reason = { source: "post" | "bio"; post_id?: string; code: CommercialSignalCode; points: number; excerpt: string | null };

/** Cada ponto do risco com o motivo e o trecho, agrupado por post (explicável). */
export function ReasonList({ reasons }: { reasons: Reason[] }) {
  const groups = new Map<string, Reason[]>();
  for (const r of reasons) {
    const key = r.source === "bio" ? "bio" : (r.post_id ?? "post");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return (
    <ul className="mt-2 space-y-2 text-sm">
      {[...groups.entries()].map(([key, items]) => (
        <li key={key} className="rounded-md border border-border px-3 py-2">
          <p className="mb-1 font-semibold">
            {key === "bio" ? (
              "Bio do perfil"
            ) : (
              <Link href={routes.post(key)} className="text-accent hover:underline">
                Post
              </Link>
            )}
            <span className="font-normal text-muted"> · {Math.max(0, items.reduce((a, b) => a + b.points, 0))} pontos</span>
          </p>
          <ul className="space-y-0.5">
            {items.map((r, i) => (
              <li key={i}>
                <span className={r.points < 0 ? "text-success" : ""}>
                  {r.points > 0 ? `+${r.points}` : r.points}
                </span>{" "}
                {COMMERCIAL_SIGNAL_LABELS[r.code] ?? r.code}
                {r.excerpt && <span className="text-muted"> · “{r.excerpt}”</span>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function useRun() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      setNotice({ ok: result.ok, text: result.message ?? "" });
      if (result.ok) router.refresh();
    });
  return { pending, notice, run };
}

function Notice({ notice }: { notice: { ok: boolean; text: string } | null }) {
  return (
    <p aria-live="polite" className={notice?.ok === false ? "text-[13px] text-danger empty:hidden" : "text-[13px] text-success empty:hidden"}>
      {notice?.text ?? ""}
    </p>
  );
}

export function ReviewDecision({ reviewId, username }: { reviewId: string; username: string }) {
  const [note, setNote] = useState("");
  const { pending, notice, run } = useRun();
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <TextareaField
        id={`note-${reviewId.slice(0, 8)}`}
        label={`Motivo da decisão sobre @${username} (obrigatório para avisar ou remover)`}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => run(() => decideCommercialReview(reviewId, "dismiss", note))}>
          Não é publicidade
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => run(() => decideCommercialReview(reviewId, "warn", note))}>
          Avisar (sugerir página comercial)
        </Button>
        <Button variant="ghost" className="text-danger" disabled={pending} onClick={() => run(() => decideCommercialReview(reviewId, "remove_posts", note))}>
          Remover posts e avisar
        </Button>
      </div>
      <Notice notice={notice} />
    </div>
  );
}

export function AppealDecision({ appealId, username }: { appealId: string; username: string }) {
  const [response, setResponse] = useState("");
  const { pending, notice, run } = useRun();
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <TextareaField
        id={`response-${appealId.slice(0, 8)}`}
        label={`Resposta para @${username}`}
        rows={2}
        maxLength={1000}
        value={response}
        onChange={(e) => setResponse(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => run(() => decideCommercialAppeal(appealId, true, response))}>
          Aceitar recurso (desfazer)
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => decideCommercialAppeal(appealId, false, response))}>
          Manter decisão
        </Button>
      </div>
      <Notice notice={notice} />
    </div>
  );
}
