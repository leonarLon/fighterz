import { describe, expect, it } from 'vitest';
import { businessPromotionSchema, businessSchema, catalogItemSchema, coverPathPattern, newBusinessSchema } from './index';

const uuid = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('página comercial', () => {
  it('nova página exige nome e tipo', () => {
    expect(newBusinessSchema.parse({ name: '  Loja Faixa  ', category: 'store' })).toEqual({ name: 'Loja Faixa', category: 'store' });
    expect(newBusinessSchema.safeParse({ name: 'Loja', category: '' }).success).toBe(false);
    expect(newBusinessSchema.safeParse({ name: 'L', category: 'brand' }).success).toBe(false);
  });

  it('dados: links https, instagram sem @, estado e campos vazios viram nulo', () => {
    const d = businessSchema.parse({
      name: 'Fisio Luta',
      category: 'service',
      description: '',
      website: 'https://fisio.example',
      instagram: '@fisio.luta',
      contactEmail: '',
      contactPhone: '(11) 99999-0000',
      city: '',
      state: 'SP',
    });
    expect(d).toMatchObject({ description: null, website: 'https://fisio.example', instagram: 'fisio.luta', contactEmail: null, city: null, state: 'SP', martialArtIds: [] });
    expect(businessSchema.safeParse({ name: 'X Loja', category: 'store', website: 'http://inseguro.com' }).success).toBe(false);
    expect(businessSchema.safeParse({ name: 'X Loja', category: 'store', state: 'XX' }).success).toBe(false);
    expect(businessSchema.safeParse({ name: 'X Loja', category: 'store', martialArtIds: Array(13).fill(uuid) }).success).toBe(false);
  });
});

describe('catálogo', () => {
  const base = { kind: 'product', name: 'Kimono A2', isActive: true };

  it('preço pago exige valor válido; gratuito e não divulgado não guardam valor', () => {
    expect(catalogItemSchema.parse({ ...base, priceStatus: 'paid', price: '449,90' })).toMatchObject({ priceStatus: 'paid', priceCents: 44990 });
    expect(catalogItemSchema.parse({ ...base, priceStatus: 'free', price: '10' })).toMatchObject({ priceStatus: 'free', priceCents: null });
    expect(catalogItemSchema.parse({ ...base, priceStatus: 'undisclosed' })).toMatchObject({ priceCents: null });
    expect(catalogItemSchema.safeParse({ ...base, priceStatus: 'paid', price: '' }).success).toBe(false);
    expect(catalogItemSchema.safeParse({ ...base, priceStatus: 'paid', price: '0,50' }).success).toBe(false);
    expect(catalogItemSchema.safeParse({ ...base, priceStatus: '' }).success).toBe(false);
  });

  it('link opcional precisa de https', () => {
    expect(catalogItemSchema.parse({ ...base, priceStatus: 'free', url: '' }).url).toBeNull();
    expect(catalogItemSchema.safeParse({ ...base, priceStatus: 'free', url: 'javascript:alert(1)' }).success).toBe(false);
  });
});

describe('promoção', () => {
  it('cupom em maiúsculas, datas coerentes', () => {
    const p = businessPromotionSchema.parse({ title: 'Semana do faixa branca', couponCode: 'tatame10', startsOn: '2026-11-20', endsOn: '2026-12-20' });
    expect(p.couponCode).toBe('TATAME10');
    expect(businessPromotionSchema.parse({ title: 'Sem fim', startsOn: '2026-11-20', endsOn: '' }).endsOn).toBeNull();
    expect(businessPromotionSchema.safeParse({ title: 'Datas trocadas', startsOn: '2026-11-20', endsOn: '2026-11-19' }).success).toBe(false);
    expect(businessPromotionSchema.safeParse({ title: 'Cupom ruim', couponCode: 'com espaço', startsOn: '2026-11-20' }).success).toBe(false);
  });
});

describe('caminhos do bucket covers (iguais aos checks do banco)', () => {
  it('aceita só a pasta e o slot da entidade', () => {
    expect(coverPathPattern('academy', uuid, 'logo').test(`academy/${uuid}/logo-abc123.webp`)).toBe(true);
    expect(coverPathPattern('academy', uuid, 'logo').test(`academy/${uuid}/banner-abc123.webp`)).toBe(false);
    expect(coverPathPattern('business', uuid, 'gallery').test(`academy/${uuid}/gallery-abc123.webp`)).toBe(false);
    expect(coverPathPattern('business', uuid, 'banner').test(`business/${uuid}/banner-abc123.png`)).toBe(false);
    expect(coverPathPattern('business', uuid, 'banner').test(`business/${uuid}/banner-../../x.webp`)).toBe(false);
  });
});
