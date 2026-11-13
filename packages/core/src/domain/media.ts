/** Limites de mídia aprovados (PRODUCT_ROADMAP.md, decisão 4): até 10 fotos OU 1 vídeo de até 60 s / 25 MB. */
export const MAX_IMAGES_PER_POST = 10;
export const MAX_ORIGINAL_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;
export const IMAGE_QUALITY = 0.8;
export const POST_MEDIA_BUCKET = 'post-media';
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;

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

export type VideoKind = 'mp4' | 'webm' | 'quicktime';

/** Vídeo pela assinatura: MP4 (caixa ftyp), QuickTime (ftyp qt) e WebM (EBML 1A 45 DF A3). */
export function detectVideoKind(bytes: Uint8Array): VideoKind | null {
  const at = (i: number) => bytes[i] ?? -1;
  const ascii = (start: number, text: string) => [...text].every((ch, i) => at(start + i) === ch.charCodeAt(0));
  if (at(0) === 0x1a && at(1) === 0x45 && at(2) === 0xdf && at(3) === 0xa3) return 'webm';
  if (ascii(4, 'ftyp')) {
    if (ascii(8, 'qt  ')) return 'quicktime';
    if (['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'dash', 'MSNV'].some((brand) => ascii(8, brand))) return 'mp4';
  }
  return null;
}

/** Formatos aceitos sem transcodificação (o navegador toca direto). */
export const ACCEPTED_VIDEO_KINDS: readonly VideoKind[] = ['mp4', 'webm'];

export function videoError(kind: VideoKind | null, sizeBytes: number, durationSeconds: number | null): string | null {
  if (!kind) return 'O arquivo não é um vídeo válido.';
  if (!ACCEPTED_VIDEO_KINDS.includes(kind)) return 'Formato não suportado. Exporte o vídeo como MP4.';
  if (sizeBytes > MAX_VIDEO_BYTES) return 'O vídeo passa de 25 MB.';
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) return 'Não foi possível ler a duração do vídeo.';
  if (durationSeconds > MAX_VIDEO_SECONDS + 0.5) return 'O vídeo pode ter no máximo 60 segundos.';
  return null;
}

/** "0:42" / "1:00" */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Caminho no Storage: {usuário}/{post}/{posição}-{aleatório}.{ext}. A política do bucket exige a 1ª pasta = usuário. */
export function postMediaPath(userId: string, postId: string, position: number, random: string, ext: 'webp' | 'jpg' | 'mp4' | 'webm') {
  return `${userId}/${postId}/${position}-${random}.${ext}`;
}

/**
 * Remove metadados de um MP4 sem reencodar: as caixas `udta` e `meta` dentro de `moov` (onde celulares gravam
 * localização GPS, modelo do aparelho e data) viram `free` com o conteúdo zerado, que os players ignoram. O tamanho do arquivo e os
 * offsets não mudam, então o vídeo continua tocando. Devolve quantas caixas foram neutralizadas.
 */
export function stripMp4Metadata(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const type = (at: number) => String.fromCharCode(bytes[at + 4]!, bytes[at + 5]!, bytes[at + 6]!, bytes[at + 7]!);
  const boxSize = (at: number, end: number) => {
    const size = view.getUint32(at);
    if (size === 1) return Number(view.getBigUint64(at + 8));
    if (size === 0) return end - at;
    return size;
  };
  let stripped = 0;
  const walk = (start: number, end: number, inMoov: boolean) => {
    let at = start;
    while (at + 8 <= end) {
      const size = boxSize(at, end);
      if (size < 8 || at + size > end) return;
      const t = type(at);
      if (inMoov && (t === 'udta' || t === 'meta')) {
        bytes.set([0x66, 0x72, 0x65, 0x65], at + 4); // "free"
        bytes.fill(0, at + 8, at + size); // apaga o conteúdo (GPS etc.), não só esconde
        stripped++;
      } else if (t === 'moov') {
        walk(at + 8, at + size, true);
      } else if (inMoov && t === 'trak') {
        walk(at + 8, at + size, true);
      }
      at += size;
    }
  };
  walk(0, bytes.byteLength, false);
  return stripped;
}
