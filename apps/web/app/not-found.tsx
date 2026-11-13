import { ButtonLink } from "@/components/ui/button";
import { BeltDivider } from "@/components/ui/belt";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="font-display text-7xl font-bold text-accent">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-1 text-muted">O endereço pode estar errado ou o conteúdo foi removido.</p>
      <BeltDivider className="my-6 max-w-40" />
      <ButtonLink href="/">Ir para o início</ButtonLink>
    </main>
  );
}
