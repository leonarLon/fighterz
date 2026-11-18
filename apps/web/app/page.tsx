import { CalendarDays, MapPin, TrendingUp } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { BeltDivider } from "@/components/ui/belt";
import { Logo } from "@/components/ui/logo";
import { FormMessage } from "@/components/ui/form-message";
import { routes } from "@/lib/routes";

const highlights = [
  { icon: MapPin, title: "Encontre onde treinar", text: "Academias, unidades e grade de aulas perto de você." },
  { icon: TrendingUp, title: "Mostre sua evolução", text: "Graduações, conquistas e treinos registrados num só lugar." },
  { icon: CalendarDays, title: "Fique por dentro", text: "Seminários, campeonatos e open mats da sua modalidade." },
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ conta?: string }> }) {
  const { conta } = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <ButtonLink href={routes.signIn} variant="ghost">
          Entrar
        </ButtonLink>
      </header>

      <main id="conteudo" className="flex flex-1 flex-col justify-center py-16">
        {conta === "excluida" && (
          <div className="mb-8 max-w-xl">
            <FormMessage status="success" message="Sua conta e seus dados foram excluídos." />
          </div>
        )}
        <h1 className="max-w-3xl font-display text-5xl font-bold uppercase leading-[0.95] sm:text-7xl">
          Seu tatame, <span className="text-accent">conectado.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          A rede social de artes marciais para alunos, professores e academias.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={routes.signUp} size="lg">
            Criar conta grátis
          </ButtonLink>
          <ButtonLink href={routes.signIn} size="lg" variant="secondary">
            Já tenho conta
          </ButtonLink>
        </div>
        <BeltDivider className="mt-16 max-w-md" />
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Icon aria-hidden className="size-6 text-accent" />
              <h2 className="mt-2 font-display text-xl font-semibold">{title}</h2>
              <p className="text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="flex flex-wrap gap-4 border-t border-border pt-6 text-[13px] text-muted">
        <span>© {new Date().getFullYear()} Fighterz</span>
        <a href={routes.terms} className="hover:text-text">
          Termos de Uso
        </a>
        <a href={routes.privacy} className="hover:text-text">
          Privacidade
        </a>
      </footer>
    </div>
  );
}
