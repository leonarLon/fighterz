"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { POST_MEDIA_BUCKET, deleteAccountSchema, parseThemePreference, profileUpdateSchema } from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes } from "@/lib/routes";
import { writeThemeCookie } from "@/lib/theme";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = {
    username: text(formData, "username"),
    displayName: text(formData, "displayName"),
    bio: text(formData, "bio"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    isPrivate: formData.get("isPrivate") === "on" ? "on" : "",
  };
  const parsed = profileUpdateSchema.safeParse({ ...values, isPrivate: values.isPrivate === "on" });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const input = parsed.data;

  const supabase = await createClient();
  // RLS garante que só o próprio perfil é alterado; o filtro por id é para clareza.
  const { error } = await supabase
    .from("profiles")
    .update({
      username: input.username,
      display_name: input.displayName,
      bio: input.bio,
      city: input.city,
      state: input.state,
      is_private: input.isPrivate,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { username: ["Esse nome de usuário já está em uso."] }, values };
    }
    return { status: "error", message: "Não foi possível salvar o perfil. Tente novamente.", values };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Perfil atualizado.", values };
}

/** Persiste o tema no cookie (visitantes também) e, se logado, na conta. */
export async function setThemePreference(value: string): Promise<void> {
  const theme = parseThemePreference(value);
  await writeThemeCookie(theme);

  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("user_settings").update({ theme }).eq("user_id", user.id);
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse({
    password: text(formData, "password"),
    confirmation: text(formData, "confirmation").trim(),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  if (!user.email) return { status: "error", message: "Não foi possível confirmar sua identidade." };

  const supabase = await createClient();

  // Reautenticação (SECURITY.md §2): a senha precisa estar correta.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (authError) return { status: "error", fieldErrors: { password: ["Senha incorreta."] } };

  // LGPD: apaga as mídias do usuário no Storage antes de apagar a conta (a política só permite a própria pasta).
  const bucket = supabase.storage.from(POST_MEDIA_BUCKET);
  const { data: folders } = await bucket.list(user.id, { limit: 1000 });
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(`${user.id}/${folder.name}`, { limit: 100 });
    const paths = (files ?? []).map((file) => `${user.id}/${folder.name}/${file.name}`);
    if (paths.length) await bucket.remove(paths);
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { status: "error", message: "Não foi possível excluir a conta. Tente novamente." };

  // O usuário já não existe no Auth: limpa só a sessão local (cookies).
  await supabase.auth.signOut({ scope: "local" });
  redirect(`${routes.home}?conta=excluida`);
}
