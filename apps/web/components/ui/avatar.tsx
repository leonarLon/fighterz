import { cn } from "./cn";

const sizes = { sm: "size-9 text-sm", md: "size-12 text-base", lg: "size-20 text-2xl" } as const;

/** URL pública do bucket `avatars` (leitura pública; escrita só na pasta do dono). */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

/**
 * Foto de perfil, com iniciais como alternativa. Decorativa (aria-hidden): o nome sempre aparece ao lado.
 */
export function Avatar({
  name,
  path,
  size = "md",
  className,
}: {
  name: string;
  path?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const url = avatarUrl(path);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  if (url) {
    return (
      // Imagem pequena e já otimizada no upload (WebP 400 px): sem next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" aria-hidden loading="lazy" decoding="async" className={cn("shrink-0 rounded-full bg-accent-soft object-cover", sizes[size], className)} />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-accent-soft font-display font-bold text-accent",
        sizes[size],
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}
