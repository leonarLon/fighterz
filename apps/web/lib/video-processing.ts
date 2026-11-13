import { IMAGE_QUALITY, detectVideoKind, fitWithin, stripMp4Metadata, videoError } from "@figtherz/core";

export type PreparedVideo = {
  file: File;
  ext: "mp4" | "webm";
  contentType: "video/mp4" | "video/webm";
  width: number;
  height: number;
  durationMs: number;
  poster: Blob | null;
};

export class VideoError extends Error {}

/** Lê metadados e o primeiro quadro num <video> fora da tela. Nada sai do aparelho até o upload. */
function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new VideoError("Não foi possível ler o vídeo neste navegador. Exporte como MP4 (H.264)."));
    video.src = url;
  });
}

async function duration(video: HTMLVideoElement): Promise<number> {
  // WebM gravado no navegador às vezes informa Infinity até buscar o fim do arquivo.
  if (Number.isFinite(video.duration)) return video.duration;
  return new Promise((resolve) => {
    video.ontimeupdate = () => {
      video.ontimeupdate = null;
      resolve(video.duration);
      video.currentTime = 0;
    };
    video.currentTime = 1e9;
  });
}

async function capturePoster(video: HTMLVideoElement): Promise<Blob | null> {
  try {
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject();
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    });
    const { width, height } = fitWithin(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", IMAGE_QUALITY));
  } catch {
    return null; // Sem miniatura o vídeo ainda funciona (o navegador mostra o primeiro quadro ao tocar).
  }
}

/** Valida assinatura, tamanho e duração (até 60 s / 25 MB), gera a miniatura e remove metadados do MP4. Sem transcodificar. */
export async function prepareVideo(file: File): Promise<PreparedVideo> {
  const kind = detectVideoKind(new Uint8Array(await file.slice(0, 32).arrayBuffer()));
  const early = videoError(kind, file.size, 0);
  if (early) throw new VideoError(early);

  const url = URL.createObjectURL(file);
  try {
    const video = await loadVideo(url);
    const seconds = await duration(video);
    const error = videoError(kind, file.size, seconds);
    if (error) throw new VideoError(error);
    const poster = await capturePoster(video);
    // MP4 de celular guarda GPS nos metadados: zera essas caixas antes do upload (sem reencodar).
    let clean = file;
    if (kind === "mp4") {
      const bytes = new Uint8Array(await file.arrayBuffer());
      stripMp4Metadata(bytes);
      clean = new File([bytes], file.name, { type: "video/mp4" });
    }
    return {
      file: clean,
      ext: kind === "webm" ? "webm" : "mp4",
      contentType: kind === "webm" ? "video/webm" : "video/mp4",
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720,
      durationMs: Math.round(seconds * 1000),
      poster,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
