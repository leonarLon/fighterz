import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { localEnv } from "./helpers";

// SECURITY.md §8: usuário A tenta alterar dados de B chamando a API diretamente (sem a UI).
test.describe("API direta respeita o RLS", () => {
  test.skip(({ isMobile }) => isMobile, "não depende de viewport");

  const env = localEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  test("usuário comum não altera perfil alheio, colunas protegidas nem papéis", async () => {
    const demo = createClient(url, key, { auth: { persistSession: false } });
    const { data: auth, error } = await demo.auth.signInWithPassword({
      email: "demo@figtherz.local",
      password: "Figtherz123",
    });
    expect(error).toBeNull();
    const demoId = auth.user!.id;

    const { data: admin } = await demo.from("profiles").select("id, display_name").eq("username", "admin").single();

    const hijack = await demo.from("profiles").update({ display_name: "Hackeado" }).eq("id", admin!.id).select();
    expect(hijack.data).toEqual([]);

    const status = await demo.from("profiles").update({ status: "active" }).eq("id", demoId);
    expect(status.error?.code).toBe("42501");

    const role = await demo.from("user_roles").insert({ user_id: demoId, role: "superadmin", granted_by: demoId });
    expect(role.error?.code).toBe("42501");

    const otherSettings = await demo.from("user_settings").select("user_id").neq("user_id", demoId);
    expect(otherSettings.data).toEqual([]);

    const anon = createClient(url, key, { auth: { persistSession: false } });
    const { data: still } = await anon.from("profiles").select("display_name").eq("id", admin!.id).single();
    expect(still!.display_name).toBe(admin!.display_name);

    const birth = await anon.from("user_settings").select("birth_date");
    expect(birth.error?.code).toBe("42501");
  });
});

test.describe("API direta: posts e interações", () => {
  test.skip(({ isMobile }) => isMobile, "não depende de viewport");

  const env = localEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const signIn = async (email: string) => {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password: "Figtherz123" });
    expect(error).toBeNull();
    return { client, id: data.user!.id };
  };

  test("visibilidade, curtida dupla e campos protegidos", async () => {
    const anon = createClient(url, key, { auth: { persistSession: false } });
    // atleta9 tem perfil privado no seed: visitante não vê nenhum post
    const { data: priv } = await anon.from("profiles").select("id").eq("username", "atleta9").single();
    const hidden = await anon.from("posts").select("id").eq("author_id", priv!.id);
    expect(hidden.data).toEqual([]);
    // posts "só seguidores" não vazam para visitantes
    const followersOnly = await anon.from("posts").select("id").eq("visibility", "followers").limit(1);
    expect(followersOnly.data).toEqual([]);

    const { client: demo, id: demoId } = await signIn("demo@figtherz.local");
    const { data: target } = await demo.from("posts").select("id, like_count").neq("author_id", demoId).limit(1).single();

    await demo.from("post_likes").delete().eq("post_id", target!.id).eq("user_id", demoId);
    const first = await demo.from("post_likes").insert({ post_id: target!.id, user_id: demoId });
    expect(first.error).toBeNull();
    const second = await demo.from("post_likes").insert({ post_id: target!.id, user_id: demoId });
    expect(second.error?.code).toBe("23505");
    const { count } = await demo.from("post_likes").select("*", { count: "exact", head: true })
      .eq("post_id", target!.id).eq("user_id", demoId);
    expect(count).toBe(1);

    const forged = await demo.from("posts").update({ like_count: 9999 }).eq("id", target!.id);
    expect(forged.error?.code).toBe("42501");
    const notMine = await demo.from("posts").update({ caption: "invadido" }).eq("id", target!.id).select();
    expect(notMine.data).toEqual([]);
    const fakeNotification = await demo.from("notifications").insert({ recipient_id: demoId, type: "like" });
    expect(fakeNotification.error?.code).toBe("42501");
    const othersSaved = await demo.from("saved_posts").select("user_id").neq("user_id", demoId);
    expect(othersSaved.data).toEqual([]);
  });

  test("Storage: só envia para a própria pasta", async () => {
    const { client: demo } = await signIn("demo@figtherz.local");
    const { id: otherId } = await signIn("atleta1@figtherz.local");
    const png = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });
    const intrusion = await demo.storage.from("post-media").upload(`${otherId}/x/0.jpg`, png, { contentType: "image/jpeg" });
    expect(intrusion.error).not.toBeNull();
    const wrongType = await demo.storage
      .from("post-media")
      .upload(`${(await demo.auth.getUser()).data.user!.id}/x/0.exe`, new Blob(["MZ"]), { contentType: "application/x-msdownload" });
    expect(wrongType.error).not.toBeNull();
  });
});
