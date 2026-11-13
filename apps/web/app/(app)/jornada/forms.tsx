"use client";

import { useActionState, useState } from "react";
import { ACHIEVEMENT_TYPES, ACHIEVEMENT_TYPE_LABELS, MEDALS, MEDAL_LABELS, degreeOptions } from "@figtherz/core";
import { addAchievement, addJourneyArt, addPromotion } from "@/app/actions/journey";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

type Option = { id: string; name: string };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function AddArtForm({ arts }: { arts: Option[] }) {
  const [state, action, pending] = useActionState(addJourneyArt, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  if (arts.length === 0) return <p className="text-muted">Todas as modalidades já estão na sua jornada.</p>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <SelectField id="martialArtId" label="Modalidade" defaultValue={v?.martialArtId ?? ""} errors={e.martialArtId} required>
        <option value="">Escolha</option>
        {arts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id="startedOn" label="Começou em (opcional)" type="date" max={today()} defaultValue={v?.startedOn ?? ""} errors={e.startedOn} />
        <InputField
          id="federation"
          label="Federação ou equipe (opcional)"
          maxLength={80}
          help="Sistemas de graduação variam entre federações."
          defaultValue={v?.federation ?? ""}
          errors={e.federation}
        />
      </div>
      <Button type="submit" loading={pending}>
        Adicionar modalidade
      </Button>
    </form>
  );
}

type RankOption = Option & { maxDegrees: number };

export function PromotionForm({
  userMartialArtId,
  ranks,
  academies,
}: {
  userMartialArtId: string;
  ranks: RankOption[];
  academies: Option[];
}) {
  const [state, action, pending] = useActionState(addPromotion, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const [rankId, setRankId] = useState(v?.rankId ?? "");
  const max = ranks.find((r) => r.id === rankId)?.maxDegrees ?? 0;
  const id = (name: string) => `${name}-${userMartialArtId.slice(0, 8)}`;

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <input type="hidden" name="userMartialArtId" value={userMartialArtId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <SelectField
          id={id("rankId")}
          name="rankId"
          label="Graduação"
          value={rankId}
          onChange={(ev) => setRankId(ev.target.value)}
          errors={e.rankId}
          required
        >
          <option value="">Escolha</option>
          {ranks.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          id={id("degree")}
          name="degree"
          label="Graus"
          key={rankId}
          defaultValue={v?.degree && Number(v.degree) <= max ? v.degree : "0"}
          errors={e.degree}
          help={rankId ? (max === 0 ? "Sem graus." : `De 0 a ${max}.`) : undefined}
          disabled={!rankId}
        >
          {degreeOptions(max).map((d) => (
            <option key={d} value={d}>
              {d === 0 ? "Nenhum" : `${d} ${d === 1 ? "grau" : "graus"}`}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id={id("promotedOn")}
          name="promotedOn"
          label="Data da graduação"
          type="date"
          max={today()}
          required
          defaultValue={v?.promotedOn ?? ""}
          errors={e.promotedOn}
        />
        <SelectField id={id("academyId")} name="academyId" label="Academia (opcional)" defaultValue={v?.academyId ?? ""} errors={e.academyId}>
          <option value="">Nenhuma</option>
          {academies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
      </div>
      <InputField
        id={id("teacherUsername")}
        name="teacherUsername"
        label="Professor que graduou (opcional)"
        placeholder="@usuario"
        help="Se for um professor aprovado na plataforma, ele recebe um pedido para confirmar."
        defaultValue={v?.teacherUsername ?? ""}
        errors={e.teacherUsername}
        autoComplete="off"
      />
      <TextareaField id={id("notes")} name="notes" label="Observações (opcional)" rows={2} maxLength={500} defaultValue={v?.notes ?? ""} errors={e.notes} />
      <Button type="submit" loading={pending}>
        Registrar graduação
      </Button>
    </form>
  );
}

export function AchievementForm({ arts }: { arts: Option[] }) {
  const [state, action, pending] = useActionState(addAchievement, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id="ach-title" name="title" label="Título" required maxLength={120} placeholder="Ex.: Campeão estadual" defaultValue={v?.title ?? ""} errors={e.title} />
        <SelectField id="ach-type" name="type" label="Tipo" defaultValue={v?.type ?? "competition_result"} errors={e.type}>
          {ACHIEVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACHIEVEMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="ach-martialArtId" name="martialArtId" label="Modalidade (opcional)" defaultValue={v?.martialArtId ?? ""} errors={e.martialArtId}>
          <option value="">Nenhuma</option>
          {arts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <InputField id="ach-achievedOn" name="achievedOn" label="Data" type="date" max={today()} required defaultValue={v?.achievedOn ?? ""} errors={e.achievedOn} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField id="ach-eventName" name="eventName" label="Evento (opcional)" maxLength={120} defaultValue={v?.eventName ?? ""} errors={e.eventName} />
        <InputField id="ach-placement" name="placement" label="Colocação (opcional)" type="number" min={1} max={1000} defaultValue={v?.placement ?? ""} errors={e.placement} />
        <SelectField id="ach-medal" name="medal" label="Medalha (opcional)" defaultValue={v?.medal ?? ""} errors={e.medal}>
          <option value="">Nenhuma</option>
          {MEDALS.map((m) => (
            <option key={m} value={m}>
              {MEDAL_LABELS[m]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id="ach-division" name="division" label="Categoria (opcional)" maxLength={80} placeholder="Ex.: Adulto azul pena" defaultValue={v?.division ?? ""} errors={e.division} />
        <InputField id="ach-evidenceUrl" name="evidenceUrl" label="Link de comprovação (opcional)" placeholder="https://" defaultValue={v?.evidenceUrl ?? ""} errors={e.evidenceUrl} />
      </div>
      <Button type="submit" loading={pending}>
        Registrar conquista
      </Button>
    </form>
  );
}
