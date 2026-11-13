import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Nova senha" };

// Chega-se aqui pelo link de recuperação (/auth/confirm cria a sessão) ou logado, pelas configurações.
export default async function ResetPasswordPage() {
  await requireUser();
  return (
    <Card>
      <h1 className="font-display text-3xl font-bold">Criar nova senha</h1>
      <p className="mt-1 text-muted">Escolha uma senha que você não usa em outros sites.</p>
      <ResetPasswordForm />
    </Card>
  );
}
