"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idleState);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField
        id="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        required
        help="Pelo menos 8 caracteres, com letras e números."
        errors={state.fieldErrors?.password}
      />
      <InputField
        id="confirmPassword"
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Salvar nova senha
      </Button>
    </form>
  );
}
