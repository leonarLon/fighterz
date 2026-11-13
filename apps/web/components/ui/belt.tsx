import { cn } from "./cn";

/**
 * Assinatura visual: a "faixa" (DESIGN_SYSTEM.md §1).
 * Barra de 6 px com marcadores de grau na ponta. Divisor de seção agora; chip de graduação na Fase 5.
 */
export function BeltDivider({ className, degrees = 3 }: { className?: string; degrees?: number }) {
  return (
    <div aria-hidden className={cn("flex h-1.5 w-full overflow-hidden rounded-full", className)}>
      <div className="flex-1 bg-text" />
      <div className="flex w-14 items-stretch justify-center gap-[3px] bg-primary px-1 py-px">
        {Array.from({ length: degrees }, (_, i) => (
          <span key={i} className="w-1.5 bg-on-primary" />
        ))}
      </div>
      <div className="w-4 bg-text" />
    </div>
  );
}
