import { describe, expect, it } from 'vitest';
import {
  achievementSchema,
  checkinSchema,
  degreeOptions,
  eventSchema,
  formatEventRange,
  isoToLocalDateTime,
  isValidDegree,
  localDateTimeToIso,
  monthGrid,
  promotionSchema,
  rankLabel,
  shiftMonth,
} from './index';

const uuid = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('graduações', () => {
  it('limita graus ao máximo da faixa (BJJ azul = 4, coral = 0)', () => {
    expect(degreeOptions(4)).toEqual([0, 1, 2, 3, 4]);
    expect(degreeOptions(0)).toEqual([0]);
    expect(isValidDegree(4, 4)).toBe(true);
    expect(isValidDegree(5, 4)).toBe(false);
    expect(isValidDegree(1, 0)).toBe(false);
    expect(isValidDegree(1.5, 4)).toBe(false);
  });

  it('monta o rótulo da graduação', () => {
    expect(rankLabel('Faixa Azul', 2)).toBe('Faixa Azul · 2 graus');
    expect(rankLabel('Faixa Preta', 1)).toBe('Faixa Preta · 1 grau');
    expect(rankLabel('Faixa Branca', 0)).toBe('Faixa Branca');
    expect(rankLabel(null, 0)).toBe('Sem graduação');
  });

  it('valida a promoção', () => {
    const ok = promotionSchema.safeParse({ userMartialArtId: uuid, rankId: uuid, degree: '3', promotedOn: '2024-05-01', teacherUsername: '@Mestre_X' });
    expect(ok.success && ok.data.degree === 3 && ok.data.teacherUsername === 'mestre_x').toBe(true);
    expect(promotionSchema.safeParse({ userMartialArtId: uuid, rankId: uuid, degree: '0', promotedOn: '2999-01-01' }).success).toBe(false);
  });
});

describe('datas e fuso', () => {
  it('converte datetime-local de Brasília para ISO e volta', () => {
    expect(localDateTimeToIso('2026-11-13T19:30')).toBe('2026-11-13T22:30:00.000Z');
    expect(localDateTimeToIso('13/11/2026')).toBeNull();
    expect(isoToLocalDateTime('2026-11-13T22:30:00.000Z')).toBe('2026-11-13T19:30');
  });

  it('formata o período do evento', () => {
    expect(formatEventRange('2026-11-14T12:00:00Z', '2026-11-14T15:00:00Z')).toMatch(/09:00–12:00$/);
    expect(formatEventRange('2026-11-14T12:00:00Z', '2026-11-15T15:00:00Z')).toContain(' até ');
  });

  it('monta a grade do mês começando na segunda', () => {
    const weeks = monthGrid('2026-11', ['2026-11-13', '2026-11-13', '2026-11-02']);
    expect(weeks[0]![0]!.day).toBe('2026-10-26'); // 1/11/2026 é domingo
    expect(weeks.flat().find((d) => d.day === '2026-11-13')!.count).toBe(2);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(30);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('formulários', () => {
  it('check-in precisa de modalidade ou aula e não pode ser futuro', () => {
    expect(checkinSchema.safeParse({ trainedAt: '2026-01-10T19:00', share: false }).success).toBe(false);
    expect(checkinSchema.safeParse({ martialArtId: uuid, trainedAt: '2026-01-10T19:00', share: true, durationMin: '90' }).success).toBe(true);
    expect(checkinSchema.safeParse({ martialArtId: uuid, trainedAt: '2999-01-10T19:00', share: false }).success).toBe(false);
  });

  it('conquista com colocação opcional', () => {
    const r = achievementSchema.safeParse({ type: 'competition_result', title: 'Campeão', achievedOn: '2024-08-10', placement: '' });
    expect(r.success && r.data.placement === null).toBe(true);
  });

  it('evento exige local e ordem das datas', () => {
    const base = { organizer: 'personal', type: 'seminar', title: 'Seminário', startsAt: '2030-01-10T10:00', endsAt: '2030-01-10T12:00', publish: true };
    expect(eventSchema.safeParse({ ...base, city: 'Curitiba', state: 'PR' }).success).toBe(true);
    expect(eventSchema.safeParse(base).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, city: 'Curitiba', state: 'PR', endsAt: '2030-01-09T12:00' }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, unitId: uuid }).success).toBe(false); // unidade só para academia
    expect(eventSchema.safeParse({ ...base, organizer: uuid, unitId: uuid }).success).toBe(true);
  });
});
