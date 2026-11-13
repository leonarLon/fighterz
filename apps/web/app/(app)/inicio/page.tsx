import type { Metadata } from "next";
import { Compass, SquarePen } from "lucide-react";
import { loadMoreHomeFeed } from "@/app/actions/posts";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PostList } from "@/components/post/post-list";
import { createClient } from "@/lib/supabase/server";
import { loadHomeFeed } from "@/lib/posts";
import { getViewer } from "@/lib/viewer";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Início" };

export default async function FeedPage() {
  const supabase = await createClient();
  const [viewer, page] = await Promise.all([getViewer(), loadHomeFeed(supabase)]);
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Início" description="Publicações de quem você segue, das mais recentes para as mais antigas." />
        <ButtonLink href={routes.publish} className="hidden shrink-0 sm:inline-flex">
          <SquarePen aria-hidden className="size-4" /> Publicar
        </ButtonLink>
      </div>
      <PostList
        initial={page}
        viewer={viewer}
        loadMore={loadMoreHomeFeed}
        empty={
          <EmptyState
            icon={Compass}
            title="Seu feed ainda está vazio"
            description="Siga atletas, professores e academias para ver as publicações deles aqui."
            action={<ButtonLink href={routes.explore}>Explorar</ButtonLink>}
          />
        }
      />
    </>
  );
}
