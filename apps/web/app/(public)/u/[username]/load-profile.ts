import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// cache(): metadata, página e listas leem o mesmo perfil com uma consulta só por requisição.
export const loadProfile = cache(async (username: string) => {
  const supabase = await createClient();
  // RLS decide o que é visível (suspensos e quem me bloqueou não aparecem).
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_path, bio, city, state, is_private, follower_count, following_count, post_count")
    .eq("username", decodeURIComponent(username).toLowerCase())
    .maybeSingle();
  return data;
});
