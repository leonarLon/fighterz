import { cn } from "./cn";

const sizes = { sm: "size-9 text-sm", md: "size-12 text-base", lg: "size-20 text-2xl" } as const;

/** Fallback de iniciais. Upload de foto chega com os buckets de Storage (Fase 3). */
export function Avatar({ name, size = "md", className }: { name: string; size?: keyof typeof sizes; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
