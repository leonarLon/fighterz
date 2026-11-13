import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <Card>
      <h1 className="font-display text-3xl font-bold">Criar conta</h1>
      <p className="mt-1 text-muted">Para maiores de 18 anos.</p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href={routes.signIn} className="font-semibold text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
