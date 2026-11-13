import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { loadMoreSaved } from "@/app/actions/posts";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PostList } from "@/components/post/post-list";
import { createClient } from "@/lib/supabase/server";
import { loadSavedPosts } from "@/lib/posts";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Salvos" };

export default async function SavedPage() {
  const supabase = await createClient();
  const [viewer, page] = await Promise.all([getViewer(), loadSavedPosts(supabase)]);
  return (
    <>
      <PageHeader title="Salvos" description="Só você vê o que salvou." />
      <PostList
        initial={page}
        viewer={viewer}
        loadMore={loadMoreSaved}
        empty={<EmptyState icon={Bookmark} title="Nada salvo ainda" description="Toque no marcador de um post para guardar aqui." />}
      />
    </>
  );
}
