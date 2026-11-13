import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { AvatarUpload } from "./avatar-upload";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function EditProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect(routes.signIn);
  return (
    <>
      <PageHeader title="Editar perfil" />
      <Card>
        <AvatarUpload userId={profile.id} name={profile.display_name} path={profile.avatar_path} />
        <ProfileForm
          profile={{
            username: profile.username,
            displayName: profile.display_name,
            bio: profile.bio ?? "",
            city: profile.city ?? "",
            state: profile.state ?? "",
            isPrivate: profile.is_private,
          }}
        />
      </Card>
      <p className="mt-4 text-center text-sm">
        <Link href={routes.profile(profile.username)} className="font-semibold text-accent hover:underline">
          Ver meu perfil público
        </Link>
      </p>
    </>
  );
}
