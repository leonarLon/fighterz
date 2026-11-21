"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Flag, Heart, Reply, Trash2 } from "lucide-react";
import { COMMENT_MAX, timeAgo } from "@figtherz/core";
import { addComment, deleteComment, setCommentLike } from "@/app/actions/posts";
import type { CommentView, Viewer } from "@/lib/post-types";
import { idleState } from "@/lib/form-state";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { FormMessage } from "@/components/ui/form-message";
import { ReportForm } from "@/components/report/report-form";

type Props = { postId: string; postAuthorId: string; comments: CommentView[]; viewer: Viewer };

export function Comments({ postId, postAuthorId, comments, viewer }: Props) {
  const [replyTo, setReplyTo] = useState<CommentView | null>(null);
  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <div className="space-y-4">
      {viewer && <CommentForm postId={postId} />}
      {roots.length === 0 && <p className="text-muted">Ninguém comentou ainda.</p>}
      <ul className="space-y-4">
        {roots.map((comment) => (
          <li key={comment.id}>
            <CommentItem comment={comment} postId={postId} postAuthorId={postAuthorId} viewer={viewer} onReply={setReplyTo} />
            {(repliesOf(comment.id).length > 0 || replyTo?.id === comment.id) && (
              <ul className="ml-11 mt-3 space-y-3 border-l-2 border-border pl-4">
                {repliesOf(comment.id).map((reply) => (
                  <li key={reply.id}>
                    <CommentItem comment={reply} postId={postId} postAuthorId={postAuthorId} viewer={viewer} />
                  </li>
                ))}
                {replyTo?.id === comment.id && viewer && (
                  <li>
                    <CommentForm postId={postId} parent={comment} onDone={() => setReplyTo(null)} />
                  </li>
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommentForm({ postId, parent, onDone }: { postId: string; parent?: CommentView; onDone?: () => void }) {
  const [state, action, pending] = useActionState(addComment, idleState);
  const form = useRef<HTMLFormElement>(null);
  const fieldId = parent ? `reply-${parent.id}` : "new-comment";

  useEffect(() => {
    if (state.status === "success") {
      form.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form ref={form} action={action} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      {parent && <input type="hidden" name="parentId" value={parent.id} />}
      <label htmlFor={fieldId} className={parent ? "sr-only" : "block text-sm font-semibold"}>
        {parent ? `Responder a ${parent.author.displayName}` : "Escreva um comentário"}
      </label>
      <textarea
        id={fieldId}
        name="body"
        required
        maxLength={COMMENT_MAX}
        rows={2}
        autoFocus={Boolean(parent)}
        defaultValue={state.status === "error" ? state.values?.body : undefined}
        placeholder={parent ? `Responder a @${parent.author.username}` : "Comente algo respeitoso…"}
        aria-invalid={state.fieldErrors?.body ? true : undefined}
        className="block w-full rounded-md border border-border bg-surface px-3 py-2"
      />
      {state.fieldErrors?.body && <p className="text-[13px] font-medium text-danger">{state.fieldErrors.body[0]}</p>}
      <FormMessage status={state.status === "error" ? "error" : "idle"} message={state.message} />
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {parent ? "Responder" : "Comentar"}
        </Button>
        {parent && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  postId,
  postAuthorId,
  viewer,
  onReply,
}: {
  comment: CommentView;
  postId: string;
  postAuthorId: string;
  viewer: Viewer;
  onReply?: (comment: CommentView) => void;
}) {
  const [liked, setLiked] = useState(comment.viewerHasLiked);
  const [likes, setLikes] = useState(comment.likeCount);
  const [reporting, setReporting] = useState(false);
  const [, startTransition] = useTransition();
  const canDelete = viewer && (viewer.id === comment.author.id || viewer.id === postAuthorId);
  const canReport = viewer && viewer.id !== comment.author.id;

  function toggleLike() {
    if (!viewer) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      const result = await setCommentLike(comment.id, next);
      if (!result.ok) {
        setLiked(!next);
        setLikes((n) => n + (next ? -1 : 1));
      }
    });
  }

  return (
    <article className="flex gap-3" aria-label={`Comentário de ${comment.author.displayName}`}>
      <Avatar name={comment.author.displayName} path={comment.author.avatarPath} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="rounded-md bg-bg px-3 py-2">
          <p className="text-sm">
            <Link href={routes.profile(comment.author.username)} className="font-semibold hover:underline">
              {comment.author.displayName}
            </Link>{" "}
            <span className="text-[13px] text-muted">
              <time dateTime={comment.createdAt} suppressHydrationWarning>{timeAgo(comment.createdAt)}</time>
            </span>
          </p>
          <p className="whitespace-pre-line break-words">{comment.body}</p>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
          <button
            type="button"
            onClick={toggleLike}
            disabled={!viewer}
            aria-pressed={liked}
            className="flex min-h-9 items-center gap-1 rounded px-2 hover:text-text disabled:cursor-default"
          >
            <span className="sr-only">Curtir comentário</span>
            <Heart aria-hidden className={cn("size-4", liked && "fill-primary text-primary")} />
            <span className="tabular-nums">{likes}</span>
          </button>
          {onReply && viewer && (
            <button type="button" onClick={() => onReply(comment)} className="flex min-h-9 items-center gap-1 rounded px-2 hover:text-text">
              <Reply aria-hidden className="size-4" /> Responder
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => startTransition(async () => void (await deleteComment(comment.id, postId)))}
              className="flex min-h-9 items-center gap-1 rounded px-2 hover:text-danger"
            >
              <Trash2 aria-hidden className="size-4" /> Apagar
            </button>
          )}
          {canReport && (
            <button type="button" onClick={() => setReporting(true)} className="flex min-h-9 items-center gap-1 rounded px-2 hover:text-text">
              <Flag aria-hidden className="size-4" /> Denunciar
            </button>
          )}
        </div>
      </div>
      <Dialog open={reporting} onClose={() => setReporting(false)} title="Denunciar comentário">
        <ReportForm targetType="comment" targetId={comment.id} />
      </Dialog>
    </article>
  );
}
