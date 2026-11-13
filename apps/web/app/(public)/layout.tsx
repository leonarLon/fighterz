import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getCurrentUser } from "@/lib/auth";
import { routes } from "@/lib/routes";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo href={user ? routes.feed : routes.home} />
          {user ? (
            <ButtonLink href={routes.feed} variant="ghost">
              Voltar ao app
            </ButtonLink>
          ) : (
            <div className="flex gap-2">
              <ButtonLink href={routes.signIn} variant="ghost">
                Entrar
              </ButtonLink>
              <ButtonLink href={routes.signUp}>Criar conta</ButtonLink>
            </div>
          )}
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
