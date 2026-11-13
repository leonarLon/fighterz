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
