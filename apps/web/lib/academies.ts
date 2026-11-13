import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { ScheduleItem } from "@/components/academy/schedule-grid";

export type Unit = {
  id: string;
  name: string;
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  reference_point: string | null;
  latitude: number | null;
  longitude: number | null;
  coords_source: "manual" | "nominatim" | null;
  is_active: boolean;
};

export type ClassRow = ScheduleItem & {
  unit_id: string;
  martial_art_id: string;
  teacher_id: string | null;
  notes: string | null;
};

const UNIT_COLUMNS =
  "id, name, postal_code, street, number, complement, neighborhood, city, state, reference_point, latitude, longitude, coords_source, is_active";

/** Tudo que a página da academia precisa, já filtrado pela RLS (visitante, membro ou gestão). */
export const loadAcademy = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: academy } = await supabase
    .from("academies")
    .select("id, slug, name, description, website, instagram, contact_email, contact_phone, status, is_verified, follower_count")
    .eq("slug", slug)
    .maybeSingle();
  if (!academy) return null;

  const user = await getCurrentUser();
  const [arts, units, classes, staff, isManager, mine, following] = await Promise.all([
    supabase.from("academy_martial_arts").select("martial_art_id, martial_arts(name, slug, sort_order)").eq("academy_id", academy.id),
    supabase.from("academy_units").select(UNIT_COLUMNS).eq("academy_id", academy.id).order("name"),
    supabase
      .from("class_cards")
      .select("id, name, weekday, starts_at, ends_at, level, status, accepts_trial, martial_art_name, teacher_username, teacher_display_name, unit_id, unit_name, martial_art_id, teacher_id, notes")
      .eq("academy_id", academy.id)
      .order("weekday")
      .order("starts_at"),
    supabase
      .from("academy_memberships")
      .select("user_id, role, status, requested_by, created_at, profiles!academy_memberships_user_id_fkey(username, display_name, avatar_path)")
      .eq("academy_id", academy.id),
    user ? supabase.rpc("is_academy_manager", { p_academy: academy.id }) : Promise.resolve({ data: false }),
    user
      ? supabase.from("academy_memberships").select("role, status, requested_by").eq("academy_id", academy.id).eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("academy_followers").select("user_id").eq("academy_id", academy.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    academy,
    martialArts: (arts.data ?? [])
      .map((a) => ({ id: a.martial_art_id, ...(a.martial_arts as unknown as { name: string; slug: string; sort_order: number }) }))
      .sort((a, b) => a.sort_order - b.sort_order),
    units: (units.data ?? []) as Unit[],
    classes: (classes.data ?? []) as unknown as ClassRow[],
    members: (staff.data ?? []).map((m) => ({
      userId: m.user_id,
      role: m.role,
      status: m.status,
      requestedBy: m.requested_by,
      createdAt: m.created_at,
      username: (m.profiles as unknown as { username: string } | null)?.username ?? "",
      displayName: (m.profiles as unknown as { display_name: string } | null)?.display_name ?? "",
      avatarPath: (m.profiles as unknown as { avatar_path: string | null } | null)?.avatar_path ?? null,
    })),
    isManager: Boolean(isManager.data),
    myMemberships: (mine.data ?? []) as { role: string; status: string; requested_by: string }[],
    following: Boolean(following.data),
    viewerId: user?.id ?? null,
  };
});

export type AcademyData = NonNullable<Awaited<ReturnType<typeof loadAcademy>>>;
