"use client";

import { useActionState } from "react";
import { REPORT_REASON_LABELS, REPORT_REASONS } from "@figtherz/core";
import { reportContent } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function ReportForm({ targetType, targetId }: { targetType: "post" | "comment" | "profile"; targetId: string }) {
  const [state, action, pending] = useActionState(reportContent, idleState);

  if (state.status === "success") return <FormMessage status="success" message={state.message} />;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <FormMessage status={state.status} message={state.message} />
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Qual é o problema?</legend>
        {REPORT_REASONS.map((reason) => (
          <label key={reason} className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3">
            <input type="radio" name="reason" value={reason} required className="size-4 accent-(--primary)" />
            <span className="text-sm">{REPORT_REASON_LABELS[reason]}</span>
          </label>
        ))}
        {state.fieldErrors?.reason && <p className="text-[13px] font-medium text-danger">{state.fieldErrors.reason[0]}</p>}
      </fieldset>
      <TextareaField id="details" label="Detalhes (opcional)" maxLength={1000} rows={3} errors={state.fieldErrors?.details} />
      <p className="text-[13px] text-muted">
        Vídeos de treino e competição são permitidos. Denuncie violência real, assédio ou risco a menores.
      </p>
      <Button type="submit" loading={pending} className="w-full">
        Enviar denúncia
      </Button>
    </form>
  );
}
