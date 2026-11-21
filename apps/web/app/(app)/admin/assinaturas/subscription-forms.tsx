"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SUBSCRIPTION_STATUS_LABELS, formatDate, formatDateTime, type PlanAudience, type SubscriptionStatus } from "@figtherz/core";
import { changeSubscription, createSubscription, setSubscriptionStatus } from "@/app/actions/plans";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

type PlanOption = { id: string; name: string; audience: PlanAudience };

export type SubscriptionEvent = {
  id: string;
  subscription_id: string;
  action: "created" | "status" | "changed" | "expired";
  from_status: SubscriptionStatus | null;
  to_status: SubscriptionStatus | null;
  reason: string | null;
  created_at: string;
  profiles: { username: string } | null;
};

export function NewSubscriptionForm({ plans }: { plans: PlanOption[] }) {
  const [state, action, pending] = useActionState(createSubscription, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  // Selects controlados + campos ocultos: o React reinicia o form após cada envio e o select voltaria ao início.
  const [entityKind, setEntityKind] = useState(v?.entityKind ?? "academy");
  const [planId, setPlanId] = useState(v?.planId ?? "");
  return (
    <form action={action} className="space-y-4" noValidate aria-label="Nova assinatura">
      <FormMessage status={state.status} message={state.message} />
      <input type="hidden" name="entityKind" value={entityKind} />
      <input type="hidden" name="planId" value={planId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField id="sub-entityKind" name={undefined} label="Tipo" value={entityKind} onChange={(ev) => setEntityKind(ev.target.value)} errors={e.entityKind}>
          <option value="academy">Academia</option>
          <option value="business">Página (marca, loja, serviço)</option>
        </SelectField>
        <InputField
          id="sub-entitySlug"
          name="entitySlug"
          label="Endereço (slug)"
          placeholder="tatame-central"
          help="O final do link: /academias/… ou /paginas/…"
          defaultValue={v?.entitySlug ?? ""}
          errors={e.entitySlug}
        />
        <SelectField id="sub-planId" name={undefined} label="Plano" value={planId} onChange={(ev) => setPlanId(ev.target.value)} errors={e.planId}>
          <option value="">Escolha…</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.audience === "academy" ? " (academias)" : p.audience === "business" ? " (páginas)" : ""}
            </option>
          ))}
        </SelectField>
        <InputField id="sub-startsOn" name="startsOn" label="Início (opcional)" type="date" help="Vazio = hoje" defaultValue={v?.startsOn ?? ""} errors={e.startsOn} />
        <InputField id="sub-endsOn" name="endsOn" label="Fim (opcional)" type="date" help="Vazio = sem prazo" defaultValue={v?.endsOn ?? ""} errors={e.endsOn} />
        <InputField id="sub-notes" name="notes" label="Observação (opcional)" maxLength={500} defaultValue={v?.notes ?? ""} errors={e.notes} />
      </div>
      <Button type="submit" loading={pending}>
        Criar assinatura
      </Button>
    </form>
  );
}

function eventText(ev: SubscriptionEvent) {
  if (ev.action === "created") return "Criada";
  if (ev.action === "expired") return "Expirou";
  if (ev.action === "changed") return "Plano ou validade alterados";
  return `${SUBSCRIPTION_STATUS_LABELS[ev.from_status ?? "active"]} → ${SUBSCRIPTION_STATUS_LABELS[ev.to_status ?? "active"]}`;
}

export function SubscriptionActions({
  sub,
  plans,
  events,
}: {
  sub: {
    id: string;
    status: SubscriptionStatus;
    planId: string;
    planName: string;
    entityName: string;
    entityHref: string;
    entityKind: "academy" | "business";
    startsOn: string;
    endsOn: string | null;
    notes: string | null;
  };
  plans: PlanOption[];
  events: SubscriptionEvent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const [planId, setPlanId] = useState(sub.planId);
  const [endsOn, setEndsOn] = useState(sub.endsOn ?? "");
  const open = sub.status === "active" || sub.status === "suspended";
  const key = sub.id.slice(0, 8);
  const compatible = plans.filter((p) => p.audience === "both" || p.audience === sub.entityKind);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      setNotice({ ok: result.ok, text: result.message ?? "" });
      if (result.ok) {
        setReason("");
        router.refresh();
      }
    });

  return (
    <div className="space-y-3" aria-label={`Assinatura de ${sub.entityName}`} role="group">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <Link href={sub.entityHref} className="font-semibold hover:underline">
            {sub.entityName}
          </Link>
          <span className="text-muted"> · {sub.entityKind === "academy" ? "Academia" : "Página"} · {sub.planName}</span>
        </p>
        <p className="text-sm">
          <span className="font-semibold">{SUBSCRIPTION_STATUS_LABELS[sub.status]}</span>
          <span className="text-muted">
            {" "}
            · desde {formatDate(sub.startsOn)}
            {sub.endsOn ? ` até ${formatDate(sub.endsOn)}` : " · sem prazo"}
          </span>
        </p>
      </div>
      {sub.notes && <p className="text-sm text-muted">{sub.notes}</p>}

      {open && (
        <details className="rounded-md border border-border p-3">
          <summary className="cursor-pointer font-semibold">Gerenciar assinatura de {sub.entityName}</summary>
          <div className="mt-3 space-y-4">
            <TextareaField
              id={`reason-${key}`}
              label="Motivo (obrigatório para suspender ou cancelar)"
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {sub.status === "active" ? (
                <Button variant="secondary" disabled={pending} onClick={() => run(() => setSubscriptionStatus(sub.id, "suspended", reason))}>
                  Suspender
                </Button>
              ) : (
                <Button variant="secondary" disabled={pending} onClick={() => run(() => setSubscriptionStatus(sub.id, "active", reason))}>
                  Reativar
                </Button>
              )}
              <Button variant="ghost" className="text-danger" disabled={pending} onClick={() => run(() => setSubscriptionStatus(sub.id, "cancelled", reason))}>
                Cancelar assinatura
              </Button>
            </div>
            <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
              <SelectField id={`plan-${key}`} label="Trocar plano" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {compatible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
              <InputField id={`ends-${key}`} label="Fim (vazio = sem prazo)" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
              <Button variant="secondary" disabled={pending} onClick={() => run(() => changeSubscription(sub.id, planId, endsOn, reason))}>
                Salvar plano e validade
              </Button>
            </div>
          </div>
        </details>
      )}
      <p aria-live="polite" className={notice?.ok === false ? "text-[13px] text-danger empty:hidden" : "text-[13px] text-success empty:hidden"}>
        {notice?.text ?? ""}
      </p>
      {events.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Histórico ({events.length})</summary>
          <ol className="mt-2 space-y-1 text-sm">
            {events.map((ev) => (
              <li key={ev.id}>
                <span className="font-semibold">{eventText(ev)}</span>
                <span className="text-muted">
                  {" "}
                  · {formatDateTime(ev.created_at)} · {ev.profiles?.username ? `@${ev.profiles.username}` : "rotina automática"}
                  {ev.reason ? ` · ${ev.reason}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
