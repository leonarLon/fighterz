import { z } from 'zod';
import { ACHIEVEMENT_TYPES, EVENT_TYPES, MEDALS, localDateTimeToIso } from '../domain/journey';
import { normalizeCep } from '../domain/address';
import { BRAZILIAN_STATES, usernameSchema } from './profile';
import { VISIBILITIES } from './social';

const optional = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

const optionalUuid = z
  .union([z.uuid(), z.literal('')])
  .optional()
  .transform((value) => value || null);

const https = z
  .union([
    z
      .string()
      .trim()
      .regex(/^https:\/\/[^\s<>"]{3,}$/, 'Use um link completo começando com https://')
      .max(300, 'Link muito longo.'),
    z.literal(''),
  ])
  .optional()
  .transform((value) => value || null);

/** Data sem hora (AAAA-MM-DD), não futura. `today` vem de fora para o teste ser determinístico. */
const pastDay = (message: string, today = () => new Date().toISOString().slice(0, 10)) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
    .refine((value) => value >= '1900-01-01', 'Data inválida.')
    .refine((value) => value <= today(), message);

const optionalPastDay = (message: string) =>
  z
    .union([pastDay(message), z.literal('')])
    .optional()
    .transform((value) => value || null);

/** "2026-11-13T19:30" (horário de Brasília) → ISO. */
const localDateTime = z
  .string()
  .transform((value, ctx) => {
    const iso = localDateTimeToIso(value);
    if (!iso) {
      ctx.addIssue({ code: 'custom', message: 'Informe data e hora.' });
      return z.NEVER;
    }
    return iso;
  });

const teacherUsername = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, '').toLowerCase())
  .pipe(z.union([usernameSchema, z.literal('')]))
  .optional()
  .transform((value) => value || null);

export const journeyArtSchema = z.object({
  martialArtId: z.uuid('Escolha a modalidade.'),
  startedOn: optionalPastDay('O início não pode ser no futuro.'),
  federation: optional(80, 'Máximo de 80 caracteres.'),
});

export const promotionSchema = z.object({
  userMartialArtId: z.uuid(),
  rankId: z.uuid('Escolha a graduação.'),
  degree: z.coerce.number().int('Grau inválido.').min(0, 'Grau inválido.').max(10, 'Grau inválido.'),
  promotedOn: pastDay('A data da graduação não pode ser no futuro.'),
  academyId: optionalUuid,
  teacherUsername,
  notes: optional(500, 'Máximo de 500 caracteres.'),
});

export const achievementSchema = z
  .object({
    martialArtId: optionalUuid,
    type: z.enum(ACHIEVEMENT_TYPES),
    title: z.string().trim().min(2, 'Dê um título à conquista.').max(120, 'Máximo de 120 caracteres.'),
    eventName: optional(120, 'Máximo de 120 caracteres.'),
    placement: z.union([z.coerce.number().int().min(1, 'Colocação inválida.').max(1000, 'Colocação inválida.'), z.literal('')])
      .optional()
      .transform((value) => (value === '' || value == null ? null : value)),
    medal: z.union([z.enum(MEDALS), z.literal('')]).optional().transform((value) => value || null),
    division: optional(80, 'Máximo de 80 caracteres.'),
    achievedOn: pastDay('A data não pode ser no futuro.'),
    evidenceUrl: https,
  });

export const checkinSchema = z
  .object({
    martialArtId: optionalUuid,
    trainedAt: localDateTime,
    durationMin: z
      .union([z.coerce.number().int().min(5, 'Mínimo de 5 minutos.').max(600, 'Máximo de 600 minutos.'), z.literal('')])
      .optional()
      .transform((value) => (value === '' || value == null ? null : value)),
    notes: optional(500, 'Máximo de 500 caracteres.'),
    academyId: optionalUuid,
    classScheduleId: optionalUuid,
    share: z.boolean(),
    visibility: z.enum(VISIBILITIES).default('followers'),
  })
  .refine((data) => data.martialArtId || data.classScheduleId, { path: ['martialArtId'], error: 'Escolha a modalidade.' })
  .refine((data) => new Date(data.trainedAt).getTime() <= Date.now() + 60 * 60 * 1000, {
    path: ['trainedAt'],
    error: 'O treino não pode ser no futuro.',
  });

export const eventSchema = z
  .object({
    organizer: z.union([z.literal('personal'), z.uuid()], 'Escolha quem organiza.'),
    type: z.enum(EVENT_TYPES),
    martialArtId: optionalUuid,
    title: z.string().trim().min(3, 'Dê um título ao evento.').max(120, 'Máximo de 120 caracteres.'),
    description: optional(5000, 'A descrição pode ter no máximo 5000 caracteres.'),
    startsAt: localDateTime,
    endsAt: localDateTime,
    unitId: optionalUuid,
    venueName: optional(120, 'Máximo de 120 caracteres.'),
    street: optional(120, 'Máximo de 120 caracteres.'),
    number: optional(20, 'Máximo de 20 caracteres.'),
    neighborhood: optional(80, 'Máximo de 80 caracteres.'),
    postalCode: z
      .string()
      .optional()
      .transform((value) => (value ? normalizeCep(value) ?? 'invalid' : null))
      .refine((value) => value !== 'invalid', 'CEP deve ter 8 dígitos.'),
    city: optional(80, 'Máximo de 80 caracteres.'),
    state: z.union([z.enum(BRAZILIAN_STATES), z.literal('')]).optional().transform((value) => value || null),
    externalUrl: https,
    publish: z.boolean(),
  })
  .refine((data) => data.endsAt >= data.startsAt, { path: ['endsAt'], error: 'O fim precisa ser depois do início.' })
  .refine((data) => new Date(data.endsAt).getTime() - new Date(data.startsAt).getTime() <= 31 * 86_400_000, {
    path: ['endsAt'],
    error: 'O evento pode durar no máximo 31 dias.',
  })
  .refine((data) => data.unitId || (data.city && data.city.length >= 2), {
    path: ['city'],
    error: 'Informe a cidade ou escolha uma unidade da academia.',
  })
  .refine((data) => data.unitId || data.state, { path: ['state'], error: 'Escolha o estado.' })
  .refine((data) => !data.unitId || data.organizer !== 'personal', {
    path: ['unitId'],
    error: 'Unidade só para eventos organizados por academia.',
  });

export const JOURNEY_VISIBILITY_KEYS = ['showRanks', 'showAchievements', 'showCheckins'] as const;

export const journeyPrivacySchema = z.object({
  showRanks: z.enum(VISIBILITIES),
  showAchievements: z.enum(VISIBILITIES),
  showCheckins: z.enum(VISIBILITIES),
});
