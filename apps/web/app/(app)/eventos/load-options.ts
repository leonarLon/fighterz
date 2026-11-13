import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Quem o usuário pode indicar como organizador: ele mesmo (professor aprovado) e as academias que gerencia. */
export async function loadEventOptions(userId: string) {
  const supabase = await createClient();
  const [{ data: teacher }, { data: managed }, { data: arts }] = await Promise.all([
    supabase.rpc("is_approved_teacher", { p_user: userId }),
    supabase
      .from("academy_memberships")
      .select("academy_id, academies(name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]),
    supabase.from("martial_arts").select("id, name").order("sort_order"),
  ]);
  const academies = (managed ?? []).map((m) => ({
    id: m.academy_id,
    name: (m.academies as unknown as { name: string } | null)?.name ?? "",
  }));
  const { data: units } = academies.length
    ? await supabase.from("academy_units").select("id, academy_id, name").in("academy_id", academies.map((a) => a.id)).eq("is_active", true)
    : { data: [] };

  const organizers = [
    ...(teacher ? [{ value: "personal", label: "Eu, como professor" }] : []),
    ...academies.map((a) => ({ value: a.id, label: a.name })),
  ];
  return {
    organizers,
    units: (units ?? []).map((u) => ({ id: u.id, academyId: u.academy_id, name: u.name })),
    arts: (arts ?? []).map((a) => ({ id: a.id, name: a.name })),
  };
}
