import type { Metadata } from "next";
import { ShieldCheck, Store } from "lucide-react";
import { formatDateTime } from "@figtherz/core";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ReasonList, type Reason } from "../admin/publicidade/review-actions";
import { AppealForm } from "./appeal-form";

export const metadata: Metadata = { title: "Revisões de publicidade" };

const STATUS: Record<string, string> = {
  warned: "Aviso da moderação",
  actioned: "Posts removidos pela moderação",
  reverted: "Decisão desfeita após recurso",
};

const APPEAL: Record<string, string> = { open: "Recurso em análise", accepted: "Recurso aceito", rejected: "Recurso negado" };

// Transparência: a pessoa vê por que o perfil foi revisado (cada motivo e trecho) e pode recorrer.
export default async function CommercialReviewsPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("commercial_reviews")
    .select("id, status, score, reasons, decided_at, decision_note, commercial_appeals(status, message, response, decided_at)")
    .order("decided_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Revisões de publicidade"
        description="Perfis pessoais são para treinos, conquistas e comunidade. Venda e divulgação ficam numa página comercial gratuita. A detecção usa regras simples e públicas; quem decide é uma pessoa da equipe."
      />
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          <Store aria-hidden className="size-5 text-accent" /> Vende produtos ou serviços? Crie uma página e publique como ela.
        </p>
        <ButtonLink href={routes.newBusiness} variant="secondary">
          Criar página comercial
        </ButtonLink>
      </Card>
      {(reviews ?? []).length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nenhuma revisão" description="Seu perfil não tem avisos de publicidade." />
      ) : (
        <ul className="space-y-4">
          {(reviews ?? []).map((r) => {
            // review_id é único: o PostgREST devolve o recurso como objeto (ou lista, conforme a versão).
            type Appeal = { status: string; message: string; response: string | null };
            const raw = r.commercial_appeals as unknown as Appeal | Appeal[] | null;
            const appeal = Array.isArray(raw) ? (raw[0] ?? null) : raw;
            return (
              <li key={r.id}>
                <Card>
                  <h2 className="font-display text-xl font-semibold">{STATUS[r.status] ?? r.status}</h2>
                  <p className="text-sm text-muted">
                    {r.decided_at ? formatDateTime(r.decided_at) : ""}
                    {r.decision_note ? ` · ${r.decision_note}` : ""}
                  </p>
                  <h3 className="mt-3 text-sm font-semibold">O que a detecção encontrou</h3>
                  <ReasonList reasons={r.reasons as unknown as Reason[]} />
                  {appeal ? (
                    <div className="mt-3 rounded-md border border-border p-3 text-sm">
                      <p className="font-semibold">{APPEAL[appeal.status] ?? appeal.status}</p>
                      <p className="mt-1 whitespace-pre-line text-muted">Você escreveu: {appeal.message}</p>
                      {appeal.response && <p className="mt-1 whitespace-pre-line">Resposta da equipe: {appeal.response}</p>}
                    </div>
                  ) : r.status === "warned" || r.status === "actioned" ? (
                    <div className="mt-3">
                      <AppealForm reviewId={r.id} />
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
