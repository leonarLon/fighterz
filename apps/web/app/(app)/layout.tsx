import { redirect } from "next/navigation";
import { BottomNav, MobileHeader, SideNav } from "@/components/nav/app-nav";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { routes } from "@/lib/routes";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getCurrentProfile();
  // Sessão sem perfil (ex.: conta excluída em outra aba): volta ao login.
  if (!profile) redirect(routes.signIn);

  return (
    <div className="min-h-screen">
      <SideNav username={profile.username} displayName={profile.display_name} />
      <MobileHeader />
      <div className="lg:pl-64">
        <main id="conteudo" className="mx-auto w-full max-w-160 px-4 pb-28 pt-6 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>
      <BottomNav username={profile.username} />
    </div>
  );
}
