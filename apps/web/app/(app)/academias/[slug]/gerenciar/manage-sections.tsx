"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, MapPin, Pencil, Plus, Ticket, Trash2, UserMinus, X } from "lucide-react";
import { CLASS_LEVEL_LABELS, MEMBERSHIP_ROLE_LABELS, UNIT_ACCESS_KINDS, WEEKDAY_SHORT, formatAddress, formatTime } from "@figtherz/core";
import {
  deleteClass,
  deleteUnit,
  inviteMember,
  removeMember,
  respondMembership,
  setAcademyVisibility,
  updateAcademy,
} from "@/app/actions/academies";
import type { AcademyData, ClassRow, Unit } from "@/lib/academies";
import { idleState } from "@/lib/form-state";
import { MartialArtCheckboxes } from "@/components/academy/martial-art-checkboxes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { ClassForm } from "./class-form";
import { UnitForm } from "./unit-form";
import { UnitAccessForm } from "./unit-access-form";

type Props = { data: AcademyData; arts: { id: string; name: string }[] };

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success?: string) =>
    startTransition(async () => {
      const result = await fn();
      setNotice(result.ok ? (success ?? result.message ?? "") : (result.message ?? "Erro."));
      router.refresh();
    });
  return { pending, notice, run };
}

export function AcademyInfoSection({ data, arts }: Props) {
  const { academy } = data;
  const [state, action, pending] = useActionState(updateAcademy.bind(null, academy.id), idleState);
  const visibility = useAction();
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const visible = academy.status === "active";

  return (
    <Card>
      <h2 className="mb-4 font-display text-2xl font-semibold">Dados da academia</h2>
      <form action={action} className="space-y-4" noValidate>
        <FormMessage status={state.status} message={state.message} />
        <InputField id={`academy-name`} name="name" label="Nome" required maxLength={80} defaultValue={v?.name ?? academy.name} errors={e.name} />
        <TextareaField id={`academy-description`} name="description" label="Descrição" rows={4} maxLength={3000} defaultValue={v?.description ?? academy.description ?? ""} errors={e.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField id={`academy-website`} name="website" label="Site" placeholder="https://" defaultValue={v?.website ?? academy.website ?? ""} errors={e.website} />
          <InputField id={`academy-instagram`} name="instagram" label="Instagram" placeholder="@academia" defaultValue={v?.instagram ?? academy.instagram ?? ""} errors={e.instagram} />
          <InputField id={`academy-contactEmail`} name="contactEmail" label="E-mail de contato" type="email" defaultValue={v?.contactEmail ?? academy.contact_email ?? ""} errors={e.contactEmail} />
          <InputField id={`academy-contactPhone`} name="contactPhone" label="Telefone" defaultValue={v?.contactPhone ?? academy.contact_phone ?? ""} errors={e.contactPhone} />
        </div>
        <MartialArtCheckboxes arts={arts} selected={data.martialArts.map((m) => m.id)} errors={e.martialArtIds} />
        <Button type="submit" loading={pending}>
          Salvar dados
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <p className="text-sm text-muted">{visible ? "A página está pública." : "A página está oculta para o público."}</p>
        <Button variant="secondary" loading={visibility.pending} onClick={() => visibility.run(() => setAcademyVisibility(academy.id, !visible))}>
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
          {visible ? "Ocultar academia" : "Publicar academia"}
        </Button>
        <p aria-live="polite" className="text-[13px] text-muted">{visibility.notice}</p>
      </div>
    </Card>
  );
}

export function UnitsSection({ data }: { data: AcademyData }) {
  const [editing, setEditing] = useState<string | "new" | null>(data.units.length === 0 ? "new" : null);
  const del = useAction();

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">Unidades</h2>
        {editing === null && (
          <Button variant="secondary" onClick={() => setEditing("new")}>
            <Plus aria-hidden className="size-4" /> Nova unidade
          </Button>
        )}
      </div>
      <ul className="space-y-3">
        {data.units.map((unit: Unit) => (
          <li key={unit.id} className="rounded-md border border-border p-3">
            {editing === unit.id ? (
              <UnitForm academyId={data.academy.id} unit={unit} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {unit.name} {!unit.is_active && <span className="text-[13px] font-normal text-muted">(inativa)</span>}
                  </p>
                  <p className="flex items-start gap-1 text-[13px] text-muted">
                    <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    {formatAddress(unit)}
                    {unit.latitude == null && " · sem pino no mapa"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => setEditing(unit.id)} disabled={editing !== null} aria-label={`Editar unidade ${unit.name}`}>
                    <Pencil aria-hidden className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={del.pending || editing !== null}
                    aria-label={`Remover unidade ${unit.name}`}
                    onClick={() => confirm(`Remover a unidade "${unit.name}" e as aulas dela?`) && del.run(() => deleteUnit(data.academy.id, unit.id), "Unidade removida.")}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
                <details className="w-full rounded-md border border-border">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold">
                    <Ticket aria-hidden className="size-4 text-accent" /> TotalPass, Wellhub e diária · {unit.name}
                  </summary>
                  <div className="divide-y divide-border border-t border-border">
                    {UNIT_ACCESS_KINDS.map((kind) => (
                      <div key={kind} className="p-3">
                        <UnitAccessForm
                          academyId={data.academy.id}
                          unitId={unit.id}
                          unitName={unit.name}
                          kind={kind}
                          current={data.access.find((a) => a.unit_id === unit.id && a.kind === kind)}
                          arts={data.martialArts.map((m) => ({ id: m.id, name: m.name }))}
                        />
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" && (
        <div className="mt-3 rounded-md border border-border p-3">
          <UnitForm academyId={data.academy.id} onDone={data.units.length > 0 ? () => setEditing(null) : undefined} />
        </div>
      )}
      <p aria-live="polite" className="mt-2 text-[13px] text-muted">{del.notice}</p>
    </Card>
  );
}

export function ClassesSection({ data }: { data: AcademyData }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const del = useAction();
  const units = data.units.map((u) => ({ id: u.id, name: u.name }));
  const arts = data.martialArts.map((m) => ({ id: m.id, name: m.name }));
  const teachers = data.members
    .filter((m) => m.role === "teacher" && m.status === "active")
    .map((m) => ({ id: m.userId, name: m.displayName }));
  const sorted = [...data.classes].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.starts_at.localeCompare(b.starts_at));

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">Grade de aulas</h2>
        {editing === null && units.length > 0 && arts.length > 0 && (
          <Button variant="secondary" onClick={() => setEditing("new")}>
            <Plus aria-hidden className="size-4" /> Nova aula
          </Button>
        )}
      </div>
      {units.length === 0 && <p className="text-muted">Cadastre uma unidade antes de montar a grade.</p>}
      {editing === "new" && (
        <div className="mb-4 rounded-md border border-border p-3">
          <ClassForm academyId={data.academy.id} units={units} arts={arts} teachers={teachers} onDone={() => setEditing(null)} />
        </div>
      )}
      <ul className="divide-y divide-border">
        {sorted.map((c: ClassRow) => (
          <li key={c.id} className="py-3">
            {editing === c.id ? (
              <ClassForm academyId={data.academy.id} units={units} arts={arts} teachers={teachers} item={c} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    <span className="tabular-nums">
                      {WEEKDAY_SHORT[c.weekday]} {formatTime(c.starts_at)}–{formatTime(c.ends_at)}
                    </span>{" "}
                    · {c.name}
                    {c.status !== "active" && <span className="ml-1 text-[13px] text-warning">({c.status === "paused" ? "pausada" : "cancelada"})</span>}
                  </p>
                  <p className="text-[13px] text-muted">
                    {c.martial_art_name} · {CLASS_LEVEL_LABELS[c.level]} · {c.unit_name}
                    {c.teacher_display_name ? ` · ${c.teacher_display_name}` : ""}
                    {c.accepts_trial ? " · aula experimental" : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => setEditing(c.id)} disabled={editing !== null} aria-label={`Editar aula ${c.name} de ${WEEKDAY_SHORT[c.weekday]}`}>
                    <Pencil aria-hidden className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={del.pending || editing !== null}
                    aria-label={`Remover aula ${c.name} de ${WEEKDAY_SHORT[c.weekday]}`}
                    onClick={() => confirm(`Remover "${c.name}"?`) && del.run(() => deleteClass(data.academy.id, c.id), "Aula removida.")}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-2 text-[13px] text-muted">{del.notice}</p>
    </Card>
  );
}

export function TeamSection({ data }: { data: AcademyData }) {
  const [state, action, pending] = useActionState(inviteMember.bind(null, data.academy.id), idleState);
  const act = useAction();
  const id = data.academy.id;
  const active = data.members.filter((m) => m.status === "active");
  const requests = data.members.filter((m) => m.status === "pending" && m.requestedBy === "user");
  const invites = data.members.filter((m) => m.status === "pending" && m.requestedBy === "academy");
  const role = (r: string) => MEMBERSHIP_ROLE_LABELS[r as keyof typeof MEMBERSHIP_ROLE_LABELS] ?? r;

  return (
    <Card id="equipe" className="scroll-mt-20">
      <h2 className="mb-4 font-display text-2xl font-semibold">Equipe e alunos</h2>

      {requests.length > 0 && (
        <section aria-labelledby="pedidos" className="mb-5">
          <h3 id="pedidos" className="mb-2 font-semibold">Pedidos para aprovar</h3>
          <ul className="space-y-2">
            {requests.map((m) => (
              <li key={`${m.userId}-${m.role}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2">
                <span>
                  <span className="font-semibold">{m.displayName}</span> <span className="text-muted">@{m.username} · {role(m.role)}</span>
                </span>
                <span className="flex gap-2">
                  <Button disabled={act.pending} onClick={() => act.run(() => respondMembership(id, m.userId, m.role, true))}>
                    <Check aria-hidden className="size-4" /> Aprovar
                  </Button>
                  <Button variant="secondary" disabled={act.pending} onClick={() => act.run(() => respondMembership(id, m.userId, m.role, false))}>
                    <X aria-hidden className="size-4" /> Recusar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="vinculos" className="mb-5">
        <h3 id="vinculos" className="mb-2 font-semibold">Vínculos ativos</h3>
        <ul className="divide-y divide-border rounded-md border border-border">
          {active.map((m) => (
            <li key={`${m.userId}-${m.role}`} className="flex items-center justify-between gap-2 px-3 py-2">
              <span>
                <span className="font-semibold">{m.displayName}</span> <span className="text-muted">@{m.username} · {role(m.role)}</span>
              </span>
              {m.role !== "owner" && m.userId !== data.viewerId && (
                <Button
                  variant="ghost"
                  disabled={act.pending}
                  aria-label={`Remover ${m.displayName} (${role(m.role)})`}
                  onClick={() => confirm(`Remover ${m.displayName}?`) && act.run(() => removeMember(id, m.userId, m.role), "Vínculo removido.")}
                >
                  <UserMinus aria-hidden className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {invites.length > 0 && (
        <section aria-labelledby="convites" className="mb-5">
          <h3 id="convites" className="mb-2 font-semibold">Convites aguardando resposta</h3>
          <ul className="space-y-1 text-sm">
            {invites.map((m) => (
              <li key={`${m.userId}-${m.role}`} className="flex items-center justify-between gap-2">
                <span>
                  {m.displayName} <span className="text-muted">@{m.username} · {role(m.role)}</span>
                </span>
                <Button variant="ghost" disabled={act.pending} onClick={() => act.run(() => removeMember(id, m.userId, m.role), "Convite cancelado.")}>
                  Cancelar convite
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p aria-live="polite" className="mb-3 text-[13px] text-muted empty:hidden">{act.notice}</p>

      <form action={action} className="space-y-3 rounded-md border border-border p-3" noValidate>
        <h3 className="font-semibold">Convidar</h3>
        <FormMessage status={state.status} message={state.message} />
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <InputField id={`invite-username`} name="username" label="Usuário" placeholder="@usuario" defaultValue={state.status === "error" ? state.values?.username : ""} errors={state.fieldErrors?.username} />
          <SelectField id={`invite-role`} name="role" label="Papel" defaultValue="teacher">
            <option value="teacher">Professor</option>
            <option value="admin">Administrador</option>
          </SelectField>
        </div>
        <p className="text-[13px] text-muted">Professores precisam ter o perfil profissional aprovado. A pessoa confirma o convite.</p>
        <Button type="submit" loading={pending}>
          Enviar convite
        </Button>
      </form>
    </Card>
  );
}
