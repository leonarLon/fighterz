import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { NewBusinessForm } from "./new-business-form";

export const metadata: Metadata = { title: "Criar página comercial" };

export default function NewBusinessPage() {
  return (
    <>
      <PageHeader
        title="Criar página comercial"
        description="Para marcas, lojas e serviços. A divulgação fica aqui, separada do seu perfil pessoal. Você será o dono e pode convidar administradores."
      />
      <Card>
        <NewBusinessForm />
      </Card>
    </>
  );
}
