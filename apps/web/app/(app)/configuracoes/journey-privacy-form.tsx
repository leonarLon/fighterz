"use client";

import { useActionState } from "react";
import { VISIBILITIES, VISIBILITY_LABELS, type Visibility } from "@figtherz/core";
import { saveJourneyPrivacy } from "@/app/actions/journey";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

type Values = { showRanks: Visibility; showAchievements: Visibility; showCheckins: Visibility };

const FIELDS: { id: keyof Values; label: string }[] = [
  { id: "showRanks", label: "Graduações" },
  { id: "showAchievements", label: "Conquistas" },
  { id: "showCheckins", label: "Treinos registrados" },
];

export function JourneyPrivacyForm({ initial }: { initial: Values }) {
  const [state, action, pending] = useActionState(saveJourneyPrivacy, idleState);
  const v = state.values as Partial<Values> | undefined;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <SelectField key={f.id} id={f.id} label={f.label} defaultValue={v?.[f.id] ?? initial[f.id]} errors={state.fieldErrors?.[f.id]}>
            {VISIBILITIES.map((option) => (
              <option key={option} value={option}>
                {VISIBILITY_LABELS[option]}
              </option>
            ))}
          </SelectField>
        ))}
      </div>
      <p className="text-[13px] text-muted">Perfil privado: só seguidores aprovados veem, mesmo que aqui esteja “Público”.</p>
      <Button type="submit" variant="secondary" loading={pending}>
        Salvar privacidade
      </Button>
    </form>
  );
}
