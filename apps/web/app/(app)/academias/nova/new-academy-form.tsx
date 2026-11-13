"use client";

import { useActionState } from "react";
import { createAcademy } from "@/app/actions/academies";
import { MartialArtCheckboxes } from "@/components/academy/martial-art-checkboxes";
import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function NewAcademyForm({ arts }: { arts: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createAcademy, idleState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField id="name" label="Nome da academia" required maxLength={80} defaultValue={state.values?.name} errors={state.fieldErrors?.name} />
      <TextareaField
        id="description"
        label="Descrição (opcional)"
        maxLength={3000}
        rows={4}
        defaultValue={state.values?.description}
        errors={state.fieldErrors?.description}
      />
      <MartialArtCheckboxes arts={arts} errors={state.fieldErrors?.martialArtIds} />
      <Button type="submit" loading={pending}>
        Cadastrar academia
      </Button>
    </form>
  );
}
