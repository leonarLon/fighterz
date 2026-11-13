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

import { detectVideoKind, formatDuration, videoError } from './index';

describe('vídeo', () => {
  const bytes = (...parts: (number[] | string)[]) =>
    new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));

  it('detecta pela assinatura', () => {
    expect(detectVideoKind(bytes([0x1a, 0x45, 0xdf, 0xa3, 0, 0]))).toBe('webm');
    expect(detectVideoKind(bytes([0, 0, 0, 0x20], 'ftypisom'))).toBe('mp4');
    expect(detectVideoKind(bytes([0, 0, 0, 0x14], 'ftypqt  '))).toBe('quicktime');
    expect(detectVideoKind(bytes('RIFF....WEBP'))).toBeNull();
  });

  it('aplica os limites aprovados', () => {
    expect(videoError('mp4', 10_000_000, 42)).toBeNull();
    expect(videoError('quicktime', 1000, 10)).toContain('MP4');
    expect(videoError('webm', 26 * 1024 * 1024, 10)).toContain('25 MB');
    expect(videoError('mp4', 1000, 61)).toContain('60 segundos');
    expect(videoError(null, 1000, 10)).toContain('não é um vídeo');
    expect(formatDuration(42_400)).toBe('0:42');
    expect(formatDuration(60_000)).toBe('1:00');
  });
});

import { stripMp4Metadata } from './index';

describe('metadados de vídeo', () => {
  const box = (type: string, payload: number[] = []) => {
    const size = 8 + payload.length;
    return [(size >>> 24) & 255, (size >>> 16) & 255, (size >>> 8) & 255, size & 255, ...[...type].map((c) => c.charCodeAt(0)), ...payload];
  };
  it('neutraliza udta/meta (GPS) dentro de moov sem mudar o tamanho', () => {
    const gps = [...'+25.43-049.27/'].map((c) => c.charCodeAt(0));
    const file = new Uint8Array([
      ...box('ftyp', [...'isom'].map((c) => c.charCodeAt(0))),
      ...box('moov', [...box('mvhd', [0, 0, 0, 0]), ...box('udta', box('©xyz', gps)), ...box('trak', box('meta', [1, 2]))]),
      ...box('mdat', [9, 9, 9]),
    ]);
    const before = file.length;
    expect(stripMp4Metadata(file)).toBe(2);
    expect(file.length).toBe(before);
    const text = String.fromCharCode(...file);
    expect(text).not.toContain('udta');
    expect(text).not.toContain('+25.43');
    expect(text).toContain('mdat');
    expect(text).toContain('mvhd');
  });
});
