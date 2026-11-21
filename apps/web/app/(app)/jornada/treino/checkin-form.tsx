"use client";

import { useActionState, useState } from "react";
import { VISIBILITIES, VISIBILITY_LABELS } from "@figtherz/core";
import { createCheckin } from "@/app/actions/journey";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

type Option = { id: string; name: string };

export function CheckinForm({
  arts,
  defaultArt,
  academies,
  classes,
  now,
}: {
  arts: Option[];
  defaultArt: string;
  academies: Option[];
  classes: { id: string; academyId: string; label: string }[];
  now: string;
}) {
  const [state, action, pending] = useActionState(createCheckin, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const [academyId, setAcademyId] = useState(v?.academyId ?? "");
  const [share, setShare] = useState(false);
  const academyClasses = classes.filter((c) => c.academyId === academyId);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="martialArtId" label="Modalidade" defaultValue={v?.martialArtId ?? defaultArt} errors={e.martialArtId}>
          <option value="">Escolha</option>
          {arts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <InputField
          id="trainedAt"
          label="Quando"
          type="datetime-local"
          max={now}
          required
          defaultValue={v?.trainedAt ?? now}
          help="Horário de Brasília."
          errors={e.trainedAt}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="academyId"
          label="Academia (opcional)"
          value={academyId}
          onChange={(ev) => setAcademyId(ev.target.value)}
          errors={e.academyId}
          help={academies.length === 0 ? "Peça vínculo de aluno na página da sua academia para escolhê-la aqui." : undefined}
        >
          <option value="">Nenhuma</option>
          {academies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <InputField id="durationMin" label="Duração em minutos (opcional)" type="number" min={5} max={600} defaultValue={v?.durationMin ?? ""} errors={e.durationMin} />
      </div>
      {academyClasses.length > 0 && (
        <SelectField id="classScheduleId" label="Aula (opcional)" key={academyId} defaultValue={v?.classScheduleId ?? ""} errors={e.classScheduleId}>
          <option value="">Nenhuma</option>
          {academyClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </SelectField>
      )}
      <TextareaField id="notes" label="Como foi? (opcional)" rows={3} maxLength={500} defaultValue={v?.notes ?? ""} errors={e.notes} />

      <fieldset className="space-y-3 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold">Feed</legend>
        <label className="flex items-start gap-3">
          {/* Enviado a partir do estado (o React reinicia o formulário depois de cada envio). */}
          <input type="hidden" name="share" value={share ? "on" : ""} />
          <input
            type="checkbox"
            checked={share}
            onChange={(ev) => setShare(ev.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-(--primary)"
          />
          <span>
            <span className="block font-semibold">Compartilhar no feed</span>
            <span className="block text-[13px] text-muted">Aparece como “registrou um treino”, com a modalidade e a academia.</span>
          </span>
        </label>
        {share && (
          <SelectField id="visibility" label="Quem vê o post" defaultValue={v?.visibility ?? "followers"}>
            {VISIBILITIES.map((option) => (
              <option key={option} value={option}>
                {VISIBILITY_LABELS[option]}
              </option>
            ))}
          </SelectField>
        )}
      </fieldset>
      <Button type="submit" loading={pending}>
        Registrar treino
      </Button>
    </form>
  );
}
