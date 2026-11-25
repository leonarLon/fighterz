"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { RotateCcw, ShieldOff } from "lucide-react";
import { reviewTeacher } from "@/app/actions/teachers";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Item = {
  userId: string;
  professionalName: string;
  bio: string | null;
  experienceYears: number | null;
  lineage: string | null;
  certifications: { title: string; issuer: string | null; year: number | null }[];
  username: string;
  createdAt: string;
  status: "approved" | "revoked";
  reviewNotes: string | null;
};

/** Professor ativo: o admin pode revogar (com motivo). Revogado: pode reativar. */
export function ReviewItem({ item }: { item: Item }) {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [pending, startTransition] = useTransition();

  function review(next: "approved" | "revoked") {
    if (next === "revoked" && notes.trim().length < 3) {
      setResult("Informe o motivo da revogação (o professor vê esse texto).");
      return;
    }
    startTransition(async () => {
      const r = await reviewTeacher(item.userId, next, notes);
      if (!r.ok) {
        setResult(r.message);
        return;
      }
      setStatus(next);
      setNotes("");
      setResult(next === "revoked" ? "Perfil revogado." : "Perfil reativado.");
    });
  }

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold">{item.professionalName}</h2>
      <p className="text-sm text-muted">
        <Link href={routes.teacher(item.username)} className="hover:underline">
          @{item.username}
        </Link>
        {item.experienceYears != null && ` · ${item.experienceYears} anos de experiência`}
        {` · desde ${new Date(item.createdAt).toLocaleDateString("pt-BR")}`}
      </p>
      {item.bio && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm">{item.bio}</p>}
      {item.lineage && <p className="mt-1 text-sm text-muted">Linhagem: {item.lineage}</p>}
      {item.certifications.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {item.certifications.map((c, i) => (
            <li key={i}>
              {c.title}
              {c.issuer ? ` · ${c.issuer}` : ""}
              {c.year ? ` (${c.year})` : ""}
            </li>
          ))}
        </ul>
      )}
      {status === "revoked" && item.reviewNotes && <p className="mt-2 text-sm text-danger">Motivo da revogação: {item.reviewNotes}</p>}

      <div className="mt-4 space-y-3">
        {status === "approved" && (
          <>
            <label className="block text-sm font-semibold" htmlFor={`notes-${item.userId}`}>
              Motivo da revogação
            </label>
            <textarea
              id={`notes-${item.userId}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
              className="block w-full rounded-md border border-border bg-surface px-3 py-2"
            />
          </>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {status === "approved" ? (
            <Button variant="outline-danger" onClick={() => review("revoked")} loading={pending}>
              <ShieldOff aria-hidden className="size-4" /> Revogar perfil de {item.professionalName}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => review("approved")} loading={pending}>
              <RotateCcw aria-hidden className="size-4" /> Reativar perfil de {item.professionalName}
            </Button>
          )}
          <p role="status" className="text-sm font-semibold empty:hidden">
            {result}
          </p>
        </div>
      </div>
    </Card>
  );
}
