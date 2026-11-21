"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { addAcademyPhoto, deleteAcademyPhoto } from "@/app/actions/media";
import { createClient } from "@/lib/supabase/client";
import { COVERS_BUCKET, coverUrl, newCoverPath } from "@/lib/covers";
import { ImageError, prepareImage } from "@/lib/image-processing";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

export type GalleryPhoto = { id: string; path: string; caption: string | null };

/** Galeria da academia: escolhe a foto, escreve a legenda (texto alternativo) e envia. */
export function GalleryManager({ academyId, photos, limit }: { academyId: string; photos: GalleryPhoto[]; limit: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const full = photos.length >= limit;

  function choose(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    startTransition(async () => {
      try {
        const image = await prepareImage(file);
        const path = newCoverPath("academy", academyId, "gallery", image.ext);
        const { error } = await createClient().storage.from(COVERS_BUCKET).upload(path, image.blob, { contentType: image.contentType });
        if (error) throw new ImageError("Falha ao enviar a foto. Tente de novo.");
        const result = await addAcademyPhoto(academyId, { path, caption, width: image.width, height: image.height });
        if (!result.ok) throw new ImageError(result.message);
        setCaption("");
        setNotice({ ok: true, text: result.message ?? "Foto adicionada." });
        router.refresh();
      } catch (error) {
        setNotice({ ok: false, text: error instanceof ImageError ? error.message : "Não foi possível adicionar a foto." });
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-semibold">Galeria</span>{" "}
        <span className="text-muted">
          ({photos.length} de {limit} fotos)
        </span>
      </p>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl(p.path) ?? ""} alt={p.caption ?? `Foto ${i + 1} da galeria`} className="aspect-[4/3] w-full rounded-md object-cover" loading="lazy" />
              <p className="line-clamp-2 text-[13px] text-muted">{p.caption ?? "Sem legenda"}</p>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteAcademyPhoto(academyId, p.id);
                    setNotice({ ok: result.ok, text: result.message ?? "" });
                    if (result.ok) router.refresh();
                  })
                }
              >
                <Trash2 aria-hidden className="size-4" /> Apagar foto {i + 1}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-[13px] text-muted">A galeria está cheia. Apague uma foto para adicionar outra.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <InputField
            id={`gallery-caption-${academyId.slice(0, 8)}`}
            label="Legenda da próxima foto (opcional)"
            help="Descreva a foto: ajuda quem usa leitor de tela."
            maxLength={200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-w-64"
          />
          <input
            ref={input}
            id={`gallery-${academyId.slice(0, 8)}`}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
            disabled={pending}
          />
          <label
            htmlFor={`gallery-${academyId.slice(0, 8)}`}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-4 font-semibold hover:bg-bg has-[:disabled]:opacity-60"
          >
            <ImagePlus aria-hidden className="size-4" /> Adicionar foto à galeria
          </label>
        </div>
      )}
      <p aria-live="polite" className={notice?.ok === false ? "text-[13px] text-danger empty:hidden" : "text-[13px] text-success empty:hidden"}>
        {pending ? "Enviando…" : (notice?.text ?? "")}
      </p>
    </div>
  );
}
