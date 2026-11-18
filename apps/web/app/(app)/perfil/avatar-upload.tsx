"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { setAvatar } from "@/app/actions/account";
import { createClient } from "@/lib/supabase/client";
import { ImageError, prepareAvatar } from "@/lib/image-processing";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

/** Foto de perfil: recorte e reencode no aparelho, upload direto no bucket `avatars` (pasta do usuário). */
export function AvatarUpload({ userId, name, path }: { userId: string; name: string; path: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(path);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    startTransition(async () => {
      try {
        const image = await prepareAvatar(file);
        const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        const newPath = `${userId}/avatar-${random}.${image.ext}`;
        const { error } = await createClient().storage.from("avatars").upload(newPath, image.blob, { contentType: image.contentType });
        if (error) throw new ImageError("Falha ao enviar a foto. Tente de novo.");
        const result = await setAvatar(newPath);
        if (!result.ok) throw new ImageError(result.message);
        setCurrent(newPath);
        setNotice({ ok: true, text: "Foto atualizada." });
        router.refresh();
      } catch (error) {
        setNotice({ ok: false, text: error instanceof ImageError ? error.message : "Não foi possível atualizar a foto." });
      }
    });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <Avatar name={name} path={current} size="lg" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id="avatar"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
            disabled={pending}
          />
          <label
            htmlFor="avatar"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-4 font-semibold hover:bg-bg has-[:disabled]:opacity-60"
          >
            <Camera aria-hidden className="size-4" /> {current ? "Trocar foto" : "Adicionar foto"}
          </label>
          {current && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setAvatar(null);
                  if (result.ok) {
                    setCurrent(null);
                    setNotice({ ok: true, text: "Foto removida." });
                    router.refresh();
                  } else setNotice({ ok: false, text: result.message });
                })
              }
            >
              <Trash2 aria-hidden className="size-4" /> Remover foto
            </Button>
          )}
        </div>
        <p className="text-[13px] text-muted">Quadrada, até 400 px. Os dados de localização da foto são removidos.</p>
        <p aria-live="polite" className={notice?.ok === false ? "text-[13px] text-danger empty:hidden" : "text-[13px] text-success empty:hidden"}>
          {pending ? "Enviando…" : (notice?.text ?? "")}
        </p>
      </div>
    </div>
  );
}
