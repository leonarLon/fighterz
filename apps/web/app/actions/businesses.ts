"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { businessPromotionSchema, businessSchema, catalogItemSchema, coverPathPattern, newBusinessSchema } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { COVERS_BUCKET } from "@/lib/covers";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  P0429: "Muitas tentativas em pouco tempo. Tente de novo mais tarde.",
  user_not_found: "Usuário não encontrado.",
  already_member: "Essa pessoa já administra a página ou tem um convite pendente.",
  not_business_owner: "Só o dono da página pode fazer isso.",
  owner_cannot_leave: "O dono não pode sair da página. Se quiser, exclua a página.",
  invite_not_found: "Convite não encontrado.",
  business_status_forbidden: "A página foi suspensa pela moderação e não pode ser reativada por aqui.",
  catalog_limit: "O catálogo chegou ao limite de itens.",
  promotions_limit: "Você chegou ao limite de promoções vigentes ou futuras.",
  martial_art_not_found: "Modalidade inválida.",
  account_suspended: "Sua conta está suspensa.",
  "42501": "Você não tem permissão para alterar esta página.",
};

function message(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  return ERRORS[error.message ?? ""] ?? ERRORS[error.code ?? ""] ?? fallback;
}

async function slugOf(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("slug").eq("id", businessId).maybeSingle();
  return data?.slug ?? null;
}

async function revalidateBusiness(businessId: string) {
  const slug = await slugOf(businessId);
  revalidatePath(routes.businesses);
  if (!slug) return;
  revalidatePath(routes.business(slug));
  revalidatePath(routes.manageBusiness(slug));
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export async function createBusiness(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = { name: text(formData, "name"), category: text(formData, "category") };
  const parsed = newBusinessSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("create_business", { p_name: parsed.data.name, p_category: parsed.data.category });
  if (error || !slug) return { status: "error", message: message(error, "Não foi possível criar a página."), values };
  redirect(routes.manageBusiness(slug));
}

export async function updateBusiness(businessId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const keys = ["name", "category", "description", "website", "instagram", "contactEmail", "contactPhone", "city", "state"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const parsed = businessSchema.safeParse({
    ...values,
    martialArtIds: formData.getAll("martialArtIds").filter((v): v is string => typeof v === "string"),
  });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .update({
      name: d.name,
      category: d.category,
      description: d.description,
      website: d.website,
      instagram: d.instagram,
      contact_email: d.contactEmail,
      contact_phone: d.contactPhone,
      city: d.city,
      state: d.state,
      martial_art_ids: [...new Set(d.martialArtIds)],
    })
    .eq("id", businessId)
    .select("id");
  if (error || !data?.length) return { status: "error", message: message(error ?? { code: "42501" }, "Não foi possível salvar."), values };
  await revalidateBusiness(businessId);
  return { status: "success", message: "Dados da página salvos.", values };
}

export async function setBusinessVisibility(businessId: string, visible: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .update({ status: visible ? "active" : "hidden" })
    .eq("id", businessId)
    .select("id");
  await revalidateBusiness(businessId);
  if (error || !data?.length) return { ok: false, message: message(error ?? { code: "42501" }, "Não foi possível alterar a visibilidade.") };
  return { ok: true, message: visible ? "A página está pública." : "A página está oculta." };
}

/** Só o dono exclui. Apaga também as imagens do bucket (logo, banner). */
export async function deleteBusiness(businessId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data: owner } = await supabase.rpc("is_business_owner", { p_business: businessId });
  if (!owner) return { ok: false, message: ERRORS.not_business_owner! };
  // Arquivos antes da linha: depois de excluída, a pasta deixa de pertencer a alguém e o Storage nega.
  const folder = `business/${businessId}`;
  const { data: files } = await supabase.storage.from(COVERS_BUCKET).list(folder, { limit: 1000 });
  if (files?.length) await supabase.storage.from(COVERS_BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
  const { data, error } = await supabase.from("businesses").delete().eq("id", businessId).select("id");
  if (error || !data?.length) return { ok: false, message: message(error ?? { message: "not_business_owner" }, "Não foi possível excluir a página.") };
  revalidatePath(routes.businesses);
  redirect(`${routes.businesses}?excluida=1`);
}

export async function setBusinessFollow(businessId: string, follow: boolean): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = follow
    ? await supabase.from("business_followers").upsert({ business_id: businessId, user_id: user.id }, { ignoreDuplicates: true })
    : await supabase.from("business_followers").delete().eq("business_id", businessId).eq("user_id", user.id);
  if (error) return { ok: false, message: message(error, "Não foi possível seguir a página.") };
  revalidatePath(routes.feed);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Administradores
// ---------------------------------------------------------------------------
export async function inviteBusinessAdmin(businessId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const username = text(formData, "username").trim().replace(/^@/, "");
  const values = { username };
  if (!/^[a-z0-9_.]{3,30}$/i.test(username)) return { status: "error", message: "Informe um @usuário válido.", values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_business_admin", { p_business: businessId, p_username: username });
  if (error) return { status: "error", message: message(error, "Não foi possível enviar o convite."), values };
  await revalidateBusiness(businessId);
  return { status: "success", message: `Convite enviado para @${username.toLowerCase()}.` };
}

export async function respondBusinessInvite(businessId: string, accept: boolean): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_business_invite", { p_business: businessId, p_accept: accept });
  if (error) return { ok: false, message: message(error, "Não foi possível responder ao convite.") };
  return { ok: true, message: accept ? "Convite aceito. Você já pode gerenciar a página." : "Convite recusado." };
}

export async function removeBusinessMember(businessId: string, userId: string): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_business_member", { p_business: businessId, p_user: userId });
  if (error) return { ok: false, message: message(error, "Não foi possível remover.") };
  await revalidateBusiness(businessId);
  return { ok: true, message: userId === user.id ? "Você saiu da página." : "Administrador removido." };
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------
export async function saveCatalogItem(businessId: string, itemId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const keys = ["kind", "name", "description", "priceStatus", "price", "url"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  values.isActive = text(formData, "isActive");
  const parsed = catalogItemSchema.safeParse({ ...values, kind: values.kind || "product", isActive: values.isActive === "on" });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;
  // Foto já enviada ao bucket pelo navegador; o banco confere pasta e existência do arquivo.
  const imagePath = text(formData, "imagePath") || null;
  if (imagePath && !coverPathPattern("business", businessId, "item").test(imagePath)) {
    return { status: "error", message: "Foto inválida. Envie de novo.", values };
  }
  const supabase = await createClient();
  const { data: previous } = itemId
    ? await supabase.from("business_items").select("image_path").eq("id", itemId).maybeSingle()
    : { data: null };
  const row = {
    image_path: imagePath,
    kind: d.kind,
    name: d.name,
    description: d.description,
    price_status: d.priceStatus,
    price_cents: d.priceCents,
    url: d.url,
    is_active: d.isActive,
  };
  const { data, error } = itemId
    ? await supabase.from("business_items").update(row).eq("id", itemId).eq("business_id", businessId).select("id")
    : await supabase.from("business_items").insert({ ...row, business_id: businessId }).select("id");
  if (error || !data?.length) return { status: "error", message: message(error ?? { code: "42501" }, "Não foi possível salvar o item."), values };
  if (previous?.image_path && previous.image_path !== imagePath) await supabase.storage.from(COVERS_BUCKET).remove([previous.image_path]);
  await revalidateBusiness(businessId);
  return { status: "success", message: itemId ? "Item atualizado." : "Item adicionado ao catálogo.", values: itemId ? values : undefined };
}

export async function deleteCatalogItem(businessId: string, itemId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("business_items").delete().eq("id", itemId).eq("business_id", businessId).select("image_path");
  if (error || !data?.length) return { ok: false, message: message(error ?? { code: "42501" }, "Não foi possível apagar o item.") };
  const images = data.map((d) => d.image_path).filter((p): p is string => Boolean(p));
  if (images.length) await supabase.storage.from(COVERS_BUCKET).remove(images);
  await revalidateBusiness(businessId);
  return { ok: true, message: "Item apagado." };
}

// ---------------------------------------------------------------------------
// Promoções
// ---------------------------------------------------------------------------
export async function savePromotion(businessId: string, promotionId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const keys = ["title", "description", "couponCode", "url", "startsOn", "endsOn"];
  const values = Object.fromEntries(keys.map((k) => [k, text(formData, k)]));
  const parsed = businessPromotionSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const d = parsed.data;
  const row = { title: d.title, description: d.description, coupon_code: d.couponCode, url: d.url, starts_on: d.startsOn, ends_on: d.endsOn };
  const supabase = await createClient();
  const { data, error } = promotionId
    ? await supabase.from("business_promotions").update(row).eq("id", promotionId).eq("business_id", businessId).select("id")
    : await supabase.from("business_promotions").insert({ ...row, business_id: businessId }).select("id");
  if (error || !data?.length) return { status: "error", message: message(error ?? { code: "42501" }, "Não foi possível salvar a promoção."), values };
  await revalidateBusiness(businessId);
  return { status: "success", message: promotionId ? "Promoção atualizada." : "Promoção criada.", values: promotionId ? values : undefined };
}

export async function deletePromotion(businessId: string, promotionId: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_promotions")
    .delete()
    .eq("id", promotionId)
    .eq("business_id", businessId)
    .select("id");
  if (error || !data?.length) return { ok: false, message: message(error ?? { code: "42501" }, "Não foi possível apagar a promoção.") };
  await revalidateBusiness(businessId);
  return { ok: true, message: "Promoção apagada." };
}
