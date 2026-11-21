import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "Publicar" };

export default async function PublishPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: arts }, { data: pages }] = await Promise.all([
    supabase.from("martial_arts").select("id, name").order("sort_order"),
    supabase
      .from("business_members")
      .select("businesses(id, name, status)")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);
  const myPages = (pages ?? [])
    .map((p) => p.businesses as unknown as { id: string; name: string; status: string } | null)
    .filter((b): b is { id: string; name: string; status: string } => Boolean(b && b.status === "active"));
  return (
    <>
      <PageHeader title="Publicar" description="Compartilhe um treino, uma conquista ou um momento no tatame." />
      <Card>
        <Composer userId={user.id} martialArts={arts ?? []} pages={myPages} />
      </Card>
    </>
  );
}
