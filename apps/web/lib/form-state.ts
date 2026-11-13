import { z } from "zod";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Valores devolvidos ao formulário após erro (o React limpa o form após a action). Nunca inclui senhas. */
  values?: Record<string, string>;
};

export const idleState: FormState = { status: "idle" };

export function fromZodError(error: z.ZodError, values?: Record<string, string>): FormState {
  return {
    status: "error",
    message: "Revise os campos destacados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
    values,
  };
}

export function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
