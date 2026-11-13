import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPost } from "@/lib/posts";
import { getViewer } from "@/lib/viewer";
import type { CommentView } from "@/lib/post-types";
import { routes } from "@/lib/routes";
import { PostCard } from "@/components/post/post-card";
import { Comments } from "./comments";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPost(await createClient(), (await params).id);
  if (!post) return { title: "Post não encontrado" };
  return { title: `${post.author.displayName}: ${post.caption.slice(0, 60) || "foto"}` };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const [post, viewer] = await Promise.all([loadPost(supabase, id), getViewer()]);
  if (!post) notFound();

  // RLS: só comentários visíveis (post visível, sem bloqueio, não removidos).
  const { data } = await supabase
    .from("comment_cards")
    .select("id, parent_id, author_id, author_username, author_display_name, author_avatar_path, body, like_count, created_at, viewer_has_liked")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .limit(500);

  const comments: CommentView[] = (data ?? []).map((c) => ({
    id: c.id!,
    parentId: c.parent_id,
    author: { id: c.author_id!, username: c.author_username ?? "", displayName: c.author_display_name ?? "", avatarPath: c.author_avatar_path },
    body: c.body ?? "",
    likeCount: c.like_count ?? 0,
    createdAt: c.created_at!,
    viewerHasLiked: Boolean(c.viewer_has_liked),
  }));

  return (
    <div className="space-y-6">
      <PostCard post={post} viewer={viewer} />
      <section id="comentarios" aria-labelledby="comentarios-titulo" className="scroll-mt-20">
        <h2 id="comentarios-titulo" className="mb-3 font-display text-2xl font-semibold">
          Comentários <span className="text-muted">({comments.length})</span>
        </h2>
        <Comments postId={post.id} postAuthorId={post.author.id} comments={comments} viewer={viewer} />
        {!viewer && (
          <p className="mt-4 text-sm text-muted">
            <Link href={`${routes.signIn}?next=${encodeURIComponent(routes.post(post.id))}`} className="font-semibold text-accent hover:underline">
              Entre
            </Link>{" "}
            para comentar.
          </p>
        )}
      </section>
    </div>
  );
}
