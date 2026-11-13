import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/app-shell";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { routes } from "@/lib/routes";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getCurrentProfile();
  // Sessão sem perfil (ex.: conta excluída em outra aba): volta ao login.
  if (!profile) redirect(routes.signIn);
  return <AppShell profile={profile}>{children}</AppShell>;
}
