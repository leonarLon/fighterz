import { BadgeCheck } from "lucide-react";
import { rankLabel } from "@figtherz/core";
import { cn } from "@/components/ui/cn";

type Props = {
  name: string | null;
  color: string | null;
  secondaryColor?: string | null;
  degree?: number | null;
  confirmed?: boolean;
  className?: string;
  /** Só a faixa, sem o texto ao lado (o texto precisa estar em outro lugar). */
  compact?: boolean;
};

const BLACK = "#111111";

/**
 * Faixa desenhada com as cores do catálogo (dados, não marca: DESIGN_SYSTEM.md §2.6).
 * Os graus aparecem como listras na ponteira. A informação também vai em texto: a cor nunca é a única pista.
 */
export function RankBelt({ name, color, secondaryColor, degree = 0, confirmed, className, compact }: Props) {
  const main = color ?? "#9CA3AF";
  const tip = main.toUpperCase() === BLACK ? "#DC2626" : BLACK;
  const background = secondaryColor
    ? `repeating-linear-gradient(90deg, ${main} 0 14px, ${secondaryColor} 14px 28px)`
    : main;
  const label = rankLabel(name, degree);

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="relative inline-flex h-3.5 w-28 shrink-0 overflow-hidden rounded-sm border border-border"
        style={{ background }}
      >
        <span className="absolute inset-y-0 right-3 flex items-stretch justify-center gap-[3px] px-1 py-[2px]"
          style={{ background: tip, width: Math.max(28, (degree ?? 0) * 6 + 10) }}>
          {Array.from({ length: degree ?? 0 }, (_, i) => (
            <span key={i} className="w-[3px] bg-white" />
          ))}
        </span>
      </span>
      {!compact && <span className="text-sm font-semibold">{label}</span>}
      {confirmed && (
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-success">
          <BadgeCheck aria-hidden className="size-4" /> Confirmada pelo professor
        </span>
      )}
    </span>
  );
}
