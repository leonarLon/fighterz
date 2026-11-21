import { z } from 'zod';

// Planos e assinaturas (Fase 6): administrados pela equipe, sem pagamento na plataforma.
export const PLAN_AUDIENCES = ['academy', 'business', 'both'] as const;
export type PlanAudience = (typeof PLAN_AUDIENCES)[number];
export const PLAN_AUDIENCE_LABELS: Record<PlanAudience, string> = {
  academy: 'Academias',
  business: 'Marcas, lojas e serviços',
  both: 'Academias e páginas',
};

export const SUBSCRIPTION_STATUSES = ['active', 'suspended', 'cancelled', 'expired'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Ativa',
  suspended: 'Suspensa',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

/** Benefícios conhecidos. Iguais a public.default_entitlement() no banco. */
export const PLAN_FEATURES = [
  { key: 'gallery_photos', label: 'Fotos na galeria da academia', kind: 'limit', default: 12 },
  { key: 'catalog_items', label: 'Itens no catálogo da página', kind: 'limit', default: 30 },
  { key: 'active_promotions', label: 'Promoções vigentes ou agendadas', kind: 'limit', default: 5 },
  { key: 'featured_listing', label: 'Destaque na listagem', kind: 'flag', default: 0 },
] as const;
export type PlanFeatureKey = (typeof PLAN_FEATURES)[number]['key'];

export const planSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífen. Ex.: academia-destaque')
      .max(60, 'Máximo de 60 caracteres.'),
    name: z.string().trim().min(2, 'Informe o nome.').max(60, 'Máximo de 60 caracteres.'),
    description: z
      .string()
      .trim()
      .max(1000, 'Máximo de 1000 caracteres.')
      .optional()
      .transform((v) => v || null),
    priceLabel: z
      .string()
      .trim()
      .max(60, 'Máximo de 60 caracteres.')
      .optional()
      .transform((v) => v || null),
    audience: z.enum(PLAN_AUDIENCES, 'Escolha para quem é o plano.'),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int('Número inteiro.').min(0).max(1000).default(0),
    features: z.record(z.string(), z.string()),
  })
  .transform((d, ctx) => {
    const features: { key: PlanFeatureKey; value: number }[] = [];
    for (const f of PLAN_FEATURES) {
      const raw = (d.features[f.key] ?? '').trim();
      if (f.kind === 'flag') {
        if (raw === 'on' || raw === '1') features.push({ key: f.key, value: 1 });
        continue;
      }
      if (raw === '') continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 10000) {
        ctx.addIssue({ code: 'custom', path: [`feature-${f.key}`], message: 'Use um número inteiro de 0 a 10000.' });
        continue;
      }
      features.push({ key: f.key, value: n });
    }
    return { ...d, features };
  });

export type PlanInput = z.infer<typeof planSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
const optionalDate = z.union([isoDate, z.literal('')]).optional().transform((v) => v || null);

export const newSubscriptionSchema = z
  .object({
    planId: z.uuid('Escolha o plano.'),
    entityKind: z.enum(['academy', 'business'], 'Escolha academia ou página.'),
    entitySlug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Informe o endereço (slug) da academia ou página. Ex.: tatame-central'),
    startsOn: optionalDate,
    endsOn: optionalDate,
    notes: z
      .string()
      .trim()
      .max(500, 'Máximo de 500 caracteres.')
      .optional()
      .transform((v) => v || null),
  })
  .refine((d) => !d.startsOn || !d.endsOn || d.endsOn >= d.startsOn, { path: ['endsOn'], message: 'O fim não pode ser antes do início.' });

export function subscriptionReasonError(status: SubscriptionStatus, reason: string): string | null {
  if ((status === 'suspended' || status === 'cancelled') && reason.trim().length < 3) return 'Informe o motivo (mínimo 3 caracteres).';
  if (reason.length > 500) return 'Máximo de 500 caracteres.';
  return null;
}
