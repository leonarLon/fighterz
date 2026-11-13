"use client";

import { useActionState, useEffect } from "react";
import { CLASS_LEVEL_LABELS, CLASS_LEVELS, CLASS_STATUS_LABELS, CLASS_STATUSES, WEEK_ORDER, WEEKDAY_LABELS, formatTime } from "@figtherz/core";
import { saveClass } from "@/app/actions/academies";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";
import type { ClassRow } from "@/lib/academies";

type Option = { id: string; name: string };

export function ClassForm({
  academyId,
  units,
  arts,
  teachers,
  item,
  onDone,
}: {
  academyId: string;
  units: Option[];
  arts: Option[];
  teachers: Option[];
  item?: ClassRow;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(saveClass.bind(null, academyId, item?.id ?? null), idleState);
  const v = state.values;
  const p = `class-${item?.id ?? "new"}`;
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") onDone?.();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField id={`${p}-name`} name="name" label="Nome da aula" required maxLength={80} placeholder="Ex.: Jiu-Jitsu Iniciante" defaultValue={v?.name ?? item?.name} errors={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id={`${p}-unitId`} name="unitId" label="Unidade" defaultValue={v?.unitId ?? item?.unit_id ?? units[0]?.id} errors={errors.unitId}>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </SelectField>
        <SelectField id={`${p}-martialArtId`} name="martialArtId" label="Modalidade" defaultValue={v?.martialArtId ?? item?.martial_art_id ?? arts[0]?.id} errors={errors.martialArtId}>
          {arts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <SelectField id={`${p}-level`} name="level" label="Nível" defaultValue={v?.level ?? item?.level ?? "all"}>
          {CLASS_LEVELS.map((l) => (
            <option key={l} value={l}>
              {CLASS_LEVEL_LABELS[l]}
            </option>
          ))}
        </SelectField>
        <SelectField
          id={`${p}-teacherId`} name="teacherId"
          label="Professor"
          defaultValue={v?.teacherId ?? item?.teacher_id ?? ""}
          help={teachers.length === 0 ? "Convide professores na seção Equipe." : undefined}
          errors={errors.teacherId}
        >
          <option value="">Sem professor definido</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField id={`${p}-weekday`} name="weekday" label="Dia" defaultValue={v?.weekday ?? String(item?.weekday ?? 1)}>
          {WEEK_ORDER.map((d) => (
            <option key={d} value={d}>
              {WEEKDAY_LABELS[d]}
            </option>
          ))}
        </SelectField>
        <InputField id={`${p}-startsAt`} name="startsAt" label="Início" type="time" required defaultValue={v?.startsAt ?? (item ? formatTime(item.starts_at) : "19:00")} errors={errors.startsAt} />
        <InputField id={`${p}-endsAt`} name="endsAt" label="Fim" type="time" required defaultValue={v?.endsAt ?? (item ? formatTime(item.ends_at) : "20:00")} errors={errors.endsAt} />
      </div>
      <SelectField id={`${p}-status`} name="status" label="Situação" defaultValue={v?.status ?? item?.status ?? "active"}>
        {CLASS_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CLASS_STATUS_LABELS[s]}
          </option>
        ))}
      </SelectField>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="acceptsTrial" defaultChecked={item?.accepts_trial ?? false} className="size-5 accent-(--primary)" />
        <span>Aceita aula experimental</span>
      </label>
      <TextareaField id={`${p}-notes`} name="notes" label="Observações (opcional)" rows={2} maxLength={500} defaultValue={v?.notes ?? item?.notes ?? ""} errors={errors.notes} />
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {item ? "Salvar aula" : "Adicionar aula"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
