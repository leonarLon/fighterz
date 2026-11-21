"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { respondBusinessInvite } from "@/app/actions/businesses";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";

/** Aceitar ou recusar o convite. O resultado aparece na própria linha (sem revalidar a lista). */
export function InviteResponse({ businessId, slug }: { businessId: string; slug: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ ok: boolean; accepted: boolean; text: string } | null>(null);

  if (done?.ok) {
    return (
      <p role="status" className="text-sm">
        {done.text}{" "}
        {done.accepted && (
          <Link href={routes.manageBusiness(slug)} className="font-semibold text-accent hover:underline">
            Gerenciar
          </Link>
        )}
      </p>
    );
  }
  const answer = (accept: boolean) =>
    startTransition(async () => {
      const result = await respondBusinessInvite(businessId, accept);
      setDone({ ok: result.ok, accepted: accept, text: result.message ?? "" });
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button loading={pending} onClick={() => answer(true)}>
        <Check aria-hidden className="size-4" /> Aceitar convite
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => answer(false)}>
        <X aria-hidden className="size-4" /> Recusar
      </Button>
      {done && !done.ok && <p className="text-[13px] text-danger">{done.text}</p>}
    </div>
  );
}
