"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDuration } from "@figtherz/core";
import type { PostMediaView } from "@/lib/post-types";
import { cn } from "@/components/ui/cn";

/** Carrossel com rolagem nativa (swipe no celular), setas e teclado ←/→. */
export function MediaCarousel({ media, label }: { media: PostMediaView[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (media.length === 0) return null;

  const first = media[0]!;
  const ratio = Math.min(Math.max(first.width / first.height, 4 / 5), 1.91);

  function go(to: number) {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(media.length - 1, to));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") go(index + 1);
    if (event.key === "ArrowLeft") go(index - 1);
  }

  return (
    <div
      className="relative overflow-hidden bg-bg"
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
    >
      {/* A faixa rolável é o que recebe foco (WCAG: região rolável acessível pelo teclado; ←/→ trocam a foto). */}
      <div
        ref={track}
        tabIndex={media.length > 1 ? 0 : undefined}
        onKeyDown={media.length > 1 ? onKeyDown : undefined}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        style={{ aspectRatio: ratio }}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
        }}
      >
        {media.map((item, i) => (
          <div
            key={item.id}
            className="h-full w-full shrink-0 snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${media.length}`}
          >
            {item.type === "video" ? (
              // preload="none": o vídeo só baixa quando a pessoa toca (economiza dados no feed).
              <video
                src={item.url}
                poster={item.poster ?? undefined}
                controls
                playsInline
                preload="none"
                aria-label={item.alt ? `Vídeo: ${item.alt}` : `Vídeo${item.durationMs ? ` de ${formatDuration(item.durationMs)}` : ""}`}
                className="h-full w-full bg-black object-contain"
              />
            ) : (
              // URLs assinadas e temporárias do Storage privado: o otimizador do next/image não se aplica.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={item.alt}
                width={item.width}
                height={item.height}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white disabled:hidden"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === media.length - 1}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white disabled:hidden"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden>
            {media.map((item, i) => (
              <span key={item.id} className={cn("size-1.5 rounded-full", i === index ? "bg-white" : "bg-white/50")} />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            Foto {index + 1} de {media.length}
          </p>
        </>
      )}
    </div>
  );
}
