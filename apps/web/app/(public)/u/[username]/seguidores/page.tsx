import type { Metadata } from "next";
import { FollowListPage } from "../follow-list";
import { loadProfile } from "../load-profile";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ pagina?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await loadProfile((await params).username);
  return { title: profile ? `Seguidores de ${profile.display_name}` : "Perfil não encontrado" };
}

export default async function Page({ params, searchParams }: Props) {
  const [{ username }, { pagina }] = await Promise.all([params, searchParams]);
  const n = Number.parseInt(pagina ?? "1", 10);
  const page = Number.isFinite(n) && n > 1 ? Math.min(n - 1, 1000) : 0;
  return <FollowListPage username={username} mode="followers" page={page} />;
}
