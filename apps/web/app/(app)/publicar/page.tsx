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
  const { data: arts } = await supabase.from("martial_arts").select("id, name").order("sort_order");
  return (
    <>
      <PageHeader title="Publicar" description="Compartilhe um treino, uma conquista ou um momento no tatame." />
      <Card>
        <Composer userId={user.id} martialArts={arts ?? []} />
      </Card>
    </>
  );
}
