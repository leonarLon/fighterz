"use client";

import { useActionState, useEffect, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { BRAZILIAN_STATES } from "@figtherz/core";
import { saveUnit } from "@/app/actions/academies";
import { LeafletMap } from "@/components/map/map";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";
import type { Unit } from "@/lib/academies";

type Fields = {
  name: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  referencePoint: string;
  latitude: string;
  longitude: string;
  coordsSource: string;
};

function initial(unit?: Unit): Fields {
  return {
    name: unit?.name ?? "",
    postalCode: unit?.postal_code ?? "",
    street: unit?.street ?? "",
    number: unit?.number ?? "",
    complement: unit?.complement ?? "",
    neighborhood: unit?.neighborhood ?? "",
    city: unit?.city ?? "",
    state: unit?.state ?? "",
    referencePoint: unit?.reference_point ?? "",
    latitude: unit?.latitude?.toString() ?? "",
    longitude: unit?.longitude?.toString() ?? "",
    coordsSource: unit?.coords_source ?? "",
  };
}

/**
 * Fluxo de localização (ARCHITECTURE.md §5): CEP → ViaCEP preenche o endereço; "Localizar no mapa" → Nominatim
 * sugere o pino; o usuário arrasta e confirma. Sempre dá para pular e posicionar o pino manualmente.
 */
export function UnitForm({ academyId, unit, onDone }: { academyId: string; unit?: Unit; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveUnit.bind(null, academyId, unit?.id ?? null), idleState);
  const [f, setF] = useState<Fields>(() => initial(unit));
  const [geoStatus, setGeoStatus] = useState<{ kind: "idle" | "error" | "success"; message?: string }>({ kind: "idle" });
  const [busy, setBusy] = useState<"cep" | "geo" | null>(null);
  const errors = state.fieldErrors ?? {};
  const set = (key: keyof Fields) => (e: { target: { value: string } }) => setF((cur) => ({ ...cur, [key]: e.target.value }));
  const lat = f.latitude === "" ? null : Number(f.latitude);
  const lng = f.longitude === "" ? null : Number(f.longitude);
  const idPrefix = unit ? `unit-${unit.id}` : "unit-new";

  async function lookupCep() {
    setBusy("cep");
    setGeoStatus({ kind: "idle" });
    try {
      const res = await fetch(`/api/geo/cep?cep=${encodeURIComponent(f.postalCode)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setF((cur) => ({
        ...cur,
        street: json.street || cur.street,
        neighborhood: json.neighborhood || cur.neighborhood,
        city: json.city,
        state: json.state,
        postalCode: json.postal_code,
      }));
      setGeoStatus({ kind: "success", message: "Endereço preenchido pelo CEP. Confira o número." });
    } catch (error) {
      setGeoStatus({ kind: "error", message: error instanceof Error && error.message ? error.message : "Não foi possível buscar o CEP." });
    } finally {
      setBusy(null);
    }
  }

  async function locate() {
    setBusy("geo");
    setGeoStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/geo/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street: f.street,
          number: f.number,
          neighborhood: f.neighborhood,
          city: f.city,
          state: f.state,
          postal_code: f.postalCode.replace(/\D/g, ""),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setF((cur) => ({ ...cur, latitude: String(json.latitude), longitude: String(json.longitude), coordsSource: "nominatim" }));
      setGeoStatus({ kind: "success", message: "Pino sugerido. Arraste até a porta da academia e salve para confirmar." });
    } catch (error) {
      setGeoStatus({ kind: "error", message: error instanceof Error && error.message ? error.message : "Não foi possível localizar." });
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (state.status === "success") onDone?.();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField id={`${idPrefix}-name`} name="name" label="Nome da unidade" required maxLength={80} placeholder="Ex.: Sede" value={f.name} onChange={set("name")} errors={errors.name} />

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40">
          <InputField id={`${idPrefix}-postalCode`} name="postalCode" label="CEP" inputMode="numeric" maxLength={9} value={f.postalCode} onChange={set("postalCode")} errors={errors.postalCode} />
        </div>
        <Button type="button" variant="secondary" onClick={lookupCep} loading={busy === "cep"} disabled={f.postalCode.replace(/\D/g, "").length !== 8}>
          <Search aria-hidden className="size-4" /> Buscar CEP
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <InputField id={`${idPrefix}-street`} name="street" label="Rua" maxLength={120} value={f.street} onChange={set("street")} errors={errors.street} />
        <InputField id={`${idPrefix}-number`} name="number" label="Número" maxLength={20} value={f.number} onChange={set("number")} errors={errors.number} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id={`${idPrefix}-complement`} name="complement" label="Complemento" maxLength={80} value={f.complement} onChange={set("complement")} />
        <InputField id={`${idPrefix}-neighborhood`} name="neighborhood" label="Bairro" maxLength={80} value={f.neighborhood} onChange={set("neighborhood")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <InputField id={`${idPrefix}-city`} name="city" label="Cidade" required maxLength={80} value={f.city} onChange={set("city")} errors={errors.city} />
        <SelectField id={`${idPrefix}-state`} name="state" label="Estado" value={f.state} onChange={set("state")} errors={errors.state}>
          <option value="">—</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </SelectField>
      </div>
      <InputField id={`${idPrefix}-referencePoint`} name="referencePoint" label="Ponto de referência" maxLength={160} value={f.referencePoint} onChange={set("referencePoint")} />

      <fieldset className="space-y-3 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold">Localização no mapa</legend>
        <Button type="button" variant="secondary" onClick={locate} loading={busy === "geo"} disabled={!f.city || !f.state}>
          <LocateFixed aria-hidden className="size-4" /> Localizar no mapa
        </Button>
        <FormMessage status={geoStatus.kind} message={geoStatus.message} />
        <LeafletMap
          label="Mapa para posicionar o pino da unidade. Clique ou arraste o pino."
          className="h-72"
          editable={{
            lat,
            lng,
            onChange: (la, ln) => setF((cur) => ({ ...cur, latitude: String(la), longitude: String(ln), coordsSource: "manual" })),
          }}
          center={lat != null && lng != null ? [lat, lng] : undefined}
        />
        <p className="text-[13px] text-muted">Sem mapa? Informe as coordenadas abaixo (ex.: copiadas do seu app de mapas).</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            id={`${idPrefix}-latitude`}
            name="latitude"
            label="Latitude"
            inputMode="decimal"
            value={f.latitude}
            onChange={(e) => setF((cur) => ({ ...cur, latitude: e.target.value, coordsSource: "manual" }))}
            errors={errors.latitude}
          />
          <InputField
            id={`${idPrefix}-longitude`}
            name="longitude"
            label="Longitude"
            inputMode="decimal"
            value={f.longitude}
            onChange={(e) => setF((cur) => ({ ...cur, longitude: e.target.value, coordsSource: "manual" }))}
            errors={errors.longitude}
          />
        </div>
        <input type="hidden" name="coordsSource" value={f.coordsSource} />
      </fieldset>

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="isActive" defaultChecked={unit?.is_active ?? true} className="size-5 accent-(--primary)" />
        <span>Unidade ativa (aparece para o público)</span>
      </label>

      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {unit ? "Salvar unidade" : "Adicionar unidade"}
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
