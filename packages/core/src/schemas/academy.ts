import { z } from 'zod';
import { CLASS_LEVELS, CLASS_STATUSES } from '../domain/schedule';
import { normalizeCep } from '../domain/address';
import { BRAZILIAN_STATES, usernameSchema } from './profile';

const optional = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

const https = z
  .string()
  .trim()
  .regex(/^https:\/\/[^\s<>"]{3,}$/, 'Use um link completo começando com https://')
  .max(300, 'Link muito longo.');

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{8,20}$/, 'Telefone inválido. Ex.: (41) 99999-0000')
  .optional()
  .or(z.literal(''))
  .transform((value) => value || null);

const email = z
  .union([z.email('E-mail inválido.').max(254), z.literal('')])
  .optional()
  .transform((value) => value || null);

/** "Faixa preta — Federação X — 2020", uma por linha. */
export function parseCertifications(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((line) => {
      const [title = '', issuer = '', year = ''] = line.split(/\s+[—–-]\s+/);
      const y = Number.parseInt(year, 10);
      return { title: title.slice(0, 120), issuer: issuer.slice(0, 120) || null, year: Number.isFinite(y) ? y : null };
    });
}

export const teacherProfileSchema = z.object({
  professionalName: z.string().trim().min(2, 'Informe o nome profissional.').max(80, 'Máximo de 80 caracteres.'),
  bio: optional(2000, 'A apresentação pode ter no máximo 2000 caracteres.'),
  experienceYears: z.coerce.number().int().min(0, 'Valor inválido.').max(80, 'Valor inválido.').optional().nullable(),
  lineage: optional(300, 'Máximo de 300 caracteres.'),
  certifications: z.string().max(4000).optional().transform((value) => parseCertifications(value ?? '')),
  contactEmail: email,
  contactPhone: phone,
  showContact: z.boolean(),
  socialLinks: z
    .array(https)
    .max(10, 'Até 10 links.'),
  martialArts: z
    .array(z.object({ martialArtId: z.uuid(), rankId: z.union([z.uuid(), z.literal('')]).transform((v) => v || null) }))
    .min(1, 'Escolha pelo menos uma modalidade que você ensina.')
    .max(12),
});

export const academySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da academia.').max(80, 'Máximo de 80 caracteres.'),
  description: optional(3000, 'A descrição pode ter no máximo 3000 caracteres.'),
  website: z.union([https, z.literal('')]).optional().transform((value) => value || null),
  instagram: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, ''))
    .pipe(z.union([z.string().regex(/^[A-Za-z0-9_.]{1,30}$/, 'Instagram inválido.'), z.literal('')]))
    .optional()
    .transform((value) => value || null),
  contactEmail: email,
  contactPhone: phone,
  martialArtIds: z.array(z.uuid()).min(1, 'Escolha pelo menos uma modalidade.').max(12),
});

export const unitSchema = z
  .object({
    name: z.string().trim().min(1, 'Dê um nome à unidade (ex.: Sede).').max(80),
    postalCode: z
      .string()
      .optional()
      .transform((value) => (value ? normalizeCep(value) ?? 'invalid' : null))
      .refine((value) => value !== 'invalid', 'CEP deve ter 8 dígitos.'),
    street: optional(120, 'Máximo de 120 caracteres.'),
    number: optional(20, 'Máximo de 20 caracteres.'),
    complement: optional(80, 'Máximo de 80 caracteres.'),
    neighborhood: optional(80, 'Máximo de 80 caracteres.'),
    city: z.string().trim().min(2, 'Informe a cidade.').max(80),
    state: z.enum(BRAZILIAN_STATES, 'Escolha o estado.'),
    referencePoint: optional(160, 'Máximo de 160 caracteres.'),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
    coordsSource: z.enum(['manual', 'nominatim']).optional().nullable(),
    isActive: z.boolean(),
  })
  .refine((data) => (data.latitude == null) === (data.longitude == null), {
    path: ['latitude'],
    error: 'Informe latitude e longitude juntas, ou deixe as duas vazias.',
  });

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido.');

export const classSchema = z
  .object({
    unitId: z.uuid('Escolha a unidade.'),
    martialArtId: z.uuid('Escolha a modalidade.'),
    teacherId: z.union([z.uuid(), z.literal('')]).optional().transform((value) => value || null),
    name: z.string().trim().min(2, 'Dê um nome à aula.').max(80),
    level: z.enum(CLASS_LEVELS),
    weekday: z.coerce.number().int().min(0).max(6),
    startsAt: time,
    endsAt: time,
    acceptsTrial: z.boolean(),
    notes: optional(500, 'Máximo de 500 caracteres.'),
    status: z.enum(CLASS_STATUSES).default('active'),
  })
  .refine((data) => data.endsAt > data.startsAt, { path: ['endsAt'], error: 'O fim precisa ser depois do início.' });

export const inviteSchema = z.object({
  username: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, ''))
    .pipe(usernameSchema),
  role: z.enum(['teacher', 'admin']),
});

export const MEMBERSHIP_ROLE_LABELS = {
  owner: 'Responsável',
  admin: 'Administrador',
  teacher: 'Professor',
  student: 'Aluno',
} as const;
