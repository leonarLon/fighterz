import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Papel do usuário no painel. O banco nega de novo em cada função e política. */
export const getStaffAccess = cache(async () => {
  await requireUser();
  const supabase = await createClient();
  const [{ data: moderator }, { data: admin }, { data: superadmin }] = await Promise.all([
    supabase.rpc("has_role", { p_role: "moderator" }),
    supabase.rpc("has_role", { p_role: "admin" }),
    supabase.rpc("has_role", { p_role: "superadmin" }),
  ]);
  return { moderator: Boolean(moderator), admin: Boolean(admin), superadmin: Boolean(superadmin) };
});

export async function requireModerator() {
  const access = await getStaffAccess();
  if (!access.moderator) notFound();
  return access;
}

export async function requireAdmin() {
  const access = await getStaffAccess();
  if (!access.admin) notFound();
  return access;
}
