"use client";

import { useActionState, useState, useTransition } from "react";
import { addRank, createMartialArt, setMartialArtActive } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function MartialArtForm() {
  const [state, action, pending] = useActionState(createMartialArt, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
        <InputField id="name" label="Nome" required maxLength={60} defaultValue={v?.name ?? ""} errors={e.name} />
        <InputField id="slug" label="Identificador na URL" required placeholder="ex.: jeet-kune-do" defaultValue={v?.slug ?? ""} errors={e.slug} />
        <InputField id="sortOrder" label="Ordem" type="number" min={0} max={9999} defaultValue={v?.sortOrder ?? "500"} errors={e.sortOrder} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="hasRanks" defaultChecked className="size-5 accent-(--primary)" />
        Tem sistema de graduação
      </label>
      <Button type="submit" loading={pending}>
        Criar modalidade
      </Button>
    </form>
  );
}

export function ActiveToggle({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [isActive, setActive] = useState(active);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <span className="flex items-center gap-2">
      <span aria-live="polite" className="text-[13px] text-muted">
        {notice}
      </span>
      <Button
        variant="secondary"
        aria-pressed={isActive}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setMartialArtActive(id, !isActive);
            setNotice(result.message ?? "");
            if (result.ok) setActive(!isActive);
          })
        }
      >
        {isActive ? `Desativar ${name}` : `Ativar ${name}`}
      </Button>
    </span>
  );
}

export function RankForm({ martialArtId, artName }: { martialArtId: string; artName: string }) {
  const [state, action, pending] = useActionState(addRank, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values;
  const id = (n: string) => `${n}-${martialArtId.slice(0, 8)}`;
  return (
    <form action={action} className="space-y-3" noValidate aria-label={`Nova graduação em ${artName}`}>
      <FormMessage status={state.status} message={state.message} />
      <input type="hidden" name="martialArtId" value={martialArtId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_7rem]">
        <InputField id={id("name")} name="name" label="Nova graduação" maxLength={60} defaultValue={v?.name ?? ""} errors={e.name} />
        <InputField id={id("color")} name="color" label="Cor (#RRGGBB)" maxLength={7} placeholder="#1D4ED8" defaultValue={v?.color ?? ""} errors={e.color} />
        <InputField id={id("maxDegrees")} name="maxDegrees" label="Graus" type="number" min={0} max={10} defaultValue={v?.maxDegrees ?? "0"} errors={e.maxDegrees} />
      </div>
      <Button type="submit" variant="secondary" loading={pending}>
        Adicionar graduação
      </Button>
    </form>
  );
}
