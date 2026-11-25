import "server-only";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, MobileHeader, SideNav } from "./app-nav";
import { UnreadProvider } from "./notification-badge";

/** Moldura da área logada: menu lateral (desktop), barra inferior (mobile) e contador de notificações. */
export async function AppShell({
  profile,
  children,
}: {
  profile: { id: string; username: string; display_name: string; avatar_path: string | null };
  children: ReactNode;
}) {
  const supabase = await createClient();
  const [{ count }, { data: teacher }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("teacher_profiles").select("status").eq("user_id", profile.id).maybeSingle(),
  ]);

  return (
    <UnreadProvider userId={profile.id} initial={count ?? 0}>
      <div className="min-h-screen">
        <SideNav
          username={profile.username}
          displayName={profile.display_name}
          avatarPath={profile.avatar_path}
          isTeacher={teacher?.status === "approved"}
        />
        <MobileHeader />
        <div className="lg:pl-64">
          <main id="conteudo" className="mx-auto w-full max-w-160 px-4 pb-28 pt-6 lg:pb-12 lg:pt-10">
            {children}
          </main>
        </div>
        <BottomNav username={profile.username} />
      </div>
    </UnreadProvider>
  );
}
