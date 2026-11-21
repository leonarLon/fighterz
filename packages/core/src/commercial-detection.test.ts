import { describe, expect, it } from 'vitest';
import { commercialRisk, commercialScore, detectCommercialSignals } from './index';

// Mesmos casos de supabase/tests/database/25_commercial_detection.test.sql (o banco é a fonte da verdade).
const CASES: [string, number][] = [
  ['Treino pesado hoje no tatame, rolamos 6 rounds!', 0],
  ['Promoção de faixa! Agora sou faixa roxa', 0],
  ['Vendo o treino da galera hoje, que luta!', 0],
  ['Academia aceita TotalPass e Wellhub, plano Gold', 0],
  ['Kimono novo por R$ 299, chama no direct! Cupom TATAME10', 65],
  ['Compre já: https://shopee.com.br/kimono-a1 frete grátis', 50],
  ['Encomendas abertas, whats (41) 99999-1234', 30],
  ['Link na bio, 20% off só hoje', 45],
  ['wa.me/5541999991234 pronta entrega', 50],
];

describe('detecção comercial (regras explicáveis)', () => {
  it.each(CASES)('"%s" → %i pontos', (text, score) => {
    expect(commercialScore(text)).toBe(score);
  });

  it('cada ponto tem código e trecho', () => {
    const signals = detectCommercialSignals('Kimono novo por R$ 299, chama no direct! Cupom TATAME10');
    expect(signals.map((s) => [s.code, s.points, s.excerpt])).toEqual([
      ['coupon', 25, 'cupom'],
      ['price', 20, 'r$ 299,'],
      ['sales_call', 20, 'chama no direct'],
    ]);
  });

  it('contexto pessoal não vale quando há link de loja', () => {
    const codes = detectCommercialSignals('Treino top com o kimono da https://loja.exemplo.com/kimono').map((s) => s.code);
    expect(codes).toContain('shop_link');
    expect(codes).not.toContain('personal_context');
  });

  it('texto vazio não pontua', () => {
    expect(detectCommercialSignals('')).toEqual([]);
    expect(commercialScore(null)).toBe(0);
  });

  it('risco do perfil: um post comercial sozinho não abre revisão; dois abrem', () => {
    expect(commercialRisk([65], 0)).toBe(52);
    expect(commercialRisk([65, 50], 0)).toBe(72);
    expect(commercialRisk([100], 0)).toBe(70);
    expect(commercialRisk([], 50)).toBe(25);
    expect(commercialRisk([65, 65, 65, 65], 50)).toBe(100);
  });
});
