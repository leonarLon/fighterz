"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
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
};

export function ReviewItem({ item }: { item: Item }) {
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [pending, startTransition] = useTransition();

  function review(status: "approved" | "rejected") {
    startTransition(async () => {
      const r = await reviewTeacher(item.userId, status, notes);
      setResult(r.ok ? (status === "approved" ? "Aprovado." : "Recusado.") : r.message);
    });
  }

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold">{item.professionalName}</h2>
      <p className="text-sm text-muted">
        <Link href={routes.profile(item.username)} className="hover:underline">
          @{item.username}
        </Link>
        {item.experienceYears != null && ` · ${item.experienceYears} anos de experiência`}
        {` · pedido em ${new Date(item.createdAt).toLocaleDateString("pt-BR")}`}
      </p>
      {item.bio && <p className="mt-2 whitespace-pre-line text-sm">{item.bio}</p>}
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
      {result ? (
        <p role="status" className="mt-4 font-semibold">
          {result}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold" htmlFor={`notes-${item.userId}`}>
            Observação para o professor (opcional)
          </label>
          <textarea
            id={`notes-${item.userId}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={2}
            className="block w-full rounded-md border border-border bg-surface px-3 py-2"
          />
          <div className="flex gap-2">
            <Button onClick={() => review("approved")} loading={pending}>
              <Check aria-hidden className="size-4" /> Aprovar
            </Button>
            <Button variant="outline-danger" onClick={() => review("rejected")} disabled={pending}>
              <X aria-hidden className="size-4" /> Recusar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
