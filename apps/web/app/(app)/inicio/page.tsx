import type { Metadata } from "next";
import { Flame, SquarePen, Users } from "lucide-react";
import { loadMoreExplore, loadMoreHomeFeed } from "@/app/actions/posts";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PostList } from "@/components/post/post-list";
import { createClient } from "@/lib/supabase/server";
import { loadExplore, loadHomeFeed } from "@/lib/posts";
import { getViewer } from "@/lib/viewer";
import { routes } from "@/lib/routes";
import { FollowSuggestions, type Suggestion } from "./suggestions";

export const metadata: Metadata = { title: "Início" };

type Client = Awaited<ReturnType<typeof createClient>>;

const SUGGESTION_LIMIT = 8;

/** Professores aprovados primeiro, depois perfis públicos; sem quem a pessoa já segue (ou pediu para seguir). */
async function loadSuggestions(supabase: Client, viewerId: string): Promise<Suggestion[]> {
  const [{ data: following }, { data: teachers }, { data: profiles }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", viewerId),
    supabase.from("teacher_cards").select("user_id, username, display_name, avatar_path, martial_arts").limit(20),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_path, city, state")
      .eq("is_private", false)
      .neq("id", viewerId)
      .order("created_at", { ascending: true })
      .limit(40),
  ]);
  const skip = new Set([viewerId, ...(following ?? []).map((f) => f.following_id)]);
  const out: Suggestion[] = [];
  const add = (s: Suggestion) => {
    if (out.length < SUGGESTION_LIMIT && !skip.has(s.id)) {
      skip.add(s.id);
      out.push(s);
    }
  };
  for (const t of teachers ?? []) {
    if (!t.user_id || !t.username || !t.display_name) continue;
    const arts = Array.isArray(t.martial_arts) ? (t.martial_arts as { martial_art?: string }[]) : [];
    const art = arts[0]?.martial_art;
    add({ id: t.user_id, username: t.username, displayName: t.display_name, avatarPath: t.avatar_path, detail: art ? `Professor de ${art}` : "Professor" });
  }
  for (const p of profiles ?? []) {
    add({
      id: p.id,
      username: String(p.username),
      displayName: p.display_name,
      avatarPath: p.avatar_path,
      detail: p.city ? `${p.city}${p.state ? `/${p.state}` : ""}` : null,
    });
  }
  return out;
}

export default async function FeedPage() {
  const supabase = await createClient();
  const [viewer, page] = await Promise.all([getViewer(), loadHomeFeed(supabase)]);
  const isEmpty = page.items.length === 0 && !page.nextCursor;
  const [suggestions, popular] = isEmpty && viewer ? await Promise.all([loadSuggestions(supabase, viewer.id), loadExplore(supabase)]) : [[], null];

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Início" description="Publicações de quem você segue, das mais recentes para as mais antigas." />
        <ButtonLink href={routes.publish} className="hidden shrink-0 sm:inline-flex">
          <SquarePen aria-hidden className="size-4" /> Publicar
        </ButtonLink>
      </div>

      {!isEmpty ? (
        <PostList initial={page} viewer={viewer} loadMore={loadMoreHomeFeed} empty={null} />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="quem-seguir">
            <h2 id="quem-seguir" className="mb-1 flex items-center gap-2 font-display text-2xl font-semibold">
              <Users aria-hidden className="size-5 text-accent" /> Comece seguindo pessoas
            </h2>
            <p className="mb-3 text-muted">Seu feed mostra quem você segue. Algumas sugestões para começar:</p>
            {suggestions.length > 0 ? (
              <FollowSuggestions people={suggestions} />
            ) : (
              <EmptyState icon={Users} title="Sem sugestões agora" description="Use a busca do Explorar para encontrar pessoas." action={<ButtonLink href={routes.explore}>Explorar</ButtonLink>} />
            )}
          </section>

          {popular && popular.items.length > 0 && (
            <section aria-labelledby="em-alta-inicio">
              <h2 id="em-alta-inicio" className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
                <Flame aria-hidden className="size-5 text-accent" /> Em alta na comunidade
              </h2>
              <PostList initial={popular} viewer={viewer} loadMore={loadMoreExplore} empty={null} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
