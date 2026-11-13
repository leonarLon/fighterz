import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "../access";
import { CleanupButton } from "./cleanup-button";
import { PlatformSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configurações da plataforma" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data }, { data: queued }] = await Promise.all([
    supabase.from("platform_settings").select("signups_open, announcement").maybeSingle(),
    supabase.rpc("get_cleanup_queue_count"),
  ]);
  return (
    <>
      <PageHeader title="Configurações da plataforma" description="Valem para todos os usuários. Cada mudança fica na auditoria." />
      <Card>
        <PlatformSettingsForm signupsOpen={data?.signups_open ?? true} announcement={data?.announcement ?? ""} />
      </Card>
      <Card className="mt-4">
        <h2 className="mb-1 font-display text-xl font-semibold">Limpeza de arquivos</h2>
        <p className="mb-3 text-sm text-muted">
          Todo dia às 3h (UTC) o banco remove posts e comentários apagados há mais de 30 dias e separa uploads abandonados.
          Os arquivos são apagados do Storage aqui.
        </p>
        <CleanupButton queued={queued ?? 0} />
      </Card>
    </>
  );
}
