"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Dumbbell, Globe, Heart, Lock, MessageCircle, MoreHorizontal, Share2, Trash2, Flag, Users } from "lucide-react";
import { compactCount, timeAgo, VISIBILITY_LABELS } from "@figtherz/core";
import { deletePost, setLike, setSaved } from "@/app/actions/posts";
import type { PostView, Viewer } from "@/lib/post-types";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReportForm } from "@/components/report/report-form";
import { Caption } from "./caption";
import { MediaCarousel } from "./media-carousel";

const visibilityIcon = { public: Globe, followers: Users, private: Lock } as const;

export function PostCard({ post, viewer, onDeleted }: { post: PostView; viewer: Viewer; onDeleted?: (id: string) => void }) {
  const [liked, setLiked] = useState(post.viewerHasLiked);
  const [likes, setLikes] = useState(post.likeCount);
  const [saved, setSavedState] = useState(post.viewerHasSaved);
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"report" | "delete" | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const isOwner = viewer?.id === post.author.id;
  const VisibilityIcon = visibilityIcon[post.visibility];
  const postUrl = `/p/${post.id}`;

  function requireLogin() {
    if (!viewer) router.push(`${routes.signIn}?next=${encodeURIComponent(postUrl)}`);
    return !viewer;
  }

  function toggleLike() {
    if (requireLogin()) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      const result = await setLike(post.id, next);
      if (!result.ok) {
        setLiked(!next);
        setLikes((n) => n + (next ? -1 : 1));
        setNotice(result.message);
      }
    });
  }

  function toggleSave() {
    if (requireLogin()) return;
    const next = !saved;
    setSavedState(next);
    startTransition(async () => {
      const result = await setSaved(post.id, next);
      if (!result.ok) {
        setSavedState(!next);
        setNotice(result.message);
      } else setNotice(next ? "Post salvo." : "Removido dos salvos.");
    });
  }

  async function share() {
    const url = new URL(postUrl, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: `Post de ${post.author.displayName} no Figtherz`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("Link copiado.");
    } catch {
      // Compartilhamento cancelado pelo usuário.
    }
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result.ok) {
        setDialog(null);
        onDeleted?.(post.id);
      } else setNotice(result.message);
    });
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface shadow-(--shadow-card)" aria-labelledby={`post-${post.id}-author`}>
      <header className="flex items-center gap-3 px-4 py-3">
        <Link href={routes.profile(post.author.username)} tabIndex={-1} aria-hidden>
          <Avatar name={post.author.displayName} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            id={`post-${post.id}-author`}
            href={routes.profile(post.author.username)}
            className="block truncate font-semibold hover:underline"
          >
            {post.author.displayName}
          </Link>
          <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
            <Link href={postUrl} className="hover:underline">
              <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            </Link>
            <span aria-hidden>·</span>
            <VisibilityIcon aria-label={VISIBILITY_LABELS[post.visibility]} className="size-3.5" />
            {post.martialArtName && post.kind !== "checkin" && (
              <>
                <span aria-hidden>·</span>
                <span>{post.martialArtName}</span>
              </>
            )}
            {post.locationLabel && (
              <>
                <span aria-hidden>·</span>
                <span>{post.locationLabel}</span>
              </>
            )}
          </p>
        </div>
        {viewer && (
          <div className="relative">
            <button
              type="button"
              aria-label="Mais opções"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((v) => !v)}
              onBlur={(e) => !e.currentTarget.parentElement?.contains(e.relatedTarget) && setMenuOpen(false)}
              className="flex size-11 items-center justify-center rounded-md text-muted hover:text-text"
            >
              <MoreHorizontal aria-hidden className="size-5" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-11 z-10 min-w-44 rounded-md border border-border bg-surface-raised py-1 shadow-lg">
                {isOwner ? (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => (setMenuOpen(false), setDialog("delete"))}
                    className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-danger hover:bg-bg"
                  >
                    <Trash2 aria-hidden className="size-4" /> Apagar post
                  </button>
                ) : (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => (setMenuOpen(false), setDialog("report"))}
                    className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-bg"
                  >
                    <Flag aria-hidden className="size-4" /> Denunciar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>
      {post.kind === "checkin" && (
        <p className="mx-4 mb-3 flex items-start gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm">
          <Dumbbell aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            <span className="font-semibold">Registrou um treino</span>
            {post.martialArtName ? ` de ${post.martialArtName}` : ""}
            {post.academy && (
              <>
                {" em "}
                <Link href={routes.academy(post.academy.slug)} className="font-semibold text-accent hover:underline">
                  {post.academy.name}
                </Link>
              </>
            )}
          </span>
        </p>
      )}

      {post.moderationStatus !== "visible" && (
        <p className="mx-4 mb-3 rounded-md border border-warning/40 px-3 py-2 text-[13px] font-medium text-warning">
          {post.moderationStatus === "removed"
            ? "Este post foi removido pela moderação por violar as diretrizes. Só você o vê."
            : "Este post está em análise pela moderação e só você o vê."}
        </p>
      )}

      <MediaCarousel media={post.media} label={`Fotos do post de ${post.author.displayName}`} />

      <div className="flex items-center gap-1 px-2 pt-2">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className="flex min-h-11 items-center gap-1.5 rounded-md px-2 hover:bg-bg"
        >
          <span className="sr-only">Curtir</span>
          <Heart
            aria-hidden
            className={cn("size-6 transition-transform duration-150", liked && "scale-110 fill-primary text-primary")}
          />
          <span className="text-sm font-semibold tabular-nums">{compactCount(likes)}</span>
        </button>
        <Link
          href={`${postUrl}#comentarios`}
          className="flex min-h-11 items-center gap-1.5 rounded-md px-2 hover:bg-bg"
        >
          <span className="sr-only">Comentários</span>
          <MessageCircle aria-hidden className="size-6" />
          <span className="text-sm font-semibold tabular-nums">{compactCount(post.commentCount)}</span>
        </Link>
        <button type="button" onClick={share} aria-label="Compartilhar" className="flex size-11 items-center justify-center rounded-md hover:bg-bg">
          <Share2 aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={saved}
          aria-label="Salvar"
          className="ml-auto flex size-11 items-center justify-center rounded-md hover:bg-bg"
        >
          <Bookmark aria-hidden className={cn("size-6", saved && "fill-text")} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-1">
        <Caption text={post.caption} mentions={post.mentions} />
        <p aria-live="polite" className="mt-1 text-[13px] text-muted empty:hidden">
          {notice}
        </p>
      </div>

      <Dialog open={dialog === "report"} onClose={() => setDialog(null)} title="Denunciar post">
        <ReportForm targetType="post" targetId={post.id} />
      </Dialog>
      <Dialog open={dialog === "delete"} onClose={() => setDialog(null)} title="Apagar post?">
        <p className="text-muted">O post sai do seu perfil e do feed de todo mundo.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Cancelar
          </Button>
          <Button variant="outline-danger" onClick={confirmDelete}>
            <Trash2 aria-hidden className="size-4" /> Apagar
          </Button>
        </div>
      </Dialog>
    </article>
  );
}
