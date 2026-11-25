import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CalendarDays, CalendarSearch, Flame, Lock, Medal, Search, Store, UserRoundSearch } from "lucide-react";
import { loadMoreExplore } from "@/app/actions/posts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PostList } from "@/components/post/post-list";
import { createClient } from "@/lib/supabase/server";
import { loadExplore } from "@/lib/posts";
import { getViewer } from "@/lib/viewer";
import { getCurrentProfile } from "@/lib/auth";
import { slotFromAcademyClass, slotFromTeacherClass } from "@/lib/teacher-schedule";
import { UpcomingClasses, type UpcomingItem } from "@/components/teacher/upcoming-classes";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Explorar" };

/**
 * Próximas aulas para o Explorar: grade própria dos professores + grade das academias.
 * Prioriza a cidade do perfil; sem aulas lá (ou sem cidade), cai para o estado e depois para todas.
 */
async function loadUpcoming(supabase: Awaited<ReturnType<typeof createClient>>) {
  const me = await getCurrentProfile();
  const scopes: { city: string | null; state: string | null }[] = [
    ...(me?.city && me.state ? [{ city: me.city, state: me.state }] : []),
    ...(me?.state ? [{ city: null, state: me.state }] : []),
    { city: null, state: null },
  ];
  for (const scope of scopes) {
    let own = supabase.from("teacher_class_cards").select("*").limit(300);
    let academy = supabase.from("class_cards").select("*").eq("status", "active").limit(300);
    if (scope.state) {
      own = own.eq("state", scope.state);
      academy = academy.eq("state", scope.state);
    }
    if (scope.city) {
      own = own.ilike("city", scope.city);
      academy = academy.ilike("city", scope.city);
    }
    const [{ data: o }, { data: a }] = await Promise.all([own, academy]);
    const items: UpcomingItem[] = [
      ...(o ?? []).map((c) => ({ ...slotFromTeacherClass(c), teacherName: c.teacher_name, teacherUsername: c.teacher_username })),
      ...(a ?? []).map((c) => ({ ...slotFromAcademyClass(c), teacherName: c.teacher_display_name, teacherUsername: c.teacher_username })),
    ];
    if (items.length > 0 || !scope.state) return { items, city: scope.city };
  }
  return { items: [], city: null };
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const supabase = await createClient();
  const viewer = await getViewer();

  const people = q.length >= 2 ? ((await supabase.rpc("search_profiles", { p_query: q, p_limit: 20 })).data ?? []) : null;
  const popular = people ? null : await loadExplore(supabase);
  const upcoming = people ? null : await loadUpcoming(supabase);

  return (
    <>
      <PageHeader title="Explorar" description="Encontre pessoas e veja o que está em alta na comunidade." />
      <nav aria-label="Descobrir" className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {[
          { href: routes.journey, label: "Minha jornada", icon: Medal },
          { href: routes.events, label: "Eventos", icon: CalendarDays },
          { href: routes.classes, label: "Aulas", icon: CalendarSearch },
          { href: routes.academies, label: "Academias", icon: Building2 },
          { href: routes.businesses, label: "Lojas e serviços", icon: Store },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface text-sm font-semibold hover:bg-bg">
            <Icon aria-hidden className="size-5 text-accent" />
            {label}
          </Link>
        ))}
      </nav>

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

      {upcoming && <UpcomingClasses items={upcoming.items} city={upcoming.city} />}

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
                    <Avatar name={person.display_name} path={person.avatar_path} size="sm" />
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
