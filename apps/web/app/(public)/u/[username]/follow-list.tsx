import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { routes } from "@/lib/routes";
import { loadProfile } from "./load-profile";
import { FollowRows, type FollowPerson } from "./follow-rows";

export const FOLLOW_PAGE_SIZE = 50;

type Mode = "followers" | "following";

type Embedded = { id: string; username: string; display_name: string; avatar_path: string | null } | null;

function toPerson(p: Embedded): FollowPerson | null {
  return p ? { id: p.id, username: String(p.username), displayName: p.display_name, avatarPath: p.avatar_path } : null;
}

/** Lista de seguidores ou de quem a pessoa segue. O dono pode remover seguidores, deixar de seguir e responder pedidos. */
export async function FollowListPage({ username, mode, page }: { username: string; mode: Mode; page: number }) {
  const [profile, viewer] = await Promise.all([loadProfile(username), getViewer()]);
  if (!profile) notFound();
  const supabase = await createClient();
  const isOwner = viewer?.id === profile.id;

  // Mesma regra do perfil: perfil privado só mostra as listas para o dono e para quem segue (aceito).
  let canSee = isOwner || !profile.is_private;
  if (!canSee && viewer) {
    const { data } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", viewer.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    canSee = data?.status === "accepted";
  }

  const title = mode === "followers" ? "Seguidores" : "Seguindo";
  const back = (
    <Link href={routes.profile(profile.username)} className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-accent hover:underline">
      <ArrowLeft aria-hidden className="size-4" /> {profile.display_name}
    </Link>
  );

  if (!canSee) {
    return (
      <>
        {back}
        <h1 className="mb-4 font-display text-3xl font-bold">{title}</h1>
        <EmptyState icon={Lock} title="Este perfil é privado" description="Siga a pessoa para ver quem ela segue e quem a segue." />
      </>
    );
  }

  const from = page * FOLLOW_PAGE_SIZE;
  const to = from + FOLLOW_PAGE_SIZE - 1;
  const listQuery =
    mode === "followers"
      ? supabase
          .from("follows")
          .select("person:profiles!follows_follower_id_fkey(id, username, display_name, avatar_path)")
          .eq("following_id", profile.id)
          .eq("status", "accepted")
          .order("created_at", { ascending: false })
          .range(from, to)
      : supabase
          .from("follows")
          .select("person:profiles!follows_following_id_fkey(id, username, display_name, avatar_path)")
          .eq("follower_id", profile.id)
          .eq("status", "accepted")
          .order("created_at", { ascending: false })
          .range(from, to);

  // Pedidos pendentes: só o dono vê, na lista de seguidores (seguidores) ou na de seguindo (pedidos que ele enviou).
  const pendingQuery =
    isOwner && page === 0
      ? mode === "followers"
        ? supabase
            .from("follows")
            .select("person:profiles!follows_follower_id_fkey(id, username, display_name, avatar_path)")
            .eq("following_id", profile.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(100)
        : supabase
            .from("follows")
            .select("person:profiles!follows_following_id_fkey(id, username, display_name, avatar_path)")
            .eq("follower_id", profile.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(100)
      : null;

  const [{ data: rows }, pendingResult] = await Promise.all([listQuery, pendingQuery ?? Promise.resolve({ data: [] })]);
  // Perfis bloqueados ou suspensos voltam nulos pela RLS de profiles: ficam fora da lista.
  const people = (rows ?? []).map((r) => toPerson(r.person as Embedded)).filter((p): p is FollowPerson => p !== null);
  const pending = (pendingResult.data ?? []).map((r) => toPerson(r.person as Embedded)).filter((p): p is FollowPerson => p !== null);
  const hasNext = (rows ?? []).length === FOLLOW_PAGE_SIZE;
  const base = mode === "followers" ? routes.followers(profile.username) : routes.following(profile.username);
  const count = mode === "followers" ? profile.follower_count : profile.following_count;

  return (
    <>
      {back}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <nav aria-label="Listas" className="flex gap-1 rounded-md border border-border p-1 text-sm font-semibold">
          {(["followers", "following"] as const).map((m) => (
            <Link
              key={m}
              href={m === "followers" ? routes.followers(profile.username) : routes.following(profile.username)}
              aria-current={m === mode ? "page" : undefined}
              className="flex min-h-9 items-center rounded px-3 hover:bg-bg aria-[current=page]:bg-primary aria-[current=page]:text-on-primary"
            >
              {m === "followers" ? "Seguidores" : "Seguindo"}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mb-4 text-muted">
        {count} {mode === "followers" ? (count === 1 ? "pessoa segue" : "pessoas seguem") : count === 1 ? "pessoa seguida" : "pessoas seguidas"}
        {mode === "followers" && isOwner ? " você" : ""}
      </p>

      {pending.length > 0 && (
        <section aria-labelledby="pendentes" className="mb-6">
          <h2 id="pendentes" className="mb-2 font-display text-xl font-semibold">
            {mode === "followers" ? "Pedidos para seguir você" : "Pedidos enviados, aguardando aceite"}
          </h2>
          <FollowRows people={pending} mode={mode === "followers" ? "request" : "sent"} />
        </section>
      )}

      {people.length === 0 ? (
        <EmptyState
          icon={Users}
          title={mode === "followers" ? "Nenhum seguidor ainda" : "Ainda não segue ninguém"}
          description={
            mode === "followers"
              ? "Quando alguém seguir este perfil, aparece aqui."
              : isOwner
                ? "Encontre atletas, professores e academias no Explorar."
                : "Quando este perfil seguir alguém, aparece aqui."
          }
        />
      ) : (
        <FollowRows people={people} mode={isOwner ? (mode === "followers" ? "follower" : "following") : "view"} />
      )}

      {(page > 0 || hasNext) && (
        <Card className="mt-4 flex justify-between p-3 sm:p-3">
          {page > 0 ? (
            <Link href={page === 1 ? base : `${base}?pagina=${page}`} className="min-h-11 content-center font-semibold text-accent hover:underline">
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link href={`${base}?pagina=${page + 2}`} className="min-h-11 content-center font-semibold text-accent hover:underline">
              Próximos
            </Link>
          )}
        </Card>
      )}
    </>
  );
}
