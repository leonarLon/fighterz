import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { parseThemePreference } from "@figtherz/core";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { PageHeader } from "@/components/ui/page-header";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { DeleteAccountForm } from "./delete-account-form";
import { JourneyPrivacyForm } from "./journey-privacy-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const user = await requireUser();
  const { senha } = await searchParams;
  const supabase = await createClient();
  const [{ data: settings }, { data: isAdmin }] = await Promise.all([
    supabase.from("user_settings").select("theme, show_ranks, show_achievements, show_checkins").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("has_role", { p_role: "admin" }),
  ]);

  return (
    <>
      <PageHeader title="Configurações" />
      {senha === "alterada" && (
        <div className="mb-4">
          <FormMessage status="success" message="Senha alterada com sucesso." />
        </div>
      )}
      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 font-display text-2xl font-semibold">Aparência</h2>
          <ThemeSwitcher initial={parseThemePreference(settings?.theme)} />
          <p className="mt-2 text-[13px] text-muted">Automático segue a configuração do seu dispositivo.</p>
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-2xl font-semibold">Privacidade da jornada</h2>
          <p className="mb-4 text-sm text-muted">Quem vê cada parte da sua jornada no seu perfil.</p>
          <JourneyPrivacyForm
            initial={{
              showRanks: settings?.show_ranks ?? "public",
              showAchievements: settings?.show_achievements ?? "public",
              showCheckins: settings?.show_checkins ?? "followers",
            }}
          />
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-2xl font-semibold">Conta</h2>
          <p className="mb-4 text-sm text-muted">{user.email}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={routes.resetPassword}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 font-semibold hover:bg-bg"
            >
              <KeyRound aria-hidden className="size-4" />
              Alterar senha
            </Link>
            {isAdmin && (
              <Link
                href={routes.adminTeachers}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 font-semibold hover:bg-bg"
              >
                <ShieldCheck aria-hidden className="size-4" />
                Aprovar professores
              </Link>
            )}
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                <LogOut aria-hidden className="size-4" />
                Sair
              </Button>
            </form>
          </div>
        </Card>

        <Card className="border-danger/40">
          <h2 className="mb-1 font-display text-2xl font-semibold">Excluir conta</h2>
          <p className="mb-4 text-sm text-muted">
            Apaga definitivamente seu perfil, configurações e tudo o que você publicou. Não dá para desfazer.
          </p>
          <DeleteAccountForm />
        </Card>
      </div>
    </>
  );
}
