"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PostView, Viewer } from "@/lib/post-types";
import { Button } from "@/components/ui/button";
import { PostCard } from "./post-card";

type Page = { items: PostView[]; nextCursor: string | null };

/**
 * Lista com paginação por cursor. Carrega a próxima página ao chegar perto do fim
 * (IntersectionObserver) e mantém o botão como alternativa acessível.
 */
export function PostList({
  initial,
  viewer,
  loadMore,
  empty,
}: {
  initial: Page;
  viewer: Viewer;
  loadMore: (cursor: string) => Promise<Page>;
  empty?: React.ReactNode;
}) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  function next() {
    if (!cursor || pending) return;
    startTransition(async () => {
      try {
        const page = await loadMore(cursor);
        setItems((current) => {
          const seen = new Set(current.map((p) => p.id));
          return [...current, ...page.items.filter((p) => !seen.has(p.id))];
        });
        setCursor(page.nextCursor);
        setError("");
      } catch {
        setError("Não foi possível carregar mais posts.");
      }
    });
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && next(), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  });

  if (items.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-4">
      <div className="space-y-4" aria-busy={pending || undefined}>
        {items.map((post) => (
          <PostCard key={post.id} post={post} viewer={viewer} onDeleted={(id) => setItems((list) => list.filter((p) => p.id !== id))} />
        ))}
      </div>
      <div ref={sentinel} />
      {error && <p role="alert" className="text-center text-sm text-danger">{error}</p>}
      {cursor ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={next} loading={pending}>
            Carregar mais
          </Button>
        </div>
      ) : (
        <p className="py-4 text-center text-[13px] text-muted">Você chegou ao fim.</p>
      )}
    </div>
  );
}
