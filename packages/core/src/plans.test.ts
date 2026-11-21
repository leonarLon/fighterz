import { describe, expect, it } from 'vitest';
import { PLAN_FEATURES, newSubscriptionSchema, planSchema, subscriptionReasonError } from './index';

const base = { slug: 'academia-destaque', name: 'Academia Destaque', audience: 'academy', isActive: true, sortOrder: '1', features: {} };

describe('plano', () => {
  it('benefícios: números, caixas e vazio = padrão', () => {
    const plan = planSchema.parse({ ...base, features: { gallery_photos: '40', catalog_items: '', featured_listing: 'on' } });
    expect(plan.features).toEqual([
      { key: 'gallery_photos', value: 40 },
      { key: 'featured_listing', value: 1 },
    ]);
  });

  it('recusa benefício inválido e slug fora do formato', () => {
    expect(planSchema.safeParse({ ...base, features: { gallery_photos: '-1' } }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, features: { gallery_photos: '2.5' } }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, slug: 'Plano Bom!' }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, audience: 'teacher' }).success).toBe(false);
  });

  it('preço é só texto de referência', () => {
    expect(planSchema.parse({ ...base, priceLabel: '  R$ 49/mês  ' }).priceLabel).toBe('R$ 49/mês');
    expect(planSchema.parse({ ...base, priceLabel: '' }).priceLabel).toBeNull();
  });

  it('benefícios do core batem com o banco (default_entitlement)', () => {
    expect(Object.fromEntries(PLAN_FEATURES.map((f) => [f.key, f.default]))).toEqual({
      gallery_photos: 12,
      catalog_items: 30,
      active_promotions: 5,
      featured_listing: 0,
    });
  });
});

describe('assinatura', () => {
  const sub = { planId: '7c9e6679-7425-40de-944b-e07fc1f90ae7', entityKind: 'academy', entitySlug: 'Tatame-Central' };
  it('normaliza o slug e valida datas', () => {
    expect(newSubscriptionSchema.parse(sub).entitySlug).toBe('tatame-central');
    expect(newSubscriptionSchema.safeParse({ ...sub, startsOn: '2026-12-10', endsOn: '2026-12-01' }).success).toBe(false);
    expect(newSubscriptionSchema.safeParse({ ...sub, planId: '' }).success).toBe(false);
  });

  it('motivo obrigatório para suspender e cancelar', () => {
    expect(subscriptionReasonError('suspended', ' ')).not.toBeNull();
    expect(subscriptionReasonError('cancelled', 'ok')).not.toBeNull();
    expect(subscriptionReasonError('cancelled', 'Pedido do dono')).toBeNull();
    expect(subscriptionReasonError('active', '')).toBeNull();
  });
});
