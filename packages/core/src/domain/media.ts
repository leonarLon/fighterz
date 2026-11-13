/** Limites de mídia aprovados (PRODUCT_ROADMAP.md, decisão 4). Vídeo fica fora do MVP. */
export const MAX_IMAGES_PER_POST = 10;
export const MAX_ORIGINAL_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;
export const IMAGE_QUALITY = 0.8;
export const POST_MEDIA_BUCKET = 'post-media';

export type ImageKind = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic';

/**
 * Detecta o formato pela assinatura do arquivo (magic bytes), não pela extensão nem pelo MIME
 * informado pelo navegador (SECURITY.md §4: upload malicioso).
 */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  const at = (i: number) => bytes[i] ?? -1;
  const ascii = (start: number, text: string) => [...text].every((ch, i) => at(start + i) === ch.charCodeAt(0));

  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
  if (at(0) === 0x89 && ascii(1, 'PNG') && at(4) === 0x0d && at(5) === 0x0a) return 'png';
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'webp';
  if (ascii(0, 'GIF87a') || ascii(0, 'GIF89a')) return 'gif';
  if (ascii(4, 'ftyp') && (ascii(8, 'heic') || ascii(8, 'heix') || ascii(8, 'mif1') || ascii(8, 'heif'))) return 'heic';
  return null;
}

/** Formatos que o navegador consegue decodificar para reencodar (HEIC depende do navegador). */
export const DECODABLE_IMAGE_KINDS: readonly ImageKind[] = ['jpeg', 'png', 'webp', 'gif'];

/** Dimensões finais mantendo a proporção, sem ampliar. */
export function fitWithin(width: number, height: number, max: number = MAX_IMAGE_DIMENSION) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Caminho no Storage: {usuário}/{post}/{posição}-{aleatório}.{ext}. A política do bucket exige a 1ª pasta = usuário. */
export function postMediaPath(userId: string, postId: string, position: number, random: string, ext: 'webp' | 'jpg') {
  return `${userId}/${postId}/${position}-${random}.${ext}`;
}
