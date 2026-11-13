import Link from "next/link";
import { segmentText } from "@figtherz/core";
import { routes } from "@/lib/routes";

/** Legenda como texto puro (React escapa tudo). Marcação aprovada vira link; URLs externas recebem rel ugc. */
export function Caption({ text, mentions }: { text: string; mentions: string[] }) {
  if (!text) return null;
  return (
    <p className="whitespace-pre-line break-words">
      {segmentText(text, mentions).map((segment, i) => {
        if (segment.type === "mention") {
          return (
            <Link key={i} href={routes.profile(segment.username)} className="font-semibold text-accent hover:underline">
              {segment.value}
            </Link>
          );
        }
        if (segment.type === "link") {
          return (
            <a key={i} href={segment.href} target="_blank" rel="noopener nofollow ugc" className="text-accent underline">
              {segment.value}
            </a>
          );
        }
        return <span key={i}>{segment.value}</span>;
      })}
    </p>
  );
}
