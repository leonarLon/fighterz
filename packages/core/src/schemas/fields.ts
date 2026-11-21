import { z } from 'zod';

// Campos comuns a academias e páginas comerciais. Módulo interno (não exportado pelo index).
export const optional = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

export const https = z
  .string()
  .trim()
  .regex(/^https:\/\/[^\s<>"]{3,}$/, 'Use um link completo começando com https://')
  .max(300, 'Link muito longo.');

export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{8,20}$/, 'Telefone inválido. Ex.: (41) 99999-0000')
  .optional()
  .or(z.literal(''))
  .transform((value) => value || null);

export const email = z
  .union([z.email('E-mail inválido.').max(254), z.literal('')])
  .optional()
  .transform((value) => value || null);
