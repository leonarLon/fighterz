import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Dumbbell, GraduationCap, Lock, MapPin, Medal, Newspaper, Pencil, SquarePen, Trophy } from "lucide-react";
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
import type { Viewer } from "@/lib/post-types";
import { getViewer } from "@/lib/viewer";
import { routes } from "@/lib/routes";
import { NextClassCard, type WeeklySlot } from "@/components/teacher/next-class";
import { slotFromAcademyClass, slotFromTeacherClass } from "@/lib/teacher-schedule";
import { JourneyCard } from "./journey-card";
import { loadProfile } from "./load-profile";
import { ProfileActions } from "./profile-actions";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await loadProfile((await params).username);
  return { title: profile ? `${profile.display_name} (@${profile.username})` : "Perfil não encontrado" };
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const [profile, viewer] = await Promise.all([loadProfile(username), getViewer()]);
  if (!profile) notFound();
  const supabase = await createClient();
  const isOwner = viewer?.id === profile.id;

  // Professor aprovado mostra o total de alunos (público, como os seguidores).
  const { data: teacherCard } = await supabase.from("teacher_cards").select("student_count").eq("user_id", profile.id).maybeSingle();
  // Professor: próxima aula (grade própria + academias com vínculo ativo).
  let teacherSlots: WeeklySlot[] = [];
  if (teacherCard) {
    const [{ data: own }, { data: academyClasses }] = await Promise.all([
      supabase.from("teacher_class_cards").select("*").eq("teacher_id", profile.id),
      supabase.rpc("get_teacher_schedule", { p_teacher: profile.id }),
    ]);
    teacherSlots = [...(own ?? []).map(slotFromTeacherClass), ...(academyClasses ?? []).map(slotFromAcademyClass)];
  }

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
  const location = [profile.city, profile.state].filter(Boolean).join(" · ");
  const stats = [
    { label: plural(profile.post_count, "publicação", "publicações"), value: profile.post_count, href: null },
    { label: plural(profile.follower_count, "seguidor", "seguidores"), value: profile.follower_count, href: routes.followers(profile.username) },
    { label: "seguindo", value: profile.following_count, href: routes.following(profile.username) },
  ];
  const teacherStat = teacherCard
    ? { label: plural(teacherCard.student_count ?? 0, "aluno", "alunos"), value: teacherCard.student_count ?? 0, href: routes.teacher(profile.username) }
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <Avatar name={profile.display_name} path={profile.avatar_path} size="lg" />
            {isOwner && !profile.avatar_path && (
              <Link href={routes.profileEdit} className="flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline">
                <Camera aria-hidden className="size-3.5" /> Adicionar foto
              </Link>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold leading-tight break-words">{profile.display_name}</h1>
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

        {profile.bio ? (
          <p className="mt-4 whitespace-pre-line">{profile.bio}</p>
        ) : (
          isOwner && (
            <p className="mt-4 text-sm text-muted">
              Sem bio ainda.{" "}
              <Link href={routes.profileEdit} className="font-semibold text-accent hover:underline">
                Conte quem você é e o que treina
              </Link>
              .
            </p>
          )
        )}

        {teacherSlots.length > 0 && <NextClassCard slots={teacherSlots} compact teacherHref={routes.teacher(profile.username)} />}

        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-1">
          {stats.map(({ label, value, href }) => (
            <li key={label}>
              {href && canSeeContent ? (
                <Link href={href} className="inline-flex min-h-11 items-center gap-1 hover:underline">
                  <span className="font-semibold tabular-nums">{compactCount(value)}</span>
                  <span className="text-muted">{label}</span>
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center gap-1">
                  <span className="font-semibold tabular-nums">{compactCount(value)}</span>
                  <span className="text-muted">{label}</span>
                </span>
              )}
            </li>
          ))}
          {teacherStat && (
            <li>
              <Link href={teacherStat.href} className="inline-flex min-h-11 items-center gap-1 hover:underline">
                <GraduationCap aria-hidden className="size-4 text-accent" />
                <span className="font-semibold tabular-nums">{compactCount(teacherStat.value)}</span>
                <span className="text-muted">{teacherStat.label}</span>
              </Link>
            </li>
          )}
        </ul>

        <div className="mt-5">
          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={routes.publish}>
                <SquarePen aria-hidden className="size-4" /> Publicar
              </ButtonLink>
              <ButtonLink href={routes.profileEdit} variant="secondary">
                <Pencil aria-hidden className="size-4" /> Editar perfil
              </ButtonLink>
              {/* Professor ativo vai à área dele; quem ainda não é, ao cadastro (faixa preta ou equivalente). */}
              <ButtonLink href={routes.teacherArea} variant="secondary">
                <GraduationCap aria-hidden className="size-4" /> {teacherCard ? "Área do professor" : "Sou professor"}
              </ButtonLink>
            </div>
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

      {isOwner && (
        <nav aria-label="Adicionar ao perfil" className="grid grid-cols-3 gap-2">
          {[
            { href: routes.newCheckin, label: "Registrar treino", icon: Dumbbell },
            { href: `${routes.journey}#graduacoes`, label: "Graduação", icon: Medal },
            { href: `${routes.journey}#conquistas`, label: "Conquista", icon: Trophy },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 text-center text-sm font-semibold hover:bg-bg"
            >
              <Icon aria-hidden className="size-5 text-accent" />
              {label}
            </Link>
          ))}
        </nav>
      )}

      {canSeeContent && (
        // Jornada e posts carregam em paralelo e em streaming: o topo do perfil aparece sem esperar por eles.
        <>
          <Suspense fallback={<SectionSkeleton lines={3} />}>
            <JourneyCard supabase={supabase} userId={profile.id} isOwner={isOwner} />
          </Suspense>
          <section aria-labelledby="publicacoes">
            <h2 id="publicacoes" className="mb-3 font-display text-2xl font-semibold">
              Publicações
            </h2>
            <Suspense fallback={<SectionSkeleton lines={4} />}>
              <ProfilePosts profileId={profile.id} viewer={viewer} isOwner={isOwner} />
            </Suspense>
          </section>
        </>
      )}

      {!canSeeContent && !blockedByMe && (
        <EmptyState
          icon={Lock}
          title="Este perfil é privado"
          description={
            followState === "pending"
              ? "Sua solicitação foi enviada. Quando for aceita, você verá as publicações."
              : "Siga para ver as publicações, se a pessoa aceitar."
          }
        />
      )}
    </div>
  );
}

async function ProfilePosts({ profileId, viewer, isOwner }: { profileId: string; viewer: Viewer; isOwner: boolean }) {
  const supabase = await createClient();
  const page = await loadProfilePosts(supabase, profileId);
  return (
    <PostList
      initial={page}
      viewer={viewer}
      loadMore={loadMoreProfilePosts.bind(null, profileId)}
      empty={
        isOwner ? (
          <EmptyState
            icon={Newspaper}
            title="Você ainda não publicou"
            description="Compartilhe um treino, uma conquista ou uma foto com a comunidade."
            action={<ButtonLink href={routes.publish}>Fazer a primeira publicação</ButtonLink>}
          />
        ) : (
          <EmptyState icon={Newspaper} title="Nenhuma publicação" description="Ainda não há posts por aqui." />
        )
      }
    />
  );
}

function SectionSkeleton({ lines }: { lines: number }) {
  return (
    <Card aria-hidden className="animate-pulse space-y-3">
      <div className="h-6 w-40 rounded bg-border" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 rounded bg-border" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </Card>
  );
}
