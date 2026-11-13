import { describe, expect, it } from 'vitest';
import {
  ageOn,
  isAdult,
  parseIsoDate,
  parseThemePreference,
  profileUpdateSchema,
  signUpSchema,
  passwordSchema,
} from './index';

const today = new Date(2026, 10, 13); // 13/11/2026

describe('idade', () => {
  it('rejeita datas inexistentes', () => {
    expect(parseIsoDate('2001-02-29')).toBeNull();
    expect(parseIsoDate('13/11/2000')).toBeNull();
    expect(parseIsoDate('2000-02-29')).not.toBeNull();
  });

  it('calcula idade completa', () => {
    expect(ageOn('2008-11-13', today)).toBe(18);
    expect(ageOn('2008-11-14', today)).toBe(17);
    expect(ageOn('1990-01-01', today)).toBe(36);
  });

  it('só aceita maiores de 18', () => {
    expect(isAdult('2008-11-13', today)).toBe(true);
    expect(isAdult('2008-11-14', today)).toBe(false);
  });
});

describe('senha', () => {
  it('exige 8+ caracteres com letras e números', () => {
    expect(passwordSchema.safeParse('abc123').success).toBe(false);
    expect(passwordSchema.safeParse('somenteletras').success).toBe(false);
    expect(passwordSchema.safeParse('Tatame2026').success).toBe(true);
  });

  it('recusa senhas comuns', () => {
    const result = passwordSchema.safeParse('Password123');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/muito comum/);
  });
});

describe('cadastro', () => {
  const valid = {
    email: '  Atleta@Exemplo.com ',
    password: 'Tatame2026',
    confirmPassword: 'Tatame2026',
    username: 'Atleta_01',
    displayName: ' Atleta ',
    birthDate: '1995-04-10',
    acceptedTerms: true,
  };

  it('normaliza e aceita dados válidos', () => {
    const result = signUpSchema.parse(valid);
    expect(result.email).toBe('atleta@exemplo.com');
    expect(result.username).toBe('atleta_01');
    expect(result.displayName).toBe('Atleta');
  });

  it('recusa menor de idade, termos não aceitos e senhas diferentes', () => {
    const result = signUpSchema.safeParse({
      ...valid,
      birthDate: '2015-01-01',
      acceptedTerms: false,
      confirmPassword: 'outra',
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['birthDate', 'acceptedTerms']));
  });
});

describe('perfil', () => {
  it('converte campos vazios em null', () => {
    const result = profileUpdateSchema.parse({
      username: 'atleta',
      displayName: 'Atleta',
      bio: '   ',
      city: '',
      state: '',
      isPrivate: false,
    });
    expect(result).toMatchObject({ bio: null, city: null, state: null });
  });

  it('recusa UF inválida', () => {
    expect(
      profileUpdateSchema.safeParse({ username: 'atleta', displayName: 'A', state: 'XX', isPrivate: false }).success,
    ).toBe(false);
  });
});

describe('tema', () => {
  it('cai para automático em valor desconhecido', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('roxo')).toBe('system');
    expect(parseThemePreference(undefined)).toBe('system');
  });
});
