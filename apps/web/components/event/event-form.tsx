"use client";

import { useActionState, useState } from "react";
import { BRAZILIAN_STATES, EVENT_TYPES, EVENT_TYPE_LABELS } from "@figtherz/core";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState, type FormState } from "@/lib/form-state";

type Option = { id: string; name: string };
export type EventFormValues = Record<
  | "organizer" | "type" | "martialArtId" | "title" | "description" | "startsAt" | "endsAt" | "unitId"
  | "venueName" | "street" | "number" | "neighborhood" | "postalCode" | "city" | "state" | "externalUrl",
  string
>;

export function EventForm({
  action: serverAction,
  initial,
  organizers,
  units,
  arts,
  isNew,
  isDraft,
  minDate,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: EventFormValues;
  organizers: { value: string; label: string }[];
  units: { id: string; academyId: string; name: string }[];
  arts: Option[];
  isNew: boolean;
  isDraft: boolean;
  minDate?: string;
}) {
  const [state, action, pending] = useActionState(serverAction, idleState);
  const v = (state.values ?? initial) as EventFormValues;
  const e = state.fieldErrors ?? {};
  const [organizer, setOrganizer] = useState(v.organizer);
  const [unitId, setUnitId] = useState(v.unitId);
  const academyUnits = units.filter((u) => u.academyId === organizer);
  const ownAddress = !unitId || organizer === "personal";

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      {isNew ? (
        <SelectField
          id="organizer"
          label="Quem organiza"
          value={organizer}
          onChange={(ev) => {
            setOrganizer(ev.target.value);
            setUnitId("");
          }}
          errors={e.organizer}
        >
          {organizers.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      ) : (
        <input type="hidden" name="organizer" value={organizer} />
      )}
      <InputField id="title" label="Título" required maxLength={120} defaultValue={v.title} errors={e.title} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="type" label="Tipo" defaultValue={v.type} errors={e.type}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>
        <SelectField id="martialArtId" label="Modalidade" defaultValue={v.martialArtId} errors={e.martialArtId}>
          <option value="">Várias modalidades</option>
          {arts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id="startsAt" label="Início" type="datetime-local" min={minDate} required defaultValue={v.startsAt} errors={e.startsAt} help="Horário de Brasília." />
        <InputField id="endsAt" label="Fim" type="datetime-local" min={minDate} required defaultValue={v.endsAt} errors={e.endsAt} />
      </div>
      <TextareaField id="description" label="Descrição (opcional)" rows={5} maxLength={5000} defaultValue={v.description} errors={e.description} />
      <InputField
        id="externalUrl"
        label="Link de inscrição ou regulamento (opcional)"
        placeholder="https://"
        defaultValue={v.externalUrl}
        errors={e.externalUrl}
      />

      <fieldset className="space-y-4 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold">Local</legend>
        {organizer !== "personal" && academyUnits.length > 0 && (
          <SelectField id="unitId" label="Unidade da academia" value={unitId} onChange={(ev) => setUnitId(ev.target.value)} errors={e.unitId}>
            <option value="">Outro endereço</option>
            {academyUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </SelectField>
        )}
        {ownAddress && (
          <>
            <InputField id="venueName" label="Nome do local (opcional)" maxLength={120} placeholder="Ex.: Ginásio Municipal" defaultValue={v.venueName} errors={e.venueName} />
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
              <InputField id="street" label="Rua (opcional)" maxLength={120} defaultValue={v.street} errors={e.street} />
              <InputField id="number" label="Número" maxLength={20} defaultValue={v.number} errors={e.number} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField id="neighborhood" label="Bairro (opcional)" maxLength={80} defaultValue={v.neighborhood} errors={e.neighborhood} />
              <InputField id="postalCode" label="CEP (opcional)" inputMode="numeric" maxLength={9} defaultValue={v.postalCode} errors={e.postalCode} />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <InputField id="city" label="Cidade" required maxLength={80} defaultValue={v.city} errors={e.city} />
              <SelectField id="state" label="Estado" defaultValue={v.state} errors={e.state}>
                <option value="">UF</option>
                {BRAZILIAN_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </SelectField>
            </div>
          </>
        )}
      </fieldset>

      {isDraft && (
        <label className="flex items-start gap-3 rounded-md border border-border p-3">
          <input type="checkbox" name="publish" defaultChecked={isNew} className="mt-0.5 size-5 shrink-0 accent-(--primary)" />
          <span>
            <span className="block font-semibold">Publicar agora</span>
            <span className="block text-[13px] text-muted">Desmarcado, fica como rascunho visível só para a organização.</span>
          </span>
        </label>
      )}
      <Button type="submit" loading={pending}>
        {isNew ? "Criar evento" : "Salvar evento"}
      </Button>
    </form>
  );
}
