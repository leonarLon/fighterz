import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { loadBusinessPosts } from "@/lib/posts";

export type CatalogItem = {
  id: string;
  kind: "product" | "service";
  name: string;
  description: string | null;
  price_status: "paid" | "free" | "undisclosed";
  price_cents: number | null;
  url: string | null;
  is_active: boolean;
  position: number;
};

export type BusinessPromotion = {
  id: string;
  title: string;
  description: string | null;
  coupon_code: string | null;
  url: string | null;
  starts_on: string;
  ends_on: string | null;
};

const BUSINESS_COLUMNS =
  "id, slug, name, category, description, logo_path, cover_path, website, instagram, contact_email, contact_phone, city, state, martial_art_ids, status, is_verified";

/** Tudo que a página comercial precisa, já filtrado pela RLS (visitante ou gestão). */
export const loadBusiness = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select(BUSINESS_COLUMNS).eq("slug", slug).maybeSingle();
  if (!business) return null;

  const user = await getCurrentUser();
  const [items, promotions, isManager, members, arts, catalogLimit, promotionsLimit, posts] = await Promise.all([
    supabase
      .from("business_items")
      .select("id, kind, name, description, price_status, price_cents, url, is_active, position")
      .eq("business_id", business.id)
      .order("position")
      .order("created_at"),
    supabase
      .from("business_promotions")
      .select("id, title, description, coupon_code, url, starts_on, ends_on")
      .eq("business_id", business.id)
      .order("starts_on", { ascending: false }),
    user ? supabase.rpc("is_business_manager", { p_business: business.id }) : Promise.resolve({ data: false }),
    user
      ? supabase
          .from("business_members")
          .select("user_id, role, status, profiles!business_members_user_id_fkey(username, display_name, avatar_path)")
          .eq("business_id", business.id)
      : Promise.resolve({ data: [] }),
    business.martial_art_ids.length > 0
      ? supabase.from("martial_arts").select("id, name").in("id", business.martial_art_ids).order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.rpc("business_catalog_limit", { p_business: business.id }),
    supabase.rpc("business_promotions_limit", { p_business: business.id }),
    loadBusinessPosts(supabase, business.id),
  ]);

  const memberRows = (members.data ?? []) as unknown as {
    user_id: string;
    role: "owner" | "admin";
    status: "pending" | "active";
    profiles: { username: string; display_name: string; avatar_path: string | null } | null;
  }[];

  return {
    business,
    items: (items.data ?? []) as CatalogItem[],
    promotions: (promotions.data ?? []) as BusinessPromotion[],
    isManager: Boolean(isManager.data),
    isOwner: memberRows.some((m) => m.user_id === user?.id && m.role === "owner" && m.status === "active"),
    members: memberRows.map((m) => ({
      userId: m.user_id,
      role: m.role,
      status: m.status,
      username: m.profiles?.username ?? "",
      displayName: m.profiles?.display_name ?? "",
      avatarPath: m.profiles?.avatar_path ?? null,
    })),
    martialArts: (arts.data ?? []) as { id: string; name: string }[],
    catalogLimit: catalogLimit.data ?? 30,
    promotionsLimit: promotionsLimit.data ?? 5,
    posts,
    viewerId: user?.id ?? null,
  };
});

export type BusinessData = NonNullable<Awaited<ReturnType<typeof loadBusiness>>>;
