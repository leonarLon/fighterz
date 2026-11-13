"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, idleState);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div role="status" className="mt-6 flex flex-col items-center text-center">
        <MailCheck aria-hidden className="size-12 text-success" strokeWidth={1.5} />
        <h2 className="mt-3 font-display text-2xl font-semibold">Confira seu e-mail</h2>
        <p className="mt-1 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField
        id="displayName"
        label="Nome"
        autoComplete="name"
        required
        maxLength={60}
        defaultValue={state.values?.displayName}
        errors={errors.displayName}
      />
      <InputField
        id="username"
        label="Nome de usuário"
        autoComplete="username"
        autoCapitalize="none"
        required
        maxLength={30}
        help="Letras minúsculas, números, ponto ou sublinhado."
        defaultValue={state.values?.username}
        errors={errors.username}
      />
      <InputField
        id="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={errors.email}
      />
      <InputField
        id="birthDate"
        label="Data de nascimento"
        type="date"
        autoComplete="bday"
        required
        help="Usada só para confirmar que você tem 18 anos ou mais. Não aparece no perfil."
        defaultValue={state.values?.birthDate}
        errors={errors.birthDate}
      />
      <InputField
        id="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        required
        help="Pelo menos 8 caracteres, com letras e números."
        errors={errors.password}
      />
      <InputField
        id="confirmPassword"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        required
        errors={errors.confirmPassword}
      />
      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="acceptedTerms"
            required
            className="mt-0.5 size-5 shrink-0 accent-(--primary)"
            aria-invalid={errors.acceptedTerms ? true : undefined}
            aria-describedby={errors.acceptedTerms ? "acceptedTerms-error" : undefined}
          />
          <span>
            Li e aceito os{" "}
            <Link href={routes.terms} target="_blank" className="font-semibold text-accent hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href={routes.privacy} target="_blank" className="font-semibold text-accent hover:underline">
              Política de Privacidade
            </Link>
            , e declaro ter 18 anos ou mais.
          </span>
        </label>
        {errors.acceptedTerms && (
          <p id="acceptedTerms-error" className="text-[13px] font-medium text-danger">
            {errors.acceptedTerms[0]}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Criar conta
      </Button>
    </form>
  );
}
