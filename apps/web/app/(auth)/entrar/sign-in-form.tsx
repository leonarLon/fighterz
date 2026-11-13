"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, idleState);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage status={state.status} message={state.message} />
      <InputField
        id="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <InputField
        id="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <div className="text-right">
        <Link href={routes.forgotPassword} className="text-sm font-semibold text-accent hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Entrar
      </Button>
    </form>
  );
}
