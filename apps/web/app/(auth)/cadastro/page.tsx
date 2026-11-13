import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  const supabase = await createClient();
  const { data: platform } = await supabase.from("platform_settings").select("signups_open").maybeSingle();
  const open = platform?.signups_open ?? true;
  return (
    <Card>
      <h1 className="font-display text-3xl font-bold">Criar conta</h1>
      <p className="mt-1 text-muted">Para maiores de 18 anos.</p>
      {open ? (
        <SignUpForm />
      ) : (
        <div className="mt-6">
          <FormMessage status="error" message="Novos cadastros estão temporariamente fechados. Tente mais tarde." />
        </div>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href={routes.signIn} className="font-semibold text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
