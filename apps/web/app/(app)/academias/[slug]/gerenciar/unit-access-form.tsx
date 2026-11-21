"use client";

import { useActionState, useState } from "react";
import { PRICE_STATUSES, PRICE_STATUS_LABELS, UNIT_ACCESS_LABELS, formatBrl, type UnitAccessKind } from "@figtherz/core";
import { saveUnitAccess } from "@/app/actions/academies";
import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";
import type { UnitAccess } from "@/lib/academies";

type Art = { id: string; name: string };

/** Um formulário por tipo (TotalPass, Wellhub, diária) em cada unidade. Salvar um não mexe nos outros. */
export function UnitAccessForm({
  academyId,
  unitId,
  unitName,
  kind,
  current,
  arts,
}: {
  academyId: string;
  unitId: string;
  unitName: string;
  kind: UnitAccessKind;
  current: UnitAccess | undefined;
  arts: Art[];
}) {
  const [state, action, pending] = useActionState(saveUnitAccess.bind(null, academyId, unitId, kind), idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const [accepted, setAccepted] = useState(v ? v.accepted === "on" : (current?.accepted ?? false));
  const [priceStatus, setPriceStatus] = useState(v?.priceStatus ?? current?.price_status ?? "");
  const id = (name: string) => `${name}-${kind}-${unitId.slice(0, 8)}`;
  const label = UNIT_ACCESS_LABELS[kind];
  const isDayPass = kind === "day_pass";
  const selectedArts = new Set(current?.martial_art_ids ?? []);

  return (
    <form action={action} className="space-y-3" noValidate aria-label={`${label} na unidade ${unitName}`}>
      <FormMessage status={state.status} message={state.message} />
      {/* O React reinicia o formulário depois de cada envio: campos controlados podem voltar ao padrão no DOM
          mesmo com o estado certo na tela. Os valores enviados vêm do estado, em campos ocultos. */}
      <input type="hidden" name="accepted" value={accepted ? "on" : ""} />
      <input type="hidden" name="priceStatus" value={accepted && isDayPass ? priceStatus : ""} />
      <label className="flex min-h-11 items-center gap-3 font-semibold">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(ev) => setAccepted(ev.target.checked)}
          className="size-5 accent-(--primary)"
        />
        {isDayPass ? "Oferece diária nesta unidade" : `Aceita ${label} nesta unidade`}
      </label>

      {accepted && (
        <div className="space-y-3 border-l-2 border-border pl-3">
          {isDayPass ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Valor da diária</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {PRICE_STATUSES.map((s) => (
                  <label key={s} className="flex min-h-11 items-center gap-2">
                    <input
                      type="radio"
                      name={`priceStatus-${kind}-${unitId}`}
                      value={s}
                      checked={priceStatus === s}
                      onChange={() => setPriceStatus(s)}
                      className="size-5 accent-(--primary)"
                    />
                    {PRICE_STATUS_LABELS[s]}
                  </label>
                ))}
              </div>
              {e.priceStatus && <p className="text-[13px] text-danger">{e.priceStatus[0]}</p>}
              {priceStatus === "paid" && (
                <InputField
                  id={id("price")}
                  name="price"
                  label="Valor (R$)"
                  inputMode="decimal"
                  placeholder="40,00"
                  className="max-w-40"
                  defaultValue={v?.price ?? (current?.price_cents ? formatBrl(current.price_cents).replace("R$ ", "") : "")}
                  errors={e.price}
                />
              )}
            </fieldset>
          ) : (
            <InputField
              id={id("plans")}
              name="plans"
              label="Planos aceitos (opcional)"
              help="Separe por vírgula. Ex.: Silver, Gold"
              maxLength={600}
              defaultValue={v?.plans ?? (current?.plans ?? []).join(", ")}
              errors={e.plans}
            />
          )}

          {arts.length > 0 && (
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">Modalidades incluídas (opcional)</legend>
              <div className="flex flex-wrap gap-x-4">
                {arts.map((a) => (
                  <label key={a.id} className="flex min-h-11 items-center gap-2">
                    <input type="checkbox" name="martialArtIds" value={a.id} defaultChecked={selectedArts.has(a.id)} className="size-5 accent-(--primary)" />
                    {a.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <InputField
            id={id("accessHours")}
            name="accessHours"
            label="Horários de acesso (opcional)"
            placeholder="Ex.: seg a sex, 6h às 22h"
            maxLength={300}
            defaultValue={v?.accessHours ?? current?.access_hours ?? ""}
            errors={e.accessHours}
          />
          <TextareaField
            id={id("restrictions")}
            name="restrictions"
            label="Restrições (opcional)"
            rows={2}
            maxLength={500}
            placeholder="Ex.: só aulas abertas, agendar com 1 dia de antecedência"
            defaultValue={v?.restrictions ?? current?.restrictions ?? ""}
            errors={e.restrictions}
          />
          <TextareaField
            id={id("notes")}
            name="notes"
            label="Observações (opcional)"
            rows={2}
            maxLength={500}
            defaultValue={v?.notes ?? current?.notes ?? ""}
            errors={e.notes}
          />
        </div>
      )}

      <Button type="submit" variant="secondary" loading={pending}>
        Salvar {label}
      </Button>
    </form>
  );
}
