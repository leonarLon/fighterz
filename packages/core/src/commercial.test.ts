import { describe, expect, it } from 'vitest';
import { formatBrl, parseBrl, parsePlanList, unitAccessSchema } from './index';

describe('valores em reais', () => {
  it.each([
    ['40', 4000],
    ['40,5', 4050],
    ['40,50', 4050],
    ['R$ 35,90', 3590],
    ['1.200,00', 120000],
    ['1200.75', 120075],
    [' R$1.000 ', 100000],
  ])('"%s" vira %i centavos', (input, cents) => {
    expect(parseBrl(input)).toBe(cents);
  });

  it.each(['', 'abc', '40,555', '1,200.00', '-10', '12.34.56', 'R$'])('"%s" é recusado', (input) => {
    expect(parseBrl(input)).toBeNull();
  });

  it('formata no padrão brasileiro', () => {
    expect(formatBrl(4000)).toBe('R$ 40,00');
    expect(formatBrl(120075)).toBe('R$ 1.200,75');
    expect(formatBrl(100)).toBe('R$ 1,00');
  });
});

describe('TotalPass, Wellhub e diária', () => {
  const base = { accepted: true, martialArtIds: [] as string[] };

  it('planos por vírgula ou linha, sem espaços', () => {
    expect(parsePlanList(' Silver, Gold\nPlatinum ,, ')).toEqual(['Silver', 'Gold', 'Platinum']);
  });

  it('TotalPass aceito guarda planos e ignora preço', () => {
    const r = unitAccessSchema.parse({ ...base, kind: 'totalpass', plans: 'Silver, Gold', priceStatus: 'paid', price: '40' });
    expect(r).toMatchObject({ plans: ['Silver', 'Gold'], priceStatus: null, priceCents: null });
  });

  it('planos repetidos, longos demais ou mais de 10 são recusados', () => {
    expect(unitAccessSchema.safeParse({ ...base, kind: 'wellhub', plans: 'Gold, gold' }).success).toBe(false);
    expect(unitAccessSchema.safeParse({ ...base, kind: 'wellhub', plans: 'x'.repeat(41) }).success).toBe(false);
    expect(unitAccessSchema.safeParse({ ...base, kind: 'wellhub', plans: Array.from({ length: 11 }, (_, i) => `P${i}`).join(',') }).success).toBe(false);
  });

  it('diária oferecida precisa dizer o tipo de preço', () => {
    const r = unitAccessSchema.safeParse({ ...base, kind: 'day_pass' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['priceStatus']);
  });

  it('diária paga exige valor válido', () => {
    expect(unitAccessSchema.safeParse({ ...base, kind: 'day_pass', priceStatus: 'paid', price: '' }).success).toBe(false);
    expect(unitAccessSchema.safeParse({ ...base, kind: 'day_pass', priceStatus: 'paid', price: '0,50' }).success).toBe(false);
    expect(unitAccessSchema.safeParse({ ...base, kind: 'day_pass', priceStatus: 'paid', price: '200.000,00' }).success).toBe(false);
    expect(unitAccessSchema.parse({ ...base, kind: 'day_pass', priceStatus: 'paid', price: 'R$ 45,00' }).priceCents).toBe(4500);
  });

  it('gratuita ou não divulgada não guarda valor (nada é inventado)', () => {
    expect(unitAccessSchema.parse({ ...base, kind: 'day_pass', priceStatus: 'free', price: '45' })).toMatchObject({ priceStatus: 'free', priceCents: null });
    expect(unitAccessSchema.parse({ ...base, kind: 'day_pass', priceStatus: 'undisclosed' })).toMatchObject({ priceStatus: 'undisclosed', priceCents: null });
  });

  it('quem não aceita não guarda preço nem modalidades', () => {
    const r = unitAccessSchema.parse({
      kind: 'day_pass', accepted: false, priceStatus: 'paid', price: '40', martialArtIds: ['3f5b8c1e-2d4a-4b6c-8e9f-0a1b2c3d4e5f'],
    });
    expect(r).toMatchObject({ accepted: false, priceStatus: null, priceCents: null, martialArtIds: [] });
  });

  it('campos de texto têm limite e vazio vira null', () => {
    expect(unitAccessSchema.safeParse({ ...base, kind: 'wellhub', restrictions: 'x'.repeat(501) }).success).toBe(false);
    expect(unitAccessSchema.parse({ ...base, kind: 'wellhub', notes: '   ' }).notes).toBeNull();
  });
});
