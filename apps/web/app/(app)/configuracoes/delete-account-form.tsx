"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, idleState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField
        id="password"
        label="Sua senha"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <InputField
        id="confirmation"
        label='Digite "EXCLUIR" para confirmar'
        autoComplete="off"
        autoCapitalize="characters"
        required
        errors={state.fieldErrors?.confirmation}
      />
      <Button type="submit" variant="outline-danger" loading={pending}>
        <Trash2 aria-hidden className="size-4" />
        Excluir minha conta
      </Button>
    </form>
  );
}
