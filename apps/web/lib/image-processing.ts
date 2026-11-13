import {
  DECODABLE_IMAGE_KINDS,
  IMAGE_QUALITY,
  MAX_ORIGINAL_IMAGE_BYTES,
  detectImageKind,
  fitWithin,
} from "@figtherz/core";

export type PreparedImage = { blob: Blob; width: number; height: number; ext: "webp" | "jpg"; contentType: string };

export class ImageError extends Error {}

/**
 * Valida pela assinatura do arquivo, redimensiona para no máximo 1600 px e reencoda em WebP
 * (JPEG se o navegador não gerar WebP). Reencodar no canvas descarta EXIF, inclusive GPS (ARCHITECTURE.md §6).
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) throw new ImageError(`"${file.name}" passa de 15 MB.`);

  const kind = detectImageKind(new Uint8Array(await file.slice(0, 32).arrayBuffer()));
  if (!kind) throw new ImageError(`"${file.name}" não é uma imagem válida.`);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError(
      DECODABLE_IMAGE_KINDS.includes(kind)
        ? `Não foi possível ler "${file.name}".`
        : `O formato de "${file.name}" não é suportado neste navegador. Exporte como JPEG.`,
    );
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageError("Seu navegador não conseguiu processar a imagem.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await encode("image/webp", IMAGE_QUALITY);
  if (webp && webp.type === "image/webp") return { blob: webp, width, height, ext: "webp", contentType: "image/webp" };

  const jpeg = await encode("image/jpeg", 0.85);
  if (!jpeg) throw new ImageError("Seu navegador não conseguiu processar a imagem.");
  return { blob: jpeg, width, height, ext: "jpg", contentType: "image/jpeg" };
}
