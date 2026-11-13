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

/** Foto de perfil: recorte quadrado central, 400 px, WebP (sem EXIF/GPS, como as fotos dos posts). */
export async function prepareAvatar(file: File): Promise<PreparedImage> {
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) throw new ImageError("A foto passa de 15 MB.");
  const kind = detectImageKind(new Uint8Array(await file.slice(0, 32).arrayBuffer()));
  if (!kind) throw new ImageError("O arquivo não é uma imagem válida.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("Não foi possível ler a foto. Tente JPEG ou PNG.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(400, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageError("Seu navegador não conseguiu processar a foto.");
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (blob && blob.type === "image/webp") return { blob, width: size, height: size, ext: "webp", contentType: "image/webp" };
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!jpeg) throw new ImageError("Seu navegador não conseguiu processar a foto.");
  return { blob: jpeg, width: size, height: size, ext: "jpg", contentType: "image/jpeg" };
}
