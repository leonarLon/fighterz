import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { routes, safeNextPath } from "@/lib/routes";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  return (
    <Card>
      <h1 className="font-display text-3xl font-bold">Entrar</h1>
      <p className="mt-1 text-muted">Que bom ver você de volta.</p>
      {erro === "link-invalido" && (
        <div className="mt-4">
          <FormMessage status="error" message="Esse link é inválido ou expirou. Peça um novo." />
        </div>
      )}
      <SignInForm next={safeNextPath(next)} />
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href={routes.signUp} className="font-semibold text-accent hover:underline">
          Criar conta
        </Link>
      </p>
    </Card>
  );
}
