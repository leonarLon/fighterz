"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Plus, Trash2, UserMinus } from "lucide-react";
import {
  BRAZILIAN_STATES,
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  CATALOG_ITEM_KINDS,
  CATALOG_ITEM_LABELS,
  PRICE_STATUSES,
  formatBrl,
  formatDate,
} from "@figtherz/core";
import {
  deleteBusiness,
  deleteCatalogItem,
  deletePromotion,
  inviteBusinessAdmin,
  removeBusinessMember,
  saveCatalogItem,
  savePromotion,
  setBusinessVisibility,
  updateBusiness,
} from "@/app/actions/businesses";
import type { BusinessData, BusinessPromotion, CatalogItem } from "@/lib/businesses";
import { idleState } from "@/lib/form-state";
import { MartialArtCheckboxes } from "@/components/academy/martial-art-checkboxes";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";

type Result = { ok: boolean; message?: string };

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<Result>) =>
    startTransition(async () => {
      const result = await fn();
      setNotice({ ok: result.ok, text: result.message ?? (result.ok ? "Feito." : "Erro.") });
      if (result.ok) router.refresh();
    });
  return { pending, notice, run };
}

function Notice({ notice }: { notice: { ok: boolean; text: string } | null }) {
  return (
    <p aria-live="polite" className={notice?.ok === false ? "text-[13px] text-danger empty:hidden" : "text-[13px] text-success empty:hidden"}>
      {notice?.text ?? ""}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------
export function BusinessInfoSection({ data, arts }: { data: BusinessData; arts: { id: string; name: string }[] }) {
  const { business } = data;
  const [state, action, pending] = useActionState(updateBusiness.bind(null, business.id), idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  return (
    <Card>
      <h2 className="mb-4 font-display text-2xl font-semibold">Dados da página</h2>
      <form action={action} className="space-y-4" noValidate>
        <FormMessage status={state.status} message={state.message} />
        <InputField id="business-name" name="name" label="Nome" required maxLength={80} defaultValue={v?.name ?? business.name} errors={e.name} />
        <SelectField id="business-category" name="category" label="Tipo" defaultValue={v?.category ?? business.category} errors={e.category}>
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {BUSINESS_CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        <TextareaField
          id="business-description"
          name="description"
          label="Descrição"
          rows={4}
          maxLength={3000}
          defaultValue={v?.description ?? business.description ?? ""}
          errors={e.description}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField id="business-website" name="website" label="Site" placeholder="https://" defaultValue={v?.website ?? business.website ?? ""} errors={e.website} />
          <InputField id="business-instagram" name="instagram" label="Instagram" placeholder="@pagina" defaultValue={v?.instagram ?? business.instagram ?? ""} errors={e.instagram} />
          <InputField
            id="business-contactEmail"
            name="contactEmail"
            label="E-mail de contato"
            type="email"
            defaultValue={v?.contactEmail ?? business.contact_email ?? ""}
            errors={e.contactEmail}
          />
          <InputField id="business-contactPhone" name="contactPhone" label="Telefone" defaultValue={v?.contactPhone ?? business.contact_phone ?? ""} errors={e.contactPhone} />
          <InputField id="business-city" name="city" label="Cidade (opcional)" maxLength={80} defaultValue={v?.city ?? business.city ?? ""} errors={e.city} />
          <SelectField id="business-state" name="state" label="Estado (opcional)" defaultValue={v?.state ?? business.state ?? ""} errors={e.state}>
            <option value="">—</option>
            {BRAZILIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </div>
        <MartialArtCheckboxes arts={arts} selected={business.martial_art_ids} errors={e.martialArtIds} legend="Modalidades atendidas (opcional)" />
        <Button type="submit" loading={pending}>
          Salvar dados
        </Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------
function ItemForm({ businessId, item, onDone }: { businessId: string; item?: CatalogItem; onDone?: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof saveCatalogItem>[2], formData: FormData) => {
    const result = await saveCatalogItem(businessId, item?.id ?? null, prev, formData);
    if (result.status === "success") {
      router.refresh();
      onDone?.();
    }
    return result;
  }, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const key = item?.id.slice(0, 8) ?? "novo";
  const [priceStatus, setPriceStatus] = useState<string>(v?.priceStatus ?? item?.price_status ?? "undisclosed");
  const [isActive, setIsActive] = useState(v ? v.isActive === "on" : (item?.is_active ?? true));

  return (
    <form action={action} className="space-y-3" noValidate aria-label={item ? `Editar ${item.name}` : "Novo item do catálogo"}>
      <FormMessage status={state.status} message={state.message} />
      {/* Valores controlados vão em campos ocultos: o React reinicia o form após cada envio. */}
      <input type="hidden" name="priceStatus" value={priceStatus} />
      <input type="hidden" name="isActive" value={isActive ? "on" : ""} />
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <SelectField id={`item-kind-${key}`} name="kind" label="Tipo" defaultValue={v?.kind ?? item?.kind ?? "product"}>
          {CATALOG_ITEM_KINDS.map((k) => (
            <option key={k} value={k}>
              {CATALOG_ITEM_LABELS[k]}
            </option>
          ))}
        </SelectField>
        <InputField id={`item-name-${key}`} name="name" label="Nome" required maxLength={120} defaultValue={v?.name ?? item?.name ?? ""} errors={e.name} />
      </div>
      <TextareaField
        id={`item-description-${key}`}
        name="description"
        label="Descrição (opcional)"
        rows={2}
        maxLength={1000}
        defaultValue={v?.description ?? item?.description ?? ""}
        errors={e.description}
      />
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Preço</legend>
        <div className="flex flex-wrap gap-x-4">
          {PRICE_STATUSES.map((s) => (
            <label key={s} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name={`priceStatus-${key}`}
                value={s}
                checked={priceStatus === s}
                onChange={() => setPriceStatus(s)}
                className="size-5 accent-(--primary)"
              />
              {s === "paid" ? "Tem preço" : s === "free" ? "Gratuito" : "Valor não divulgado"}
            </label>
          ))}
        </div>
        {e.priceStatus && <p className="text-[13px] text-danger">{e.priceStatus[0]}</p>}
      </fieldset>
      {priceStatus === "paid" && (
        <InputField
          id={`item-price-${key}`}
          name="price"
          label="Valor (R$)"
          inputMode="decimal"
          placeholder="199,90"
          className="max-w-40"
          defaultValue={v?.price ?? (item?.price_cents ? formatBrl(item.price_cents).replace("R$ ", "") : "")}
          errors={e.price}
        />
      )}
      <InputField
        id={`item-url-${key}`}
        name="url"
        label="Link (opcional)"
        placeholder="https://"
        defaultValue={v?.url ?? item?.url ?? ""}
        errors={e.url}
      />
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={isActive} onChange={(ev) => setIsActive(ev.target.checked)} className="size-5 accent-(--primary)" />
        Mostrar na página pública
      </label>
      <Button type="submit" variant={item ? "secondary" : "primary"} loading={pending}>
        {item ? "Salvar item" : (
          <>
            <Plus aria-hidden className="size-4" /> Adicionar ao catálogo
          </>
        )}
      </Button>
    </form>
  );
}

function priceText(item: CatalogItem) {
  if (item.price_status === "paid" && item.price_cents) return formatBrl(item.price_cents);
  return item.price_status === "free" ? "Gratuito" : "Valor não divulgado";
}

export function CatalogSection({ data }: { data: BusinessData }) {
  const { business, items, catalogLimit } = data;
  const remove = useAction();
  const [editing, setEditing] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const full = items.length >= catalogLimit;

  return (
    <Card>
      <h2 className="mb-1 font-display text-2xl font-semibold">Catálogo</h2>
      <p className="mb-4 text-sm text-muted">
        Produtos e serviços ({items.length} de {catalogLimit}). Preços são informativos: a venda acontece fora do Fighterz.
      </p>
      {items.length > 0 && (
        <ul className="mb-4 divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <li key={item.id} className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-sm text-muted">
                    {" "}
                    · {CATALOG_ITEM_LABELS[item.kind]} · {priceText(item)}
                    {!item.is_active && " · oculto"}
                  </span>
                </span>
                <span className="flex gap-1">
                  <Button variant="ghost" onClick={() => setEditing(editing === item.id ? null : item.id)} aria-expanded={editing === item.id}>
                    <Pencil aria-hidden className="size-4" /> Editar<span className="sr-only"> {item.name}</span>
                  </Button>
                  <Button variant="ghost" disabled={remove.pending} onClick={() => remove.run(() => deleteCatalogItem(business.id, item.id))}>
                    <Trash2 aria-hidden className="size-4" /> Apagar<span className="sr-only"> {item.name}</span>
                  </Button>
                </span>
              </div>
              {editing === item.id && (
                <div className="mt-3 border-l-2 border-border pl-3">
                  <ItemForm businessId={business.id} item={item} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Notice notice={remove.notice} />
      {full ? (
        <p className="text-[13px] text-muted">O catálogo chegou ao limite. Apague um item para adicionar outro.</p>
      ) : (
        <details className="rounded-md border border-border p-3">
          <summary className="cursor-pointer font-semibold">Adicionar item</summary>
          <div className="mt-3">
            <ItemForm key={formKey} businessId={business.id} onDone={() => setFormKey((k) => k + 1)} />
          </div>
        </details>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Promoções
// ---------------------------------------------------------------------------
function PromotionForm({ businessId, promotion, onDone }: { businessId: string; promotion?: BusinessPromotion; onDone?: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof savePromotion>[2], formData: FormData) => {
    const result = await savePromotion(businessId, promotion?.id ?? null, prev, formData);
    if (result.status === "success") {
      router.refresh();
      onDone?.();
    }
    return result;
  }, idleState);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const key = promotion?.id.slice(0, 8) ?? "nova";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return (
    <form action={action} className="space-y-3" noValidate aria-label={promotion ? `Editar ${promotion.title}` : "Nova promoção"}>
      <FormMessage status={state.status} message={state.message} />
      <InputField id={`promo-title-${key}`} name="title" label="Título" required maxLength={120} defaultValue={v?.title ?? promotion?.title ?? ""} errors={e.title} />
      <TextareaField
        id={`promo-description-${key}`}
        name="description"
        label="Descrição (opcional)"
        rows={2}
        maxLength={1000}
        defaultValue={v?.description ?? promotion?.description ?? ""}
        errors={e.description}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          id={`promo-coupon-${key}`}
          name="couponCode"
          label="Cupom (opcional)"
          maxLength={40}
          placeholder="TATAME10"
          defaultValue={v?.couponCode ?? promotion?.coupon_code ?? ""}
          errors={e.couponCode}
        />
        <InputField id={`promo-url-${key}`} name="url" label="Link (opcional)" placeholder="https://" defaultValue={v?.url ?? promotion?.url ?? ""} errors={e.url} />
        <InputField
          id={`promo-starts-${key}`}
          name="startsOn"
          label="Começa em"
          type="date"
          required
          defaultValue={v?.startsOn ?? promotion?.starts_on ?? today}
          errors={e.startsOn}
        />
        <InputField
          id={`promo-ends-${key}`}
          name="endsOn"
          label="Termina em (opcional)"
          type="date"
          defaultValue={v?.endsOn ?? promotion?.ends_on ?? ""}
          errors={e.endsOn}
        />
      </div>
      <Button type="submit" variant={promotion ? "secondary" : "primary"} loading={pending}>
        {promotion ? "Salvar promoção" : "Criar promoção"}
      </Button>
    </form>
  );
}

export function PromotionsSection({ data }: { data: BusinessData }) {
  const { business, promotions, promotionsLimit } = data;
  const remove = useAction();
  const [editing, setEditing] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const open = promotions.filter((p) => !p.ends_on || p.ends_on >= today);
  const status = (p: BusinessPromotion) => (p.ends_on && p.ends_on < today ? "encerrada" : p.starts_on > today ? "agendada" : "vigente");

  return (
    <Card>
      <h2 className="mb-1 font-display text-2xl font-semibold">Promoções</h2>
      <p className="mb-4 text-sm text-muted">
        Até {promotionsLimit} vigentes ou agendadas ({open.length} agora). Só as vigentes aparecem para o público.
      </p>
      {promotions.length > 0 && (
        <ul className="mb-4 divide-y divide-border rounded-md border border-border">
          {promotions.map((p) => (
            <li key={p.id} className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-semibold">{p.title}</span>
                  <span className="text-sm text-muted">
                    {" "}
                    · {status(p)} · desde {formatDate(p.starts_on)}
                    {p.ends_on ? ` até ${formatDate(p.ends_on)}` : ""}
                  </span>
                </span>
                <span className="flex gap-1">
                  <Button variant="ghost" onClick={() => setEditing(editing === p.id ? null : p.id)} aria-expanded={editing === p.id}>
                    <Pencil aria-hidden className="size-4" /> Editar<span className="sr-only"> {p.title}</span>
                  </Button>
                  <Button variant="ghost" disabled={remove.pending} onClick={() => remove.run(() => deletePromotion(business.id, p.id))}>
                    <Trash2 aria-hidden className="size-4" /> Apagar<span className="sr-only"> {p.title}</span>
                  </Button>
                </span>
              </div>
              {editing === p.id && (
                <div className="mt-3 border-l-2 border-border pl-3">
                  <PromotionForm businessId={business.id} promotion={p} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Notice notice={remove.notice} />
      {open.length >= promotionsLimit ? (
        <p className="text-[13px] text-muted">Limite de promoções atingido. Apague ou encerre uma para criar outra.</p>
      ) : (
        <details className="rounded-md border border-border p-3">
          <summary className="cursor-pointer font-semibold">Nova promoção</summary>
          <div className="mt-3">
            <PromotionForm key={formKey} businessId={business.id} onDone={() => setFormKey((k) => k + 1)} />
          </div>
        </details>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Administradores
// ---------------------------------------------------------------------------
export function MembersSection({ data, viewerId }: { data: BusinessData; viewerId: string }) {
  const { business, members, isOwner } = data;
  const [state, action, pending] = useActionState(inviteBusinessAdmin.bind(null, business.id), idleState);
  const remove = useAction();
  return (
    <Card>
      <h2 id="administradores" className="mb-1 font-display text-2xl font-semibold">
        Administradores
      </h2>
      <p className="mb-4 text-sm text-muted">Quem administra pode editar a página e publicar como ela. A lista não é pública.</p>
      <ul className="mb-4 divide-y divide-border rounded-md border border-border">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span className="flex items-center gap-3">
              <Avatar name={m.displayName} path={m.avatarPath} size="sm" />
              <span>
                <span className="block font-semibold">{m.displayName}</span>
                <span className="block text-[13px] text-muted">
                  @{m.username} · {m.role === "owner" ? "Dono" : m.status === "pending" ? "Convite pendente" : "Administrador"}
                </span>
              </span>
            </span>
            {m.role !== "owner" && (isOwner || m.userId === viewerId) && (
              <Button variant="ghost" disabled={remove.pending} onClick={() => remove.run(() => removeBusinessMember(business.id, m.userId))}>
                <UserMinus aria-hidden className="size-4" />
                {m.userId === viewerId ? "Sair da página" : m.status === "pending" ? `Cancelar convite de ${m.displayName}` : `Remover ${m.displayName}`}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Notice notice={remove.notice} />
      {isOwner && (
        <form action={action} className="mt-3 flex flex-wrap items-end gap-3" noValidate>
          <div className="min-w-64 flex-1">
            <InputField id="username" label="Convidar administrador" placeholder="@usuario" defaultValue={state.status === "error" ? state.values?.username : ""} />
          </div>
          <Button type="submit" loading={pending}>
            Enviar convite
          </Button>
          <div className="w-full">
            <FormMessage status={state.status} message={state.message} />
          </div>
        </form>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Visibilidade e exclusão
// ---------------------------------------------------------------------------
export function VisibilitySection({ data }: { data: BusinessData }) {
  const { business, isOwner } = data;
  const visibility = useAction();
  const [confirm, setConfirm] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState("");
  const visible = business.status === "active";
  const suspended = business.status === "suspended";

  return (
    <Card>
      <h2 className="mb-3 font-display text-2xl font-semibold">Visibilidade</h2>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">
          {suspended ? "A página foi suspensa pela moderação." : visible ? "A página está pública." : "A página está oculta para o público."}
        </p>
        {!suspended && (
          <Button variant="secondary" loading={visibility.pending} onClick={() => visibility.run(() => setBusinessVisibility(business.id, !visible))}>
            {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
            {visible ? "Ocultar página" : "Publicar página"}
          </Button>
        )}
        <Notice notice={visibility.notice} />
      </div>
      {isOwner && (
        <div className="mt-6 border-t border-border pt-4">
          <Button variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>
            <Trash2 aria-hidden className="size-4" /> Excluir página
          </Button>
          <Dialog open={confirm} onClose={() => setConfirm(false)} title="Excluir página?">
            <p>
              A página <strong>{business.name}</strong>, o catálogo, as promoções e as imagens serão apagados. As publicações continuam no perfil de quem
              publicou. Não dá para desfazer.
            </p>
            {deleteError && <p className="mt-2 text-[13px] text-danger">{deleteError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-danger text-white hover:bg-danger/90"
                loading={deleting}
                onClick={() =>
                  startDelete(async () => {
                    const result = await deleteBusiness(business.id);
                    if (result && !result.ok) setDeleteError(result.message);
                  })
                }
              >
                Excluir de vez
              </Button>
            </div>
          </Dialog>
        </div>
      )}
    </Card>
  );
}
