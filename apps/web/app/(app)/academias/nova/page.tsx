import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { NewAcademyForm } from "./new-academy-form";

export const metadata: Metadata = { title: "Cadastrar academia" };

export default async function NewAcademyPage() {
  const supabase = await createClient();
  const { data: arts } = await supabase.from("martial_arts").select("id, name").order("sort_order");
  return (
    <>
      <PageHeader
        title="Cadastrar academia"
        description="Você será o responsável. Depois, adicione unidades, grade de aulas e convide professores."
      />
      <Card>
        <NewAcademyForm arts={arts ?? []} />
      </Card>
    </>
  );
}
