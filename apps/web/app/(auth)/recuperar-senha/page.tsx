import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <h1 className="font-display text-3xl font-bold">Recuperar senha</h1>
      <p className="mt-1 text-muted">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href={routes.signIn} className="font-semibold text-accent hover:underline">
          Voltar para o login
        </Link>
      </p>
    </Card>
  );
}
