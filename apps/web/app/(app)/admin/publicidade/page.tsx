import type { Metadata } from "next";
import Link from "next/link";
import { COMMERCIAL_REVIEW_THRESHOLD, formatDateTime } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireModerator } from "../access";
import { AppealDecision, ReasonList, ReviewDecision, type Reason } from "./review-actions";

export const metadata: Metadata = { title: "Publicidade · Administração" };

const STATUS: Record<string, string> = {
  dismissed: "Arquivada (não era publicidade)",
  warned: "Avisada",
  actioned: "Posts removidos",
  reverted: "Desfeita por recurso",
};

// Fila de publicidade em perfis pessoais. Detecção por regras explicáveis; a decisão é sempre humana.
export default async function AdminCommercialPage() {
  await requireModerator();
  const supabase = await createClient();
  const profile = "profiles!commercial_reviews_user_id_fkey(username, display_name)";
  const [{ data: open }, { data: appeals }, { data: decided }] = await Promise.all([
    supabase.from("commercial_reviews").select(`id, score, reasons, opened_at, ${profile}`).eq("status", "open").order("score", { ascending: false }).limit(50),
    supabase
      .from("commercial_appeals")
      .select("id, message, created_at, review_id, commercial_reviews(status, decision_note, reasons, score), profiles!commercial_appeals_user_id_fkey(username, display_name)")
      .eq("status", "open")
      .order("created_at")
      .limit(50),
    supabase
      .from("commercial_reviews")
      .select(`id, status, score, decided_at, decision_note, ${profile}`)
      .neq("status", "open")
      .order("decided_at", { ascending: false })
      .limit(20),
  ]);
  type P = { username: string; display_name: string } | null;

  return (
    <>
      <PageHeader
        title="Publicidade em perfis pessoais"
        description={`Perfis com risco a partir de ${COMMERCIAL_REVIEW_THRESHOLD} entram aqui. Nada é removido nem suspenso sem uma decisão sua, e a pessoa pode recorrer. Posts feitos como página comercial não entram na conta.`}
      />

      <section aria-labelledby="fila" className="mb-8">
        <h2 id="fila" className="mb-3 font-display text-2xl font-semibold">
          Para revisar ({(open ?? []).length})
        </h2>
        {(open ?? []).length === 0 ? (
          <p className="text-muted">Nenhum perfil na fila.</p>
        ) : (
          <ul className="space-y-3">
            {(open ?? []).map((r) => {
              const p = r.profiles as unknown as P;
              return (
                <li key={r.id}>
                  <Card className="p-4 sm:p-4" role="group" aria-label={`Revisão de @${p?.username}`}>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <Link href={routes.profile(p?.username ?? "")} className="font-semibold hover:underline">
                        {p?.display_name} <span className="font-normal text-muted">@{p?.username}</span>
                      </Link>
                      <p className="text-sm">
                        Risco <span className="font-semibold">{r.score}</span>
                        <span className="text-muted"> · desde {formatDateTime(r.opened_at)}</span>
                      </p>
                    </div>
                    <ReasonList reasons={r.reasons as unknown as Reason[]} />
                    <ReviewDecision reviewId={r.id} username={p?.username ?? ""} />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="recursos" className="mb-8">
        <h2 id="recursos" className="mb-3 font-display text-2xl font-semibold">
          Recursos ({(appeals ?? []).length})
        </h2>
        {(appeals ?? []).length === 0 ? (
          <p className="text-muted">Nenhum recurso aguardando.</p>
        ) : (
          <ul className="space-y-3">
            {(appeals ?? []).map((a) => {
              const p = a.profiles as unknown as P;
              const review = a.commercial_reviews as unknown as { status: string; decision_note: string | null; reasons: Reason[]; score: number } | null;
              return (
                <li key={a.id}>
                  <Card className="p-4 sm:p-4" role="group" aria-label={`Recurso de @${p?.username}`}>
                    <p className="font-semibold">
                      {p?.display_name} <span className="font-normal text-muted">@{p?.username}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Decisão: {STATUS[review?.status ?? ""] ?? review?.status}
                      {review?.decision_note ? ` · ${review.decision_note}` : ""}
                    </p>
                    <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm whitespace-pre-line">{a.message}</blockquote>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold">Motivos da revisão</summary>
                      <ReasonList reasons={review?.reasons ?? []} />
                    </details>
                    <AppealDecision appealId={a.id} username={p?.username ?? ""} />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="decididas">
        <h2 id="decididas" className="mb-3 font-display text-2xl font-semibold">
          Decisões recentes
        </h2>
        {(decided ?? []).length === 0 ? (
          <p className="text-muted">Nenhuma decisão ainda.</p>
        ) : (
          <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
            {(decided ?? []).map((r) => {
              const p = r.profiles as unknown as P;
              return (
                <li key={r.id} className="px-4 py-2 text-sm">
                  <span className="font-semibold">@{p?.username}</span> · {STATUS[r.status] ?? r.status}
                  <span className="text-muted">
                    {" "}
                    · risco {r.score} · {r.decided_at ? formatDateTime(r.decided_at) : ""}
                    {r.decision_note ? ` · ${r.decision_note}` : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
