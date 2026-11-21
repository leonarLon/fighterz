"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { setCoverImage } from "@/app/actions/media";
import { createClient } from "@/lib/supabase/client";
import { COVERS_BUCKET, coverUrl, newCoverPath, type CoverEntity } from "@/lib/covers";
import { ImageError, prepareAvatar, prepareImage } from "@/lib/image-processing";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

/**
 * Logo (quadrado, 400 px) ou banner (até 1600 px) de academia ou página comercial.
 * Processa no aparelho (sem EXIF/GPS), envia direto ao bucket `covers` e grava o caminho pela action.
 */
export function CoverImageUpload({
  entity,
  entityId,
  slot,
  path,
  name,
}: {
  entity: CoverEntity;
  entityId: string;
  slot: "logo" | "banner";
  path: string | null;
  name: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(path);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const label = slot === "logo" ? "logo" : "banner";
  const inputId = `${slot}-${entity}-${entityId.slice(0, 8)}`;
  const url = coverUrl(current);

  function choose(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    startTransition(async () => {
      try {
        const image = slot === "logo" ? await prepareAvatar(file) : await prepareImage(file);
        const newPath = newCoverPath(entity, entityId, slot, image.ext);
        const { error } = await createClient().storage.from(COVERS_BUCKET).upload(newPath, image.blob, { contentType: image.contentType });
        if (error) throw new ImageError("Falha ao enviar a imagem. Tente de novo.");
        const result = await setCoverImage(entity, entityId, slot, newPath);
        if (!result.ok) throw new ImageError(result.message);
        setCurrent(newPath);
        setNotice({ ok: true, text: result.message ?? "Imagem atualizada." });
        router.refresh();
      } catch (error) {
        setNotice({ ok: false, text: error instanceof ImageError ? error.message : "Não foi possível atualizar a imagem." });
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{slot === "logo" ? "Logo" : "Banner"}</p>
      <div
        className={cn(
          "overflow-hidden border border-border bg-accent-soft",
          slot === "logo" ? "size-24 rounded-lg" : "aspect-[3/1] w-full max-w-xl rounded-lg",
        )}
      >
        {url ? (
          // Imagem já otimizada no upload: sem next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${slot === "logo" ? "Logo" : "Banner"} atual de ${name}`} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[13px] text-muted">Sem {label}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
          disabled={pending}
        />
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-4 font-semibold hover:bg-bg has-[:disabled]:opacity-60"
        >
          <ImagePlus aria-hidden className="size-4" /> {current ? `Trocar ${label}` : `Adicionar ${label}`}
        </label>
        {current && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setCoverImage(entity, entityId, slot, null);
                if (result.ok) {
                  setCurrent(null);
                  router.refresh();
                }
                setNotice({ ok: result.ok, text: result.message ?? "" });
              })
            }
          >
            <Trash2 aria-hidden className="size-4" /> Remover {label}
          </Button>
        )}
      </div>
      <p className="text-[13px] text-muted">
        {slot === "logo" ? "Quadrado, até 400 px." : "Formato largo (3:1), até 1600 px."} Os dados de localização da foto são removidos.
      </p>
      <p aria-live="polite" className={notice?.ok === false ? "text-[13px] text-danger empty:hidden" : "text-[13px] text-success empty:hidden"}>
        {pending ? "Enviando…" : (notice?.text ?? "")}
      </p>
    </div>
  );
}
