import { z } from 'zod';
import { CLASS_LEVELS, CLASS_STATUSES } from '../domain/schedule';
import { normalizeCep } from '../domain/address';
import { MAX_PRICE_CENTS, MIN_PRICE_CENTS, parseBrl } from '../domain/money';
import { BRAZILIAN_STATES, usernameSchema } from './profile';
import { email, https, optional, phone } from './fields';

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
  accessPlans: optional(500, 'Máximo de 500 caracteres.'),
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

// ---------------------------------------------------------------------------
// TotalPass, Wellhub e diária por unidade (PLANO_EVOLUCAO_COMERCIAL.md §4)
// ---------------------------------------------------------------------------
export const UNIT_ACCESS_KINDS = ['totalpass', 'wellhub', 'day_pass'] as const;
export type UnitAccessKind = (typeof UNIT_ACCESS_KINDS)[number];
export const UNIT_ACCESS_LABELS: Record<UnitAccessKind, string> = { totalpass: 'TotalPass', wellhub: 'Wellhub', day_pass: 'Diária' };

export const PRICE_STATUSES = ['paid', 'free', 'undisclosed'] as const;
export type PriceStatus = (typeof PRICE_STATUSES)[number];
export const PRICE_STATUS_LABELS: Record<PriceStatus, string> = { paid: 'Paga', free: 'Gratuita', undisclosed: 'Valor não divulgado' };

/** Planos aceitos digitados em uma linha ("Silver, Gold") ou um por linha. */
export function parsePlanList(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const unitAccessSchema = z
  .object({
    kind: z.enum(UNIT_ACCESS_KINDS),
    accepted: z.boolean(),
    plans: z.string().max(600).optional().default(''),
    martialArtIds: z.array(z.uuid()).max(20).default([]),
    restrictions: optional(500, 'Máximo de 500 caracteres.'),
    accessHours: optional(300, 'Máximo de 300 caracteres.'),
    notes: optional(500, 'Máximo de 500 caracteres.'),
    priceStatus: z.union([z.enum(PRICE_STATUSES), z.literal('')]).optional().default(''),
    price: z.string().trim().max(30).optional().default(''),
  })
  .transform((d, ctx) => {
    const plans = d.kind === 'day_pass' ? [] : parsePlanList(d.plans);
    if (plans.length > 10) ctx.addIssue({ code: 'custom', path: ['plans'], message: 'Informe no máximo 10 planos.' });
    if (plans.some((p) => p.length > 40)) ctx.addIssue({ code: 'custom', path: ['plans'], message: 'Cada plano pode ter até 40 caracteres.' });
    if (new Set(plans.map((p) => p.toLowerCase())).size !== plans.length)
      ctx.addIssue({ code: 'custom', path: ['plans'], message: 'Há planos repetidos.' });

    let priceStatus: PriceStatus | null = null;
    let priceCents: number | null = null;
    if (d.kind === 'day_pass' && d.accepted) {
      if (!d.priceStatus) ctx.addIssue({ code: 'custom', path: ['priceStatus'], message: 'Diga se a diária é paga, gratuita ou se o valor não é divulgado.' });
      else priceStatus = d.priceStatus;
      if (priceStatus === 'paid') {
        priceCents = parseBrl(d.price);
        if (priceCents === null) ctx.addIssue({ code: 'custom', path: ['price'], message: 'Informe o valor. Ex.: 40,00' });
        else if (priceCents < MIN_PRICE_CENTS || priceCents > MAX_PRICE_CENTS)
          ctx.addIssue({ code: 'custom', path: ['price'], message: 'Valor deve ficar entre R$ 1,00 e R$ 100.000,00.' });
      }
    }
    return {
      kind: d.kind,
      accepted: d.accepted,
      plans,
      martialArtIds: d.accepted ? [...new Set(d.martialArtIds)] : [],
      restrictions: d.restrictions,
      accessHours: d.accessHours,
      notes: d.notes,
      priceStatus,
      priceCents,
    };
  });

export type UnitAccessInput = z.infer<typeof unitAccessSchema>;
