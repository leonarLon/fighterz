import "server-only";
import { getCurrentProfile } from "@/lib/auth";
import type { Viewer } from "@/lib/post-types";

export async function getViewer(): Promise<Viewer> {
  const profile = await getCurrentProfile();
  return profile ? { id: profile.id, username: profile.username } : null;
}
