import { coverUrl } from "@/lib/covers";

/** Banner no topo do cartão principal (academia ou página). Decorativo: o nome aparece logo abaixo. */
export function PageBanner({ path }: { path: string | null }) {
  const url = coverUrl(path);
  if (!url) return null;
  return (
    <div className="-mx-5 -mt-5 mb-4 aspect-[3/1] overflow-hidden rounded-t-lg bg-accent-soft sm:-mx-6 sm:-mt-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-full object-cover" />
    </div>
  );
}

/** Logo ao lado do nome. Decorativo pelo mesmo motivo. */
export function PageLogo({ path, className = "size-16" }: { path: string | null; className?: string }) {
  const url = coverUrl(path);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={`${className} shrink-0 rounded-lg border border-border object-cover`} />;
}
