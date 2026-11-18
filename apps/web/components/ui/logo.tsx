import Link from "next/link";
import { cn } from "./cn";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("font-display text-2xl font-bold uppercase leading-none tracking-wide", className)}
      aria-label="Fighterz, página inicial"
    >
      Fighter<span className="text-accent">z</span>
    </Link>
  );
}
