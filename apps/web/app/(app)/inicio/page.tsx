import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Início" };

export default async function FeedPage() {
  const profile = await getCurrentProfile();
  const firstName = profile?.display_name.split(" ")[0] ?? "";
  return (
    <>
      <PageHeader title={`Olá, ${firstName}`} description="Seu feed com as publicações de quem você segue." />
      <EmptyState
        icon={Newspaper}
        title="Seu feed ainda está vazio"
        description="Publicações, curtidas e comentários chegam em breve. Enquanto isso, complete seu perfil."
        action={
          <ButtonLink href={routes.profileEdit} variant="secondary">
            Editar perfil
          </ButtonLink>
        }
      />
    </>
  );
}
