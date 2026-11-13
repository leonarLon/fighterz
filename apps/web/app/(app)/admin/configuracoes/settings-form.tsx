"use client";

import { useActionState } from "react";
import { savePlatformSettings } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function PlatformSettingsForm({ signupsOpen, announcement }: { signupsOpen: boolean; announcement: string }) {
  const [state, action, pending] = useActionState(savePlatformSettings, idleState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <label className="flex items-start gap-3 rounded-md border border-border p-3">
        <input type="checkbox" name="signupsOpen" defaultChecked={signupsOpen} className="mt-0.5 size-5 shrink-0 accent-(--primary)" />
        <span>
          <span className="block font-semibold">Cadastros abertos</span>
          <span className="block text-[13px] text-muted">Desligado, ninguém novo consegue criar conta (o banco também barra).</span>
        </span>
      </label>
      <TextareaField
        id="announcement"
        label="Aviso no topo do site (opcional)"
        rows={2}
        maxLength={280}
        help="Ex.: manutenção programada. Deixe vazio para não mostrar."
        defaultValue={state.values?.announcement ?? announcement}
        errors={state.fieldErrors?.announcement}
      />
      <Button type="submit" loading={pending}>
        Salvar configurações
      </Button>
    </form>
  );
}
