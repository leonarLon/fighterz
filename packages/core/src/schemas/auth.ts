import { z } from 'zod';
import { isAdult, parseIsoDate, MAX_DECLARED_AGE, MIN_ACCOUNT_AGE } from '../domain/age';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, hasLettersAndDigits, isCommonPassword } from '../domain/password';
import { usernameSchema, displayNameSchema } from './profile';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Informe um e-mail válido.').max(254, 'E-mail muito longo.'));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`)
  .refine(hasLettersAndDigits, 'Use letras e números na senha.')
  .refine((value) => !isCommonPassword(value), 'Essa senha é muito comum. Escolha outra.');

export const birthDateSchema = z
  .string()
  .refine((value) => parseIsoDate(value) !== null, 'Informe uma data válida.')
  .refine((value) => value >= '1900-01-01', 'Informe uma data válida.')
  .refine((value) => isAdult(value), `É preciso ter ${MIN_ACCOUNT_AGE} anos ou mais para criar uma conta.`);

/** Idade em anos, digitada no cadastro (feedback de produção: o seletor de data confundia no celular). */
export const ageSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}$/, 'Informe sua idade em anos, só números.')
  .transform(Number)
  .refine((age) => age >= MIN_ACCOUNT_AGE, `É preciso ter ${MIN_ACCOUNT_AGE} anos ou mais para criar uma conta.`)
  .refine((age) => age <= MAX_DECLARED_AGE, 'Informe uma idade válida.');

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    username: usernameSchema,
    displayName: displayNameSchema,
    age: ageSchema,
    acceptedTerms: z.literal(true, 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'As senhas não coincidem.',
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha.').max(PASSWORD_MAX_LENGTH),
});

export const passwordResetRequestSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'As senhas não coincidem.',
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Informe sua senha para confirmar.'),
  confirmation: z.literal('EXCLUIR', 'Digite EXCLUIR para confirmar.'),
});
