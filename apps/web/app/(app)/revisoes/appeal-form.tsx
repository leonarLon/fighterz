"use client";

import { useActionState } from "react";
import { createCommercialAppeal } from "@/app/actions/commercial";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function AppealForm({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState(createCommercialAppeal.bind(null, reviewId), idleState);
  if (state.status === "success") return <FormMessage status="success" message={state.message} />;
  return (
    <form action={action} className="space-y-3" noValidate aria-label="Recorrer da decisão">
      <FormMessage status={state.status} message={state.message} />
      <TextareaField
        id={`message-${reviewId.slice(0, 8)}`}
        name="message"
        label="Recorrer: explique por que não era publicidade"
        rows={3}
        maxLength={1000}
        defaultValue={state.values?.message}
        errors={state.fieldErrors?.message}
      />
      <Button type="submit" variant="secondary" loading={pending}>
        Enviar recurso
      </Button>
    </form>
  );
}
