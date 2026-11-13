import { z } from 'zod';

/** Mesma regra do banco: profiles_username_format. */
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, 'Use de 3 a 30 caracteres: letras minúsculas, números, ponto ou sublinhado.');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu nome.')
  .max(60, 'O nome pode ter no máximo 60 caracteres.');

/** Campo opcional de formulário: string vazia vira null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const profileUpdateSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  bio: optionalText(500, 'A bio pode ter no máximo 500 caracteres.'),
  city: optionalText(80, 'A cidade pode ter no máximo 80 caracteres.'),
  state: z
    .union([z.enum(BRAZILIAN_STATES, 'Estado inválido.'), z.literal('')])
    .optional()
    .transform((value) => (value ? value : null)),
  isPrivate: z.boolean(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
