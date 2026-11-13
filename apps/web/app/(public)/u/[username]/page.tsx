import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock, MapPin, Newspaper } from "lucide-react";
import { compactCount } from "@figtherz/core";
import { loadMoreProfilePosts } from "@/app/actions/posts";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { BeltDivider } from "@/components/ui/belt";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PostList } from "@/components/post/post-list";
import { createClient } from "@/lib/supabase/server";
import { loadProfilePosts } from "@/lib/posts";
import { getViewer } from "@/lib/viewer";
import { routes } from "@/lib/routes";
import { JourneyCard } from "./journey-card";
import { ProfileActions } from "./profile-actions";

type Props = { params: Promise<{ username: string }> };

async function loadProfile(username: string) {
  const supabase = await createClient();
  // RLS decide o que é visível (suspensos e quem me bloqueou não aparecem).
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_path, bio, city, state, is_private, follower_count, following_count, post_count")
    .eq("username", decodeURIComponent(username).toLowerCase())
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await loadProfile((await params).username);
  return { title: profile ? `${profile.display_name} (@${profile.username})` : "Perfil não encontrado" };
}

export default async function PublicProfilePage({ params }: Props) {
  const profile = await loadProfile((await params).username);
  if (!profile) notFound();
  const supabase = await createClient();
  const viewer = await getViewer();
  const isOwner = viewer?.id === profile.id;

  let followState: "none" | "pending" | "accepted" = "none";
  let blockedByMe = false;
  if (viewer && !isOwner) {
    const [{ data: f }, { data: b }] = await Promise.all([
      supabase.from("follows").select("status").eq("follower_id", viewer.id).eq("following_id", profile.id).maybeSingle(),
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", viewer.id).eq("blocked_id", profile.id).maybeSingle(),
    ]);
    followState = f?.status ?? "none";
    blockedByMe = Boolean(b);
  }

  const canSeeContent = isOwner || (!blockedByMe && (!profile.is_private || followState === "accepted"));
  const page = canSeeContent ? await loadProfilePosts(supabase, profile.id) : null;
  const location = [profile.city, profile.state].filter(Boolean).join(" · ");
  const stats = [
    { label: "publicações", value: profile.post_count },
    { label: "seguidores", value: profile.follower_count },
    { label: "seguindo", value: profile.following_count },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={profile.display_name} path={profile.avatar_path} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold leading-tight">{profile.display_name}</h1>
            <p className="flex flex-wrap items-center gap-x-1.5 text-muted">
              @{profile.username}
              {profile.is_private && (
                <span className="inline-flex items-center gap-1 text-[13px]">
                  <Lock aria-hidden className="size-3.5" /> Perfil privado
                </span>
              )}
            </p>
            {location && (
              <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
                <MapPin aria-hidden className="size-3.5" /> {location}
              </p>
            )}
          </div>
        </div>

        {profile.bio && <p className="mt-4 whitespace-pre-line">{profile.bio}</p>}

        <dl className="mt-5 flex gap-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex gap-1">
              <dt className="order-2 text-muted">{label}</dt>
              <dd className="font-semibold tabular-nums">{compactCount(value)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5">
          {isOwner ? (
            <ButtonLink href={routes.profileEdit} variant="secondary">
              Editar perfil
            </ButtonLink>
          ) : viewer ? (
            <ProfileActions
              profileId={profile.id}
              displayName={profile.display_name}
              initialFollow={followState}
              blockedByMe={blockedByMe}
            />
          ) : (
            <ButtonLink href={`${routes.signIn}?next=${encodeURIComponent(routes.profile(profile.username))}`}>
              Entrar para seguir
            </ButtonLink>
          )}
        </div>
        <BeltDivider className="mt-6" />
      </Card>

      {canSeeContent && <JourneyCard supabase={supabase} userId={profile.id} />}

      {page ? (
        <PostList
          initial={page}
          viewer={viewer}
          loadMore={loadMoreProfilePosts.bind(null, profile.id)}
          empty={<EmptyState icon={Newspaper} title="Nenhuma publicação" description="Ainda não há posts por aqui." />}
        />
      ) : (
        !blockedByMe && (
          <EmptyState
            icon={Lock}
            title="Este perfil é privado"
            description={
              followState === "pending"
                ? "Sua solicitação foi enviada. Quando for aceita, você verá as publicações."
                : "Siga para ver as publicações, se a pessoa aceitar."
            }
          />
        )
      )}
    </div>
  );
}
