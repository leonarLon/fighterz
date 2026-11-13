"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { leaveMembership, respondMembership } from "@/app/actions/academies";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";

type Membership = { academyId: string; slug: string; name: string; status: string; requestedBy: string };

export function TeacherMemberships({ userId, items }: { userId: string; items: Membership[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result.message ?? "");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-muted">
        Nenhum vínculo ainda. Abra a página de uma{" "}
        <Link href={routes.academies} className="font-semibold text-accent hover:underline">
          academia
        </Link>{" "}
        e toque em “Dou aula aqui”, ou peça para a academia convidar você.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {items.map((m) => (
          <li key={m.academyId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span>
              <Link href={routes.academy(m.slug)} className="font-semibold hover:underline">
                {m.name}
              </Link>{" "}
              <span className="text-[13px] text-muted">
                {m.status === "active"
                  ? "vínculo ativo"
                  : m.requestedBy === "academy"
                    ? "convite da academia"
                    : "aguardando aprovação da academia"}
              </span>
            </span>
            <span className="flex gap-2">
              {m.status === "pending" && m.requestedBy === "academy" && (
                <>
                  <Button disabled={pending} onClick={() => run(() => respondMembership(m.academyId, userId, "teacher", true))}>
                    Aceitar convite
                  </Button>
                  <Button variant="secondary" disabled={pending} onClick={() => run(() => respondMembership(m.academyId, userId, "teacher", false))}>
                    Recusar
                  </Button>
                </>
              )}
              {(m.status === "active" || m.requestedBy === "user") && (
                <Button variant="ghost" disabled={pending} onClick={() => run(() => leaveMembership(m.academyId, "teacher"))}>
                  {m.status === "active" ? "Sair" : "Cancelar pedido"}
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-2 text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </div>
  );
}
