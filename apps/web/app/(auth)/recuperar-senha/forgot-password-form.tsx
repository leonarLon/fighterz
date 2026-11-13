"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idleState);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      {state.status !== "success" && (
        <>
          <InputField
            id="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            errors={state.fieldErrors?.email}
          />
          <Button type="submit" className="w-full" size="lg" loading={pending}>
            Enviar link
          </Button>
        </>
      )}
    </form>
  );
}
