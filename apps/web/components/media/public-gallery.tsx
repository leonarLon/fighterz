import { coverUrl } from "@/lib/covers";

type Photo = { id: string; path: string; caption: string | null; width: number | null; height: number | null };

/** Galeria pública: a legenda é o texto alternativo e aparece embaixo da foto. */
export function PublicGallery({ photos, name }: { photos: Photo[]; name: string }) {
  if (photos.length === 0) return null;
  return (
    <section aria-labelledby="fotos">
      <h2 id="fotos" className="mb-3 font-display text-2xl font-semibold">
        Fotos
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, i) => (
          <li key={p.id}>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl(p.path) ?? ""}
                alt={p.caption ?? `Foto ${i + 1} de ${name}`}
                width={p.width ?? undefined}
                height={p.height ?? undefined}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-md bg-accent-soft object-cover"
              />
              {p.caption && <figcaption className="mt-1 text-[13px] text-muted">{p.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
