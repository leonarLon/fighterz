import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { AppShell } from "@/components/nav/app-shell";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";

// Páginas abertas a visitantes (perfil, post, termos). Quem está logado vê a navegação do app.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile) return <AppShell profile={profile}>{children}</AppShell>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo href={routes.home} />
          <div className="flex gap-2">
            <ButtonLink href={routes.signIn} variant="ghost">
              Entrar
            </ButtonLink>
            <ButtonLink href={routes.signUp}>Criar conta</ButtonLink>
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-160 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
