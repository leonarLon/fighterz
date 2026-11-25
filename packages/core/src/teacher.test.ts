import { describe, expect, it } from 'vitest';
import { teacherMinOrdinal, teacherRankOptions } from './index';

const bjj = [
  { ordinal: 1, name: 'Faixa Branca' },
  { ordinal: 4, name: 'Faixa Marrom' },
  { ordinal: 5, name: 'Faixa Preta' },
  { ordinal: 6, name: 'Faixa Coral (vermelha e preta)' },
];
const capoeira = [
  { ordinal: 7, name: 'Corda Marrom (Instrutor)' },
  { ordinal: 8, name: 'Corda Vermelha (Professor)' },
  { ordinal: 10, name: 'Corda Branca (Mestre)' },
];

describe('critério de professor', () => {
  it('faixa preta é o mínimo e as graduações acima continuam valendo', () => {
    expect(teacherMinOrdinal({ hasRanks: true, teacherMinOrdinal: null }, bjj)).toBe(5);
    expect(teacherRankOptions({ hasRanks: true, teacherMinOrdinal: null }, bjj).map((r) => r.ordinal)).toEqual([5, 6]);
  });

  it('respeita a equivalência configurada (Capoeira)', () => {
    const art = { hasRanks: true, teacherMinOrdinal: 8 };
    expect(teacherRankOptions(art, capoeira).map((r) => r.name)).toEqual(['Corda Vermelha (Professor)', 'Corda Branca (Mestre)']);
  });

  it('sem graduação não exige nada; sem "preta" no nome usa a mais alta', () => {
    expect(teacherMinOrdinal({ hasRanks: false, teacherMinOrdinal: null }, [])).toBeNull();
    expect(teacherRankOptions({ hasRanks: false, teacherMinOrdinal: null }, bjj)).toEqual([]);
    expect(teacherMinOrdinal({ hasRanks: true, teacherMinOrdinal: null }, [{ ordinal: 1, name: 'A' }, { ordinal: 3, name: 'C' }])).toBe(3);
  });
});
