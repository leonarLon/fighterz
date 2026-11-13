"use client";

import { useActionState, useState } from "react";
import { saveTeacherProfile } from "@/app/actions/teachers";
import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

type Art = { id: string; name: string; ranks: { id: string; name: string }[] };
export type TeacherFormValues = {
  professionalName: string;
  bio: string;
  experienceYears: string;
  lineage: string;
  certifications: string;
  contactEmail: string;
  contactPhone: string;
  showContact: boolean;
  socialLinks: string;
  arts: Record<string, string>; // martialArtId -> rankId
};

export function TeacherForm({ arts, initial, isNew }: { arts: Art[]; initial: TeacherFormValues; isNew: boolean }) {
  const [state, action, pending] = useActionState(saveTeacherProfile, idleState);
  const [selected, setSelected] = useState<Record<string, string>>(initial.arts);
  const v = state.values;
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField
        id="professionalName"
        label="Nome profissional"
        required
        maxLength={80}
        placeholder="Ex.: Professor Diego Ramos"
        defaultValue={v?.professionalName ?? initial.professionalName}
        errors={e.professionalName}
      />
      <TextareaField id="bio" label="Apresentação" rows={4} maxLength={2000} defaultValue={v?.bio ?? initial.bio} errors={e.bio} />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <InputField
          id="experienceYears"
          label="Anos de experiência"
          type="number"
          min={0}
          max={80}
          defaultValue={v?.experienceYears ?? initial.experienceYears}
          errors={e.experienceYears}
        />
        <InputField id="lineage" label="Linhagem (opcional)" maxLength={300} defaultValue={v?.lineage ?? initial.lineage} errors={e.lineage} />
      </div>

      <fieldset aria-describedby={e.martialArts ? "arts-error" : undefined}>
        <legend className="mb-2 text-sm font-semibold">Modalidades que você ensina</legend>
        <ul className="space-y-2">
          {arts.map((art) => {
            const checked = art.id in selected;
            return (
              <li key={art.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
                <label className="flex min-h-9 flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="martialArtIds"
                    value={art.id}
                    checked={checked}
                    onChange={(ev) =>
                      setSelected((cur) => {
                        const next = { ...cur };
                        if (ev.target.checked) next[art.id] = "";
                        else delete next[art.id];
                        return next;
                      })
                    }
                    className="size-4 accent-(--primary)"
                  />
                  {art.name}
                </label>
                {checked && art.ranks.length > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">Sua graduação em {art.name}</span>
                    <select
                      name={`rank-${art.id}`}
                      value={selected[art.id]}
                      onChange={(ev) => setSelected((cur) => ({ ...cur, [art.id]: ev.target.value }))}
                      className="min-h-9 rounded-md border border-border bg-surface px-2"
                    >
                      <option value="">Graduação (opcional)</option>
                      {art.ranks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </li>
            );
          })}
        </ul>
        {e.martialArts && (
          <p id="arts-error" className="mt-1.5 text-[13px] font-medium text-danger">
            {e.martialArts[0]}
          </p>
        )}
      </fieldset>

      <TextareaField
        id="certifications"
        label="Certificações (opcional)"
        rows={3}
        help="Uma por linha: Título — Emissor — Ano"
        defaultValue={v?.certifications ?? initial.certifications}
        errors={e.certifications}
      />
      <TextareaField
        id="socialLinks"
        label="Links (opcional)"
        rows={2}
        help="Um por linha, começando com https://"
        defaultValue={v?.socialLinks ?? initial.socialLinks}
        errors={e.socialLinks}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id="contactEmail" label="E-mail profissional" type="email" defaultValue={v?.contactEmail ?? initial.contactEmail} errors={e.contactEmail} />
        <InputField id="contactPhone" label="Telefone profissional" defaultValue={v?.contactPhone ?? initial.contactPhone} errors={e.contactPhone} />
      </div>
      <label className="flex items-start gap-3 rounded-md border border-border p-3">
        <input type="checkbox" name="showContact" defaultChecked={initial.showContact} className="mt-0.5 size-5 shrink-0 accent-(--primary)" />
        <span>
          <span className="block font-semibold">Mostrar contato no meu perfil público</span>
          <span className="block text-[13px] text-muted">Desligado por padrão. Você pode mudar quando quiser.</span>
        </span>
      </label>
      <Button type="submit" loading={pending}>
        {isNew ? "Enviar pedido" : "Salvar perfil profissional"}
      </Button>
    </form>
  );
}
