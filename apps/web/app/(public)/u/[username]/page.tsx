import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock, MapPin } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { BeltDivider } from "@/components/ui/belt";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ username: string }> };

async function loadProfile(username: string) {
  const supabase = await createClient();
  // RLS decide o que é visível (perfis suspensos não aparecem para terceiros).
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, city, state, is_private, follower_count, following_count, post_count")
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
  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === profile.id;
  const location = [profile.city, profile.state].filter(Boolean).join(" · ");

  const stats = [
    { label: "publicações", value: profile.post_count },
    { label: "seguidores", value: profile.follower_count },
    { label: "seguindo", value: profile.following_count },
  ];

  return (
    <Card>
      <div className="flex items-start gap-4">
        <Avatar name={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold leading-tight">{profile.display_name}</h1>
          <p className="flex items-center gap-1.5 text-muted">
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
          <div key={label}>
            <dt className="sr-only">{label}</dt>
            <dd>
              <span className="font-semibold tabular-nums">{value}</span>{" "}
              <span className="text-muted">{label}</span>
            </dd>
          </div>
        ))}
      </dl>

      <BeltDivider className="mt-6" />

      {isOwner && (
        <div className="mt-6">
          <ButtonLink href={routes.profileEdit} variant="secondary">
            Editar perfil
          </ButtonLink>
        </div>
      )}
    </Card>
  );
}
