import { describe, expect, it } from 'vitest';
import { commentSchema, createPostSchema, detectImageKind, fitWithin, reportSchema, segmentText, timeAgo } from './index';

const id = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('segmentText', () => {
  it('só transforma em link as marcações aprovadas', () => {
    expect(segmentText('Treino com @ana e @beto!', ['ana'])).toEqual([
      { type: 'text', value: 'Treino com ' },
      { type: 'mention', value: '@ana', username: 'ana' },
      { type: 'text', value: ' e @beto!' },
    ]);
  });

  it('não confunde e-mail com marcação e separa links sem a pontuação final', () => {
    expect(segmentText('fale@ana.com', ['ana'])).toEqual([{ type: 'text', value: 'fale@ana.com' }]);
    expect(segmentText('Veja https://exemplo.com/a.')).toEqual([
      { type: 'text', value: 'Veja ' },
      { type: 'link', value: 'https://exemplo.com/a', href: 'https://exemplo.com/a' },
      { type: 'text', value: '.' },
    ]);
  });
});

describe('detectImageKind', () => {
  it('reconhece pelos bytes, não pela extensão', () => {
    expect(detectImageKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(detectImageKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
    expect(detectImageKind(webp)).toBe('webp');
    // executável renomeado para .jpg
    expect(detectImageKind(new TextEncoder().encode('MZ\x90\0\x03'))).toBeNull();
  });
});

describe('fitWithin', () => {
  it('reduz mantendo a proporção e nunca amplia', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('schemas sociais', () => {
  it('post precisa de texto ou foto', () => {
    expect(createPostSchema.safeParse({ id, caption: '  ', visibility: 'public', media: [] }).success).toBe(false);
    expect(createPostSchema.parse({ id, caption: 'Oss!', visibility: 'followers', media: [], martialArtId: '' }))
      .toMatchObject({ caption: 'Oss!', martialArtId: null, locationLabel: null });
  });

  it('limita a 10 fotos', () => {
    const media = Array.from({ length: 11 }, (_, i) => ({ path: `u/p/${i}.webp`, width: 10, height: 10, size: 1 }));
    expect(createPostSchema.safeParse({ id, caption: '', visibility: 'public', media }).success).toBe(false);
  });

  it('comentário e denúncia', () => {
    expect(commentSchema.safeParse({ postId: id, body: '   ' }).success).toBe(false);
    expect(reportSchema.parse({ targetType: 'post', targetId: id, reason: 'spam', details: '' }).details).toBeNull();
  });
});

describe('timeAgo', () => {
  it('formata em pt-BR', () => {
    const now = new Date('2026-11-13T12:00:00Z');
    expect(timeAgo('2026-11-13T11:59:30Z', now)).toBe('agora');
    expect(timeAgo('2026-11-13T09:00:00Z', now)).toBe('há 3 horas');
    expect(timeAgo('2026-11-12T12:00:00Z', now)).toBe('ontem');
  });
});
