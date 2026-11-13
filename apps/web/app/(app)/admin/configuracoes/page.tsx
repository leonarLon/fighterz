import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "../access";
import { PlatformSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configurações da plataforma" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("signups_open, announcement").maybeSingle();
  return (
    <>
      <PageHeader title="Configurações da plataforma" description="Valem para todos os usuários. Cada mudança fica na auditoria." />
      <Card>
        <PlatformSettingsForm signupsOpen={data?.signups_open ?? true} announcement={data?.announcement ?? ""} />
      </Card>
    </>
  );
}
