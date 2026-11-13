import "server-only";
import type { Database } from "@figtherz/core";
import { POST_MEDIA_BUCKET } from "@figtherz/core";
import type { createClient } from "@/lib/supabase/server";
import type { PostView } from "@/lib/post-types";

type Client = Awaited<ReturnType<typeof createClient>>;
type PostCardRow = Database["public"]["Views"]["post_cards"]["Row"];
type MediaJson = {
  id: string;
  type?: "image" | "video";
  path: string;
  thumbnail?: string | null;
  width: number | null;
  height: number | null;
  duration_ms?: number | null;
  alt: string | null;
};

// Imagens ficam num bucket privado. A URL assinada só é emitida se a RLS do Storage
// permitir (ou seja, se o leitor pode ver o post). 1 h cobre a sessão de leitura de uma página.
const SIGNED_URL_TTL = 60 * 60;

export const PAGE_SIZE = 20;

/** Converte linhas de post_cards em PostView, assinando todas as mídias da página numa única chamada. */
export async function toPostViews(supabase: Client, rows: PostCardRow[]): Promise<PostView[]> {
  const paths = rows.flatMap((row) =>
    ((row.media as MediaJson[] | null) ?? []).flatMap((m) => (m.thumbnail ? [m.path, m.thumbnail] : [m.path])),
  );
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage.from(POST_MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    author: {
      id: row.author_id,
      username: row.author_username ?? "",
      displayName: row.author_display_name,
      avatarPath: row.author_avatar_path,
    },
    kind: row.kind,
    caption: row.caption,
    visibility: row.visibility,
    locationLabel: row.location_label,
    martialArtName: row.martial_art_name,
    academy: row.academy_name && row.academy_slug ? { name: row.academy_name, slug: row.academy_slug } : null,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    moderationStatus: row.moderation_status,
    mentions: (row.mentions as string[] | null) ?? [],
    viewerHasLiked: Boolean(row.viewer_has_liked),
    viewerHasSaved: Boolean(row.viewer_has_saved),
    media: ((row.media as MediaJson[] | null) ?? [])
      .map((m) => ({
        id: m.id,
        type: m.type ?? "image",
        url: urls.get(m.path) ?? "",
        poster: m.thumbnail ? (urls.get(m.thumbnail) ?? null) : null,
        durationMs: m.duration_ms ?? null,
        width: m.width ?? 1,
        height: m.height ?? 1,
        alt: m.alt ?? "",
      }))
      .filter((m) => m.url),
  }));
}

/** Cursor opaco "created_at|id" para paginação keyset. */
export function encodeCursor(rows: { created_at: string; id: string }[], limit: number): string | null {
  const last = rows[rows.length - 1];
  return rows.length === limit && last ? `${last.created_at}|${last.id}` : null;
}

export function decodeCursor(cursor: string | null | undefined): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  const [createdAt, id] = cursor.split("|");
  if (!createdAt || !id || Number.isNaN(Date.parse(createdAt)) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { createdAt, id };
}

export type Page = { items: PostView[]; nextCursor: string | null };

export async function loadHomeFeed(supabase: Client, cursor?: string | null): Promise<Page> {
  const c = decodeCursor(cursor);
  const { data } = await supabase.rpc("get_home_feed", {
    p_before_created_at: c?.createdAt,
    p_before_id: c?.id,
    p_limit: PAGE_SIZE,
  });
  const rows = data ?? [];
  return { items: await toPostViews(supabase, rows), nextCursor: encodeCursor(rows, PAGE_SIZE) };
}

export async function loadProfilePosts(supabase: Client, authorId: string, cursor?: string | null): Promise<Page> {
  const c = decodeCursor(cursor);
  const { data } = await supabase.rpc("get_profile_posts", {
    p_author_id: authorId,
    p_before_created_at: c?.createdAt,
    p_before_id: c?.id,
    p_limit: PAGE_SIZE,
  });
  const rows = data ?? [];
  return { items: await toPostViews(supabase, rows), nextCursor: encodeCursor(rows, PAGE_SIZE) };
}

export async function loadSavedPosts(supabase: Client, cursor?: string | null): Promise<Page> {
  const before = cursor && !Number.isNaN(Date.parse(cursor)) ? cursor : undefined;
  const { data } = await supabase.rpc("get_saved_posts", { p_before_saved_at: before, p_limit: PAGE_SIZE });
  const rows = data ?? [];
  const last = rows[rows.length - 1];
  return {
    items: await toPostViews(supabase, rows.map((r) => r.post)),
    nextCursor: rows.length === PAGE_SIZE && last ? last.saved_at : null,
  };
}

export const EXPLORE_PAGE_SIZE = 18;

export async function loadExplore(supabase: Client, page = 0): Promise<Page> {
  const { data } = await supabase.rpc("get_explore", { p_page: page, p_limit: EXPLORE_PAGE_SIZE });
  const rows = data ?? [];
  return {
    items: await toPostViews(supabase, rows),
    nextCursor: rows.length === EXPLORE_PAGE_SIZE ? String(page + 1) : null,
  };
}

export async function loadPost(supabase: Client, id: string): Promise<PostView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase.from("post_cards").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [view] = await toPostViews(supabase, [data]);
  return view ?? null;
}
