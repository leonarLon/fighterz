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

describe('próxima aula (horário de Brasília)', () => {
  // 18:30 em Brasília (21:30 UTC); o dia da semana é calculado no teste.
  const now = new Date('2026-11-25T21:30:00Z');
  it('calcula hoje, amanhã, agora e semana que vem', async () => {
    const { nextClassOccurrence } = await import('./index');
    const local = new Date(now.getTime() - 3 * 3600_000);
    const today = local.getUTCDay();
    const tomorrow = (today + 1) % 7;
    expect(nextClassOccurrence({ weekday: today, starts_at: '19:00:00', ends_at: '20:30:00' }, now)).toEqual({ inMinutes: 30, happeningNow: false, label: 'Hoje, 19:00' });
    expect(nextClassOccurrence({ weekday: today, starts_at: '18:00', ends_at: '19:30' }, now).label).toBe('Agora');
    expect(nextClassOccurrence({ weekday: tomorrow, starts_at: '07:00', ends_at: '08:00' }, now).label).toBe('Amanhã, 07:00');
    const past = nextClassOccurrence({ weekday: today, starts_at: '07:00', ends_at: '08:00' }, now);
    expect(past.inMinutes).toBe(7 * 1440 + 420 - 1110);
    expect(past.label).toMatch(/^[A-Z][a-zá]{2}, 07:00$/);
  });

  it('ordena pela próxima ocorrência', async () => {
    const { sortByNextOccurrence } = await import('./index');
    const local = new Date(now.getTime() - 3 * 3600_000);
    const today = local.getUTCDay();
    const sorted = sortByNextOccurrence(
      [
        { id: 'semana', weekday: today, starts_at: '07:00', ends_at: '08:00' },
        { id: 'hoje', weekday: today, starts_at: '20:00', ends_at: '21:00' },
        { id: 'amanha', weekday: (today + 1) % 7, starts_at: '06:00', ends_at: '07:00' },
      ],
      now,
    ).map((s) => s.item.id);
    expect(sorted).toEqual(['hoje', 'amanha', 'semana']);
  });
});
