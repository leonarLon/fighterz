"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, ImagePlus, X } from "lucide-react";
import {
  CAPTION_MAX,
  MAX_IMAGES_PER_POST,
  POST_MEDIA_BUCKET,
  VISIBILITIES,
  VISIBILITY_LABELS,
  postMediaPath,
} from "@figtherz/core";
import { createPost } from "@/app/actions/posts";
import { createClient } from "@/lib/supabase/client";
import { ImageError, prepareImage } from "@/lib/image-processing";
import { VideoError, prepareVideo } from "@/lib/video-processing";
import { Button } from "@/components/ui/button";
import { FieldShell, InputField, SelectField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";

type Draft = { key: string; file: File; preview: string; alt: string; kind: "image" | "video" };

export function Composer({
  userId,
  martialArts,
  pages = [],
}: {
  userId: string;
  martialArts: { id: string; name: string }[];
  pages?: { id: string; name: string }[];
}) {
  const [businessId, setBusinessId] = useState("");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const altHelpId = useId();
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>("public");
  const [martialArtId, setMartialArtId] = useState("");
  const [location, setLocation] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [status, setStatus] = useState<{ kind: "idle" | "error" | "success"; message?: string }>({ kind: "idle" });
  const [progress, setProgress] = useState("");
  const busy = progress !== "";

  useEffect(() => () => drafts.forEach((d) => URL.revokeObjectURL(d.preview)), [drafts]);

  const hasVideo = drafts.some((d) => d.kind === "video");

  function addVideo(files: FileList | null) {
    const file = files?.[0];
    if (videoInput.current) videoInput.current.value = "";
    if (!file) return;
    if (drafts.length > 0) {
      setStatus({ kind: "error", message: "Um post tem até 10 fotos ou um vídeo. Remova as fotos para enviar um vídeo." });
      return;
    }
    setStatus({ kind: "idle" });
    setDrafts([{ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), alt: "", kind: "video" }]);
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES_PER_POST - drafts.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setStatus({ kind: "error", message: `Até ${MAX_IMAGES_PER_POST} fotos por post.` });
    setDrafts((current) => [
      ...current,
      ...picked.map((file) => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), alt: "", kind: "image" as const })),
    ]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!caption.trim() && drafts.length === 0) {
      setStatus({ kind: "error", message: "Escreva algo ou adicione uma foto ou vídeo." });
      return;
    }
    setStatus({ kind: "idle" });
    const postId = crypto.randomUUID();
    const supabase = createClient();
    const media = [];
    const uploaded: string[] = [];

    try {
      for (const [position, draft] of drafts.entries()) {
        if (draft.kind === "video") {
          setProgress("Conferindo o vídeo…");
          const video = await prepareVideo(draft.file);
          const random = crypto.randomUUID().slice(0, 8);
          const path = postMediaPath(userId, postId, 0, random, video.ext);
          setProgress("Enviando o vídeo…");
          const { error } = await supabase.storage
            .from(POST_MEDIA_BUCKET)
            .upload(path, video.file, { contentType: video.contentType, upsert: false });
          if (error) throw new VideoError("Falha ao enviar o vídeo. Verifique sua conexão e tente de novo.");
          uploaded.push(path);
          let thumbnail: string | undefined;
          if (video.poster) {
            const posterPath = `${userId}/${postId}/0-${random}-poster.webp`;
            const { error: posterError } = await supabase.storage
              .from(POST_MEDIA_BUCKET)
              .upload(posterPath, video.poster, { contentType: "image/webp", upsert: false });
            if (!posterError) {
              thumbnail = posterPath;
              uploaded.push(posterPath);
            }
          }
          media.push({
            type: "video" as const,
            path,
            thumbnail,
            durationMs: video.durationMs,
            width: video.width,
            height: video.height,
            size: video.file.size,
            alt: draft.alt.trim(),
          });
          continue;
        }
        setProgress(`Otimizando foto ${position + 1} de ${drafts.length}…`);
        const image = await prepareImage(draft.file);
        const random = crypto.randomUUID().slice(0, 8);
        const path = postMediaPath(userId, postId, position, random, image.ext);
        setProgress(`Enviando foto ${position + 1} de ${drafts.length}…`);
        const { error } = await supabase.storage
          .from(POST_MEDIA_BUCKET)
          .upload(path, image.blob, { contentType: image.contentType, upsert: false });
        if (error) throw new ImageError("Falha ao enviar a foto. Verifique sua conexão e tente de novo.");
        uploaded.push(path);
        media.push({ type: "image" as const, path, width: image.width, height: image.height, size: image.blob.size, alt: draft.alt.trim() });
      }

      setProgress("Publicando…");
      const result = await createPost({
        id: postId,
        caption,
        visibility,
        martialArtId,
        locationLabel: location,
        media,
        businessId,
      });
      if (!result.ok) throw new ImageError(result.message);
      router.push(`/p/${result.id}`);
    } catch (error) {
      // Arquivos já enviados de um post que falhou: remove para não deixar órfãos.
      if (uploaded.length) await supabase.storage.from(POST_MEDIA_BUCKET).remove(uploaded);
      setStatus({
        kind: "error",
        message: error instanceof ImageError || error instanceof VideoError ? error.message : "Não foi possível publicar.",
      });
      setProgress("");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormMessage status={status.kind} message={status.message} />

      <FieldShell id="caption" label="Legenda" help={`Marque pessoas com @usuario. ${caption.length}/${CAPTION_MAX}`}>
        <textarea
          id="caption"
          name="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={CAPTION_MAX}
          rows={4}
          placeholder="Como foi o treino?"
          aria-describedby="caption-help"
          className="block min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2"
        />
      </FieldShell>

      <div>
        <p className="mb-2 text-sm font-semibold">
          {hasVideo ? (
            "Vídeo"
          ) : (
            <>
              Fotos ou vídeo <span className="font-normal text-muted">({drafts.length}/{MAX_IMAGES_PER_POST} fotos)</span>
            </>
          )}
        </p>
        {drafts.length > 0 && (
          <ul className="mb-3 space-y-3">
            {drafts.map((draft, i) => (
              <li key={draft.key} className="flex gap-3 rounded-md border border-border p-2">
                {/* Pré-visualização local (blob:), antes do upload. */}
                {draft.kind === "video" ? (
                  <video src={draft.preview} muted playsInline preload="metadata" aria-hidden className="size-20 shrink-0 rounded-sm bg-black object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.preview} alt="" className="size-20 shrink-0 rounded-sm object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <label htmlFor={`alt-${draft.key}`} className="block text-[13px] font-semibold">
                    {draft.kind === "video" ? "Descrição do vídeo" : `Descrição da foto ${i + 1}`}
                  </label>
                  <input
                    id={`alt-${draft.key}`}
                    value={draft.alt}
                    maxLength={500}
                    aria-describedby={altHelpId}
                    onChange={(e) =>
                      setDrafts((list) => list.map((d) => (d.key === draft.key ? { ...d, alt: e.target.value } : d)))
                    }
                    className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface px-3"
                  />
                </div>
                <button
                  type="button"
                  aria-label={draft.kind === "video" ? "Remover vídeo" : `Remover foto ${i + 1}`}
                  onClick={() => setDrafts((list) => list.filter((d) => d.key !== draft.key))}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:text-text"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p id={altHelpId} className="sr-only">
          Descreva a foto para quem usa leitor de tela.
        </p>
        <input
          ref={fileInput}
          id="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
          multiple
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
          disabled={drafts.length >= MAX_IMAGES_PER_POST || hasVideo || busy}
        />
        <input
          ref={videoInput}
          id="video"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="sr-only"
          onChange={(e) => addVideo(e.target.files)}
          disabled={drafts.length > 0 || busy}
        />
        <label
          htmlFor="photos"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 font-semibold hover:bg-bg has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
        >
          <ImagePlus aria-hidden className="size-5" /> Adicionar fotos
        </label>
        <label
          htmlFor="video"
          className="ml-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 font-semibold hover:bg-bg has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
        >
          <Film aria-hidden className="size-5" /> Adicionar vídeo
        </label>
        <p className="mt-2 text-[13px] text-muted">
          As fotos são otimizadas no seu aparelho e os dados de localização (GPS) são removidos. Vídeo: MP4 ou WebM de até
          60 segundos e 25 MB; a localização gravada pelo celular é apagada antes do envio. Publicações com crianças
          identificáveis exigem consentimento do responsável.
        </p>
      </div>

      {pages.length > 0 && (
        <SelectField
          id="businessId"
          label="Publicar como"
          help="Conteúdo de venda e divulgação vai para a sua página comercial, não para o perfil pessoal."
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
        >
          <option value="">Meu perfil pessoal</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              Página: {p.name}
            </option>
          ))}
        </SelectField>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="visibility" label="Quem pode ver" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
          {VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </option>
          ))}
        </SelectField>
        <SelectField id="martialArtId" label="Modalidade (opcional)" value={martialArtId} onChange={(e) => setMartialArtId(e.target.value)}>
          <option value="">—</option>
          {martialArts.map((art) => (
            <option key={art.id} value={art.id}>
              {art.name}
            </option>
          ))}
        </SelectField>
      </div>
      <InputField
        id="location"
        label="Local (opcional)"
        maxLength={80}
        placeholder="Ex.: Academia do bairro"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        help="Texto livre. Não usamos a localização do seu aparelho."
      />

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={busy}>
          Publicar
        </Button>
        <p aria-live="polite" className="text-sm text-muted">
          {progress}
        </p>
      </div>
    </form>
  );
}
