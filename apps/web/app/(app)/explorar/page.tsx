import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Lock, Search, UserRoundSearch } from "lucide-react";
import { loadMoreExplore } from "@/app/actions/posts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PostList } from "@/components/post/post-list";
import { createClient } from "@/lib/supabase/server";
import { loadExplore } from "@/lib/posts";
import { getViewer } from "@/lib/viewer";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Explorar" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const supabase = await createClient();
  const viewer = await getViewer();

  const people = q.length >= 2 ? ((await supabase.rpc("search_profiles", { p_query: q, p_limit: 20 })).data ?? []) : null;
  const popular = people ? null : await loadExplore(supabase);

  return (
    <>
      <PageHeader title="Explorar" description="Encontre pessoas e veja o que está em alta na comunidade." />
      <form role="search" action={routes.explore} className="mb-6 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar pessoas
        </label>
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            minLength={2}
            maxLength={60}
            placeholder="Nome ou @usuário"
            className="block min-h-11 w-full rounded-md border border-border bg-surface pl-9 pr-3"
          />
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      {people && (
        <section aria-labelledby="pessoas">
          <h2 id="pessoas" className="mb-3 font-display text-2xl font-semibold">
            Pessoas
          </h2>
          {people.length === 0 ? (
            <EmptyState icon={UserRoundSearch} title="Ninguém encontrado" description={`Nenhum perfil para "${q}".`} />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {people.map((person) => (
                <li key={person.id}>
                  <Link href={routes.profile(person.username)} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
                    <Avatar name={person.display_name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-semibold">
                        {person.display_name}
                        {person.is_private && <Lock aria-label="Perfil privado" className="size-3.5 text-muted" />}
                      </span>
                      <span className="block truncate text-[13px] text-muted">
                        @{person.username}
                        {person.city ? ` · ${person.city}${person.state ? `/${person.state}` : ""}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {popular && (
        <section aria-labelledby="em-alta">
          <h2 id="em-alta" className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
            <Flame aria-hidden className="size-5 text-accent" /> Em alta nesta semana
          </h2>
          <PostList
            initial={popular}
            viewer={viewer}
            loadMore={loadMoreExplore}
            empty={<EmptyState icon={Flame} title="Nada em alta ainda" description="Os posts públicos mais curtidos da semana aparecem aqui." />}
          />
        </section>
      )}
    </>
  );
}
