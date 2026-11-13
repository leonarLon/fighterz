"use server";

import { redirect } from "next/navigation";
import {
  newPasswordSchema,
  parseThemePreference,
  passwordResetRequestSchema,
  signInSchema,
  signUpSchema,
} from "@figtherz/core";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { fromZodError, text, type FormState } from "@/lib/form-state";
import { routes, safeNextPath } from "@/lib/routes";
import { requireUser } from "@/lib/auth";
import { writeThemeCookie } from "@/lib/theme";

const TOO_MANY = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";

function isRateLimited(code: string | undefined) {
  return code === "over_request_rate_limit" || code === "over_email_send_rate_limit";
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    email: text(formData, "email"),
    username: text(formData, "username"),
    displayName: text(formData, "displayName"),
    birthDate: text(formData, "birthDate"),
  };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
    acceptedTerms: formData.get("acceptedTerms") === "on",
  });
  if (!parsed.success) return fromZodError(parsed.error, values);
  const input = parsed.data;

  const supabase = await createClient();
  const { data: platform } = await supabase.from("platform_settings").select("signups_open").maybeSingle();
  if (platform && !platform.signups_open) {
    return { status: "error", message: "Novos cadastros estão temporariamente fechados. Tente mais tarde.", values };
  }
  const { data: available } = await supabase.rpc("is_username_available", { p_username: input.username });
  if (!available) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: { username: ["Esse nome de usuário já está em uso."] },
      values,
    };
  }

  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${env.siteUrl}${routes.feed}`,
      data: {
        username: input.username,
        display_name: input.displayName,
        birth_date: input.birthDate,
        accepted_terms: true,
      },
    },
  });

  if (error) {
    if (isRateLimited(error.code)) return { status: "error", message: TOO_MANY, values };
    if (error.code === "weak_password") {
      return { status: "error", fieldErrors: { password: ["Senha fraca. Use letras e números, com 8+ caracteres."] }, values };
    }
    // Mensagem genérica: não revelar se o e-mail já existe (SECURITY.md §4, enumeração).
    return { status: "error", message: "Não foi possível criar a conta. Tente novamente em instantes.", values };
  }

  // Com confirmação de e-mail ativa, o Supabase responde igual para e-mail novo ou já cadastrado.
  return {
    status: "success",
    message: `Enviamos um link de confirmação para ${input.email}. Abra o e-mail para ativar sua conta.`,
  };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = signInSchema.safeParse({ email: values.email, password: text(formData, "password") });
  if (!parsed.success) return fromZodError(parsed.error, values);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    if (error && isRateLimited(error.code)) return { status: "error", message: TOO_MANY, values };
    if (error?.code === "user_banned") {
      return { status: "error", message: "Esta conta está suspensa. Se acha que foi um engano, responda ao e-mail de suporte.", values };
    }
    if (error?.code === "email_not_confirmed") {
      return { status: "error", message: "Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.", values };
    }
    return { status: "error", message: "E-mail ou senha incorretos.", values };
  }

  // O tema salvo na conta vale em qualquer dispositivo.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("theme")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (settings) await writeThemeCookie(parseThemePreference(settings.theme));

  redirect(safeNextPath(text(formData, "next")));
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = passwordResetRequestSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}${routes.resetPassword}`,
  });
  if (error && isRateLimited(error.code)) return { status: "error", message: TOO_MANY, values };

  // Resposta idêntica exista ou não a conta.
  return {
    status: "success",
    message: "Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = newPasswordSchema.safeParse({
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { status: "error", fieldErrors: { password: ["A nova senha precisa ser diferente da atual."] } };
    }
    if (error.code === "reauthentication_needed") {
      return { status: "error", message: "Por segurança, peça um novo link de recuperação e tente de novo." };
    }
    return { status: "error", message: "Não foi possível alterar a senha. Tente novamente." };
  }

  redirect(`${routes.settings}?senha=alterada`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.home);
}
