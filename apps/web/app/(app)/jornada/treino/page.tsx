import type { Metadata } from "next";
import { isoToLocalDateTime, WEEKDAY_SHORT } from "@figtherz/core";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CheckinForm } from "./checkin-form";

export const metadata: Metadata = { title: "Registrar treino" };

export default async function NewCheckinPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: arts }, { data: journey }, { data: memberships }] = await Promise.all([
    supabase.from("martial_arts").select("id, name").order("sort_order"),
    supabase.from("user_martial_arts").select("martial_art_id").eq("user_id", user.id),
    supabase.from("academy_memberships").select("academy_id, academies(name)").eq("user_id", user.id).eq("status", "active"),
  ]);
  const academyIds = (memberships ?? []).map((m) => m.academy_id);
  const { data: classes } = academyIds.length
    ? await supabase
        .from("class_cards")
        .select("id, academy_id, name, weekday, starts_at, martial_art_id, martial_art_name")
        .in("academy_id", academyIds)
        .eq("status", "active")
        .order("weekday")
        .order("starts_at")
    : { data: [] };

  // Modalidades da jornada primeiro.
  const mine = new Set((journey ?? []).map((j) => j.martial_art_id));
  const sortedArts = [...(arts ?? [])].sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)));

  return (
    <>
      <PageHeader title="Registrar treino" description="Fica na sua jornada. No feed aparece como “registrou um treino”, só se você quiser." />
      <Card>
        <CheckinForm
          arts={sortedArts.map((a) => ({ id: a.id, name: a.name }))}
          defaultArt={sortedArts.find((a) => mine.has(a.id))?.id ?? ""}
          academies={(memberships ?? []).map((m) => ({
            id: m.academy_id,
            name: (m.academies as unknown as { name: string } | null)?.name ?? "",
          }))}
          classes={(classes ?? []).map((c) => ({
            id: c.id!,
            academyId: c.academy_id!,
            label: `${c.name} · ${WEEKDAY_SHORT[c.weekday!]} ${c.starts_at!.slice(0, 5)} · ${c.martial_art_name}`,
          }))}
          now={isoToLocalDateTime(new Date().toISOString())}
        />
      </Card>
    </>
  );
}
