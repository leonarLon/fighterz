"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BadgeCheck, Clock, LocateFixed, MapPin, Plus, Search, Trash2 } from "lucide-react";
import {
  BRAZILIAN_STATES,
  CLASS_LEVELS,
  CLASS_LEVEL_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  formatAddress,
  formatTime,
  nextClassOccurrence,
  type ClassLevel,
} from "@figtherz/core";
import { deleteTeacherClass, deleteTeacherPlace, saveTeacherClasses, saveTeacherPlace } from "@/app/actions/teacher-schedule";
import { idleState } from "@/lib/form-state";
import { routes } from "@/lib/routes";
import { LeafletMap } from "@/components/map/map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";

export type Place = {
  id: string;
  name: string;
  academyId: string | null;
  academySlug: string | null;
  confirmed: boolean;
  address: { street: string | null; number: string | null; complement: string | null; neighborhood: string | null; city: string; state: string };
};
export type OwnClass = {
  id: string;
  placeId: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  level: ClassLevel;
  martialArtName: string;
  acceptsTrial: boolean;
  notes: string | null;
};
type Option = { id: string; name: string };
type AcademyOption = { id: string; name: string; city: string | null };

export function MySchedule({
  places,
  classes,
  arts,
  academies,
}: {
  places: Place[];
  classes: OwnClass[];
  arts: Option[];
  academies: AcademyOption[];
}) {
  const [adding, setAdding] = useState<"place" | "class" | null>(places.length === 0 ? "place" : null);
  const [placeNotice, setPlaceNotice] = useState("");
  // Locais removidos nesta visita: as aulas deles somem da lista na hora (o banco já apagou em cascata).
  const [removedPlaces, setRemovedPlaces] = useState<string[]>([]);
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-semibold">1. Onde você dá aula</h3>
          {adding !== "place" && (
            <Button
              variant="secondary"
              onClick={() => {
                setPlaceNotice("");
                setAdding("place");
              }}
            >
              <Plus aria-hidden className="size-4" /> Adicionar local
            </Button>
          )}
        </div>
        {placeNotice && <FormMessage status="success" message={placeNotice} />}
        <PlaceList
          key={places.map((p) => `${p.id}:${p.confirmed}`).join(",")}
          places={places}
          onRemoved={(id) => setRemovedPlaces((cur) => [...cur, id])}
        />
        {adding === "place" && (
          <PlaceForm
            academies={academies}
            onCancel={places.length > 0 ? () => setAdding(null) : undefined}
            onSaved={(message) => {
              setPlaceNotice(message);
              setAdding(null);
            }}
          />
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-semibold">2. Suas aulas</h3>
          {places.length > 0 && adding !== "class" && (
            <Button variant="secondary" onClick={() => setAdding("class")}>
              <Plus aria-hidden className="size-4" /> Adicionar aula
            </Button>
          )}
        </div>
        {places.length === 0 ? (
          <p className="text-sm text-muted">Cadastre primeiro um local; depois escolha os dias e horários das aulas nele.</p>
        ) : (
          adding === "class" && <ClassForm places={places} arts={arts} onCancel={() => setAdding(null)} />
        )}
        <ClassList
          key={`${classes.map((c) => c.id).join(",")}|${removedPlaces.join(",")}`}
          classes={classes.filter((c) => !removedPlaces.includes(c.placeId))}
          places={places}
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Locais
// ---------------------------------------------------------------------------
function PlaceList({ places, onRemoved }: { places: Place[]; onRemoved: (id: string) => void }) {
  const [items, setItems] = useState(places);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return <p className="text-sm text-muted">Nenhum local ainda.</p>;
  return (
    <div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold">
                <MapPin aria-hidden className="size-4 shrink-0 text-accent" />
                {p.academySlug ? (
                  <Link href={routes.academy(p.academySlug)} className="hover:underline">
                    {p.name}
                  </Link>
                ) : (
                  p.name
                )}
              </p>
              <p className="text-[13px] text-muted">{formatAddress({ ...p.address, postal_code: null })}</p>
              {p.academyId && <ConfirmationBadge confirmed={p.confirmed} />}
            </div>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteTeacherPlace(p.id);
                  setNotice(result.message ?? "");
                  if (result.ok) {
                    setItems((cur) => cur.filter((x) => x.id !== p.id));
                    onRemoved(p.id);
                  }
                })
              }
            >
              <Trash2 aria-hidden className="size-4" /> Remover {p.name}
            </Button>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-2 text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </div>
  );
}

function ConfirmationBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed ? (
    <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-success">
      <BadgeCheck aria-hidden className="size-3.5" /> Confirmado pela academia
    </span>
  ) : (
    <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-warning">
      <Clock aria-hidden className="size-3.5" /> Aguardando a academia confirmar
    </span>
  );
}

type Address = {
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
};
const emptyAddress: Address = {
  name: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  referencePoint: "",
  latitude: "",
  longitude: "",
};

function PlaceForm({
  academies,
  onCancel,
  onSaved,
}: {
  academies: AcademyOption[];
  onCancel?: () => void;
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(saveTeacherPlace, idleState);
  // Salvou: fecha o formulário e a mensagem aparece acima da lista de locais.
  useEffect(() => {
    if (state.status === "success") onSaved(state.message ?? "Local salvo.");
  }, [state, onSaved]);
  const [kind, setKind] = useState<"academy" | "other">(academies.length > 0 ? "academy" : "other");
  const [f, setF] = useState<Address>(emptyAddress);
  const [geo, setGeo] = useState<{ kind: "idle" | "error" | "success"; message?: string }>({ kind: "idle" });
  const [busy, setBusy] = useState<"cep" | "geo" | null>(null);
  const e = state.fieldErrors ?? {};
  const set = (key: keyof Address) => (ev: { target: { value: string } }) => setF((cur) => ({ ...cur, [key]: ev.target.value }));
  const lat = f.latitude === "" ? null : Number(f.latitude);
  const lng = f.longitude === "" ? null : Number(f.longitude);

  async function lookupCep() {
    setBusy("cep");
    setGeo({ kind: "idle" });
    try {
      const res = await fetch(`/api/geo/cep?cep=${encodeURIComponent(f.postalCode)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setF((cur) => ({ ...cur, street: json.street || cur.street, neighborhood: json.neighborhood || cur.neighborhood, city: json.city, state: json.state, postalCode: json.postal_code }));
      setGeo({ kind: "success", message: "Endereço preenchido pelo CEP. Confira o número." });
    } catch (error) {
      setGeo({ kind: "error", message: error instanceof Error && error.message ? error.message : "Não foi possível buscar o CEP." });
    } finally {
      setBusy(null);
    }
  }

  async function locate() {
    setBusy("geo");
    setGeo({ kind: "idle" });
    try {
      const res = await fetch("/api/geo/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ street: f.street, number: f.number, neighborhood: f.neighborhood, city: f.city, state: f.state, postal_code: f.postalCode.replace(/\D/g, "") }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setF((cur) => ({ ...cur, latitude: String(json.latitude), longitude: String(json.longitude) }));
      setGeo({ kind: "success", message: "Pino sugerido. Arraste até o local exato antes de salvar." });
    } catch (error) {
      setGeo({ kind: "error", message: error instanceof Error && error.message ? error.message : "Não foi possível localizar." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form action={action} className="space-y-4 rounded-md border border-border p-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <input type="hidden" name="kind" value={kind} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Tipo de local</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="kind-choice" checked={kind === "academy"} onChange={() => setKind("academy")} className="size-4 accent-(--primary)" disabled={academies.length === 0} />
            Academia cadastrada no Fighterz
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="kind-choice" checked={kind === "other"} onChange={() => setKind("other")} className="size-4 accent-(--primary)" />
            Outro local (academia sem perfil, parque, clube…)
          </label>
        </div>
      </fieldset>

      {kind === "academy" ? (
        <SelectField
          id="place-academyId"
          name="academyId"
          label="Academia"
          defaultValue={state.values?.academyId ?? ""}
          errors={e.academyId}
          help="A academia recebe seu pedido de professor e confirma que você dá aula lá. Até confirmar, suas aulas aparecem como “aguardando confirmação”."
        >
          <option value="">Escolha a academia</option>
          {academies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.city ? ` · ${a.city}` : ""}
            </option>
          ))}
        </SelectField>
      ) : (
        <>
          <InputField id="place-name" name="name" label="Nome do local" required maxLength={120} placeholder="Ex.: Parque Barigui, CT Equipe X" value={f.name} onChange={set("name")} errors={e.name} />
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40">
              <InputField id="place-postalCode" name="postalCode" label="CEP" inputMode="numeric" maxLength={9} value={f.postalCode} onChange={set("postalCode")} errors={e.postalCode} />
            </div>
            <Button type="button" variant="secondary" onClick={lookupCep} loading={busy === "cep"} disabled={f.postalCode.replace(/\D/g, "").length !== 8}>
              <Search aria-hidden className="size-4" /> Buscar CEP
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <InputField id="place-street" name="street" label="Rua" maxLength={120} value={f.street} onChange={set("street")} errors={e.street} />
            <InputField id="place-number" name="number" label="Número" maxLength={20} value={f.number} onChange={set("number")} errors={e.number} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField id="place-complement" name="complement" label="Complemento" maxLength={80} value={f.complement} onChange={set("complement")} />
            <InputField id="place-neighborhood" name="neighborhood" label="Bairro" maxLength={80} value={f.neighborhood} onChange={set("neighborhood")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <InputField id="place-city" name="city" label="Cidade" required maxLength={80} value={f.city} onChange={set("city")} errors={e.city} />
            <SelectField id="place-state" name="state" label="Estado" value={f.state} onChange={set("state")} errors={e.state}>
              <option value="">—</option>
              {BRAZILIAN_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </SelectField>
          </div>
          <InputField id="place-referencePoint" name="referencePoint" label="Ponto de referência" maxLength={160} value={f.referencePoint} onChange={set("referencePoint")} />
          <fieldset className="space-y-3 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-semibold">Localização no mapa (opcional)</legend>
            <p className="text-[13px] text-muted">Com o pino, seus alunos encontram a aula na busca por distância e abrem a rota.</p>
            <Button type="button" variant="secondary" onClick={locate} loading={busy === "geo"} disabled={!f.city || !f.state}>
              <LocateFixed aria-hidden className="size-4" /> Localizar no mapa
            </Button>
            <FormMessage status={geo.kind} message={geo.message} />
            <LeafletMap
              label="Mapa para posicionar o pino do local. Clique ou arraste o pino."
              className="h-64"
              editable={{ lat, lng, onChange: (la, ln) => setF((cur) => ({ ...cur, latitude: String(la), longitude: String(ln) })) }}
              center={lat != null && lng != null ? [lat, lng] : undefined}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField id="place-latitude" name="latitude" label="Latitude" inputMode="decimal" value={f.latitude} onChange={set("latitude")} errors={e.latitude} />
              <InputField id="place-longitude" name="longitude" label="Longitude" inputMode="decimal" value={f.longitude} onChange={set("longitude")} errors={e.longitude} />
            </div>
          </fieldset>
        </>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          Salvar local
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Aulas
// ---------------------------------------------------------------------------
function ClassForm({ places, arts, onCancel }: { places: Place[]; arts: Option[]; onCancel: () => void }) {
  const [state, action, pending] = useActionState(saveTeacherClasses, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const days = new Set((v?.weekdays ?? "").split(",").filter(Boolean));
  return (
    // key: o React reinicia o formulário após cada envio; remontar aplica os valores devolvidos após um erro.
    <form key={`${state.status}-${state.message ?? ""}`} action={action} className="space-y-4 rounded-md border border-border p-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="class-placeId" name="placeId" label="Local" defaultValue={v?.placeId ?? (places.length === 1 ? places[0]!.id : "")} errors={e.placeId}>
          <option value="">Escolha o local</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField id="class-martialArtId" name="martialArtId" label="Modalidade" defaultValue={v?.martialArtId ?? (arts.length === 1 ? arts[0]!.id : "")} errors={e.martialArtId}>
          <option value="">Escolha a modalidade</option>
          {arts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
      </div>
      <fieldset aria-describedby={e.weekdays ? "class-weekdays-error" : undefined}>
        <legend className="mb-2 text-sm font-semibold">Dias da semana</legend>
        <div className="flex flex-wrap gap-2">
          {WEEK_ORDER.map((d) => (
            <label key={d} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="checkbox" name="weekdays" value={d} defaultChecked={days.has(String(d))} className="size-4 accent-(--primary)" />
              <span>
                <span aria-hidden>{WEEKDAY_SHORT[d]}</span>
                <span className="sr-only">{WEEKDAY_LABELS[d]}</span>
              </span>
            </label>
          ))}
        </div>
        {e.weekdays && (
          <p id="class-weekdays-error" className="mt-1.5 text-[13px] font-medium text-danger">
            {e.weekdays[0]}
          </p>
        )}
      </fieldset>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <InputField id="class-startsAt" name="startsAt" label="Início" type="time" required defaultValue={v?.startsAt ?? ""} errors={e.startsAt} />
        <InputField id="class-endsAt" name="endsAt" label="Fim" type="time" required defaultValue={v?.endsAt ?? ""} errors={e.endsAt} />
        <SelectField id="class-level" name="level" label="Nível" defaultValue={v?.level ?? "all"} errors={e.level}>
          {CLASS_LEVELS.map((l) => (
            <option key={l} value={l}>
              {CLASS_LEVEL_LABELS[l]}
            </option>
          ))}
        </SelectField>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="acceptsTrial" defaultChecked={false} className="size-5 accent-(--primary)" />
        <span>Aceita aula experimental</span>
      </label>
      <TextareaField id="class-notes" name="notes" label="Observação (opcional)" rows={2} maxLength={300} placeholder="Ex.: levar kimono; aula ao ar livre, cancela com chuva" defaultValue={v?.notes ?? ""} errors={e.notes} />
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          Adicionar à grade
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Fechar
        </Button>
      </div>
    </form>
  );
}

function ClassList({ classes, places }: { classes: OwnClass[]; places: Place[] }) {
  const [items, setItems] = useState(classes);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return <p className="text-sm text-muted">Nenhuma aula na sua grade ainda.</p>;
  const placeOf = (id: string) => places.find((p) => p.id === id);
  return (
    <div className="space-y-3">
      {WEEK_ORDER.map((d) => {
        const day = items.filter((c) => c.weekday === d).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        if (day.length === 0) return null;
        return (
          <section key={d} aria-labelledby={`minha-grade-${d}`}>
            <h4 id={`minha-grade-${d}`} className="mb-1 font-display text-lg font-semibold">
              {WEEKDAY_LABELS[d]}
            </h4>
            <ul className="divide-y divide-border rounded-md border border-border">
              {day.map((c) => {
                const place = placeOf(c.placeId);
                return (
                  <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="font-semibold tabular-nums">
                        {formatTime(c.starts_at)}–{formatTime(c.ends_at)} · {c.martialArtName}
                      </p>
                      {/* "próxima" depende do relógio: pode diferir entre servidor e navegador por alguns minutos. */}
                      <p className="text-[13px] text-muted" suppressHydrationWarning>
                        {CLASS_LEVEL_LABELS[c.level]} · {place?.name ?? "Local removido"} · próxima: {nextClassOccurrence(c).label}
                      </p>
                      {c.notes && <p className="text-[13px]">{c.notes}</p>}
                      {place?.academyId && <ConfirmationBadge confirmed={place.confirmed} />}
                    </div>
                    <Button
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteTeacherClass(c.id);
                          setNotice(result.message ?? "");
                          if (result.ok) setItems((cur) => cur.filter((x) => x.id !== c.id));
                        })
                      }
                    >
                      <Trash2 aria-hidden className="size-4" /> Remover aula de {WEEKDAY_LABELS[c.weekday]} às {formatTime(c.starts_at)}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p aria-live="polite" className="text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </div>
  );
}
