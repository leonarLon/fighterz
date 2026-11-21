import { z } from 'zod';
import { MAX_IMAGES_PER_POST } from '../domain/media';

export const VISIBILITIES = ['public', 'followers', 'private'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: 'Público',
  followers: 'Só seguidores',
  private: 'Só eu',
};

export const CAPTION_MAX = 2200;
export const COMMENT_MAX = 1000;
export const ALT_TEXT_MAX = 500;

const uuid = z.uuid('Identificador inválido.');

export const postMediaInputSchema = z.object({
  type: z.enum(['image', 'video']).default('image'),
  path: z.string().min(1).max(300),
  thumbnail: z.string().min(1).max(300).optional(),
  durationMs: z.number().int().min(0).max(60_500).optional(),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  size: z.number().int().positive(),
  alt: z.string().trim().max(ALT_TEXT_MAX, `A descrição pode ter no máximo ${ALT_TEXT_MAX} caracteres.`).optional(),
});

export const createPostSchema = z
  .object({
    id: uuid,
    caption: z.string().trim().max(CAPTION_MAX, `A legenda pode ter no máximo ${CAPTION_MAX} caracteres.`),
    visibility: z.enum(VISIBILITIES, 'Escolha quem pode ver.'),
    martialArtId: z.union([uuid, z.literal('')]).optional().transform((value) => value || null),
    locationLabel: z
      .string()
      .trim()
      .max(80, 'O local pode ter no máximo 80 caracteres.')
      .optional()
      .transform((value) => value || null),
    media: z.array(postMediaInputSchema).max(MAX_IMAGES_PER_POST, `Até ${MAX_IMAGES_PER_POST} fotos por post.`),
    /** Publicar como página comercial (marca, loja, serviço). O banco confere se a pessoa gerencia a página. */
    businessId: z.union([uuid, z.literal('')]).optional().transform((value) => value || null),
  })
  .refine((data) => !data.media.some((m) => m.type === 'video') || data.media.length === 1, {
    path: ['media'],
    error: 'Um post com vídeo não pode ter outras mídias.',
  })
  .refine((data) => data.caption.length > 0 || data.media.length > 0, {
    path: ['caption'],
    error: 'Escreva algo ou adicione uma foto.',
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const commentSchema = z.object({
  postId: uuid,
  parentId: z.union([uuid, z.literal('')]).optional().transform((value) => value || null),
  body: z
    .string()
    .trim()
    .min(1, 'Escreva um comentário.')
    .max(COMMENT_MAX, `O comentário pode ter no máximo ${COMMENT_MAX} caracteres.`),
});

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'violence',
  'nudity',
  'minor_safety',
  'impersonation',
  'misinformation',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  minor_safety: 'Envolve segurança de menor de idade',
  harassment: 'Assédio ou bullying',
  violence: 'Violência real (fora do contexto esportivo)',
  nudity: 'Nudez ou conteúdo sexual',
  impersonation: 'Perfil falso ou se passando por alguém',
  spam: 'Spam ou golpe',
  misinformation: 'Informação falsa',
  other: 'Outro motivo',
};

export const REPORT_TARGETS = ['post', 'comment', 'profile', 'academy', 'event'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: uuid,
  reason: z.enum(REPORT_REASONS, 'Escolha um motivo.'),
  details: z
    .string()
    .trim()
    .max(1000, 'Os detalhes podem ter no máximo 1000 caracteres.')
    .optional()
    .transform((value) => value || null),
});
