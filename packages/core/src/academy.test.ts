import { describe, expect, it } from 'vitest';
import {
  academySchema,
  classSchema,
  directionsLinks,
  formatAddress,
  groupByWeekday,
  inviteSchema,
  nominatimQuery,
  normalizeCep,
  parseCertifications,
  parseNominatim,
  parseViaCep,
  teacherProfileSchema,
  unitSchema,
} from './index';

const uuid = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('endereço', () => {
  it('normaliza CEP', () => {
    expect(normalizeCep('80020-000')).toBe('80020000');
    expect(normalizeCep('1234')).toBeNull();
  });

  it('formata endereço completo', () => {
    expect(
      formatAddress({ street: 'Rua das Flores', number: '120', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', postal_code: '80020000' }),
    ).toBe('Rua das Flores, 120 - Centro - Curitiba/PR - CEP 80020-000');
  });

  it('interpreta ViaCEP (sucesso e erro)', () => {
    expect(parseViaCep({ cep: '80020-000', logradouro: 'Rua X', bairro: 'Centro', localidade: 'Curitiba', uf: 'PR' })).toEqual({
      street: 'Rua X',
      neighborhood: 'Centro',
      city: 'Curitiba',
      state: 'PR',
      postal_code: '80020000',
    });
    expect(parseViaCep({ erro: true })).toBeNull();
    expect(parseViaCep('lixo')).toBeNull();
  });

  it('interpreta Nominatim e monta busca estruturada', () => {
    expect(parseNominatim([{ lat: '-25.43', lon: '-49.27', display_name: 'Curitiba' }])).toEqual({
      latitude: -25.43,
      longitude: -49.27,
      label: 'Curitiba',
    });
    expect(parseNominatim([])).toBeNull();
    const query = nominatimQuery({ street: 'Rua X', number: '10', city: 'Curitiba', state: 'PR', postal_code: '80020000' });
    expect(query.get('street')).toBe('10 Rua X');
    expect(query.get('countrycodes')).toBe('br');
    expect(query.get('limit')).toBe('1');
  });

  it('gera links de rota sem API', () => {
    const links = directionsLinks({ city: 'Curitiba', state: 'PR', latitude: -25.43, longitude: -49.27 });
    expect(links.android).toBe('geo:-25.43,-49.27?q=-25.43,-49.27');
    expect(links.apple).toContain('maps.apple.com/?daddr=-25.43,-49.27');
    expect(links.osm).toContain('openstreetmap.org/directions?to=-25.43,-49.27');
  });
});

describe('grade', () => {
  it('agrupa de segunda a domingo, por horário', () => {
    const groups = groupByWeekday([
      { weekday: 0, starts_at: '10:00' },
      { weekday: 1, starts_at: '19:00' },
      { weekday: 1, starts_at: '07:00' },
    ]);
    expect(groups[0]?.label).toBe('Segunda');
    expect(groups[0]?.items.map((i) => i.starts_at)).toEqual(['07:00', '19:00']);
    expect(groups[6]?.label).toBe('Domingo');
  });

  it('valida aula', () => {
    const base = { unitId: uuid, martialArtId: uuid, name: 'Iniciante', level: 'beginner', weekday: '1', acceptsTrial: true };
    expect(classSchema.safeParse({ ...base, startsAt: '19:00', endsAt: '18:00' }).success).toBe(false);
    expect(classSchema.parse({ ...base, startsAt: '19:00', endsAt: '20:30', teacherId: '' })).toMatchObject({
      weekday: 1,
      teacherId: null,
      status: 'active',
    });
  });
});

describe('schemas da Fase 4', () => {
  it('certificações em linhas', () => {
    expect(parseCertifications('Faixa preta — Federação X — 2020\n\nCurso Y')).toEqual([
      { title: 'Faixa preta', issuer: 'Federação X', year: 2020 },
      { title: 'Curso Y', issuer: null, year: null },
    ]);
  });

  it('professor: links só https e ao menos uma modalidade', () => {
    const base = { professionalName: 'Prof', showContact: false, martialArts: [{ martialArtId: uuid, rankId: '' }] };
    expect(teacherProfileSchema.safeParse({ ...base, socialLinks: ['http://x.com'] }).success).toBe(false);
    expect(teacherProfileSchema.safeParse({ ...base, socialLinks: [], martialArts: [] }).success).toBe(false);
    expect(teacherProfileSchema.parse({ ...base, socialLinks: ['https://x.com/prof'], contactEmail: '' }).contactEmail).toBeNull();
  });

  it('professor: planos aceitos onde dá aula (opcional, até 500)', () => {
    const base = { professionalName: 'Prof', showContact: false, socialLinks: [], martialArts: [{ martialArtId: uuid, rankId: '' }] };
    expect(teacherProfileSchema.parse({ ...base, accessPlans: '  Tatame aceita TotalPass Gold  ' }).accessPlans).toBe('Tatame aceita TotalPass Gold');
    expect(teacherProfileSchema.parse({ ...base, accessPlans: '' }).accessPlans).toBeNull();
    expect(teacherProfileSchema.safeParse({ ...base, accessPlans: 'x'.repeat(501) }).success).toBe(false);
  });

  it('academia: instagram com ou sem @', () => {
    expect(academySchema.parse({ name: 'Tatame', martialArtIds: [uuid], instagram: '@tatame.demo' }).instagram).toBe('tatame.demo');
  });

  it('unidade: CEP e coordenadas em par', () => {
    const base = { name: 'Sede', city: 'Curitiba', state: 'PR', isActive: true };
    expect(unitSchema.parse({ ...base, postalCode: '80020-000' }).postalCode).toBe('80020000');
    expect(unitSchema.safeParse({ ...base, postalCode: '123' }).success).toBe(false);
    expect(unitSchema.safeParse({ ...base, latitude: -25.4 }).success).toBe(false);
  });

  it('convite aceita @usuario', () => {
    expect(inviteSchema.parse({ username: '@Atleta2', role: 'teacher' }).username).toBe('atleta2');
  });
});
