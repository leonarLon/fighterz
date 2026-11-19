"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { follow, removeFollower, respondFollowRequest, unfollow } from "@/app/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export type FollowPerson = { id: string; username: string; displayName: string; avatarPath: string | null };

/**
 * follower: meus seguidores (remover) · following: quem eu sigo (deixar de seguir / seguir de novo)
 * request: pedidos para me seguir (aceitar / recusar) · sent: pedidos que enviei (cancelar) · view: só leitura.
 * Nenhuma ação revalida a página: a linha muda localmente (a lista não "pula" no meio do uso).
 */
export function FollowRows({ people, mode }: { people: FollowPerson[]; mode: "follower" | "following" | "request" | "sent" | "view" }) {
  const [state, setState] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();

  function run(id: string, action: () => Promise<{ ok: boolean; message?: string; status?: string }>, next: string) {
    setBusy(id);
    setMessage("");
    startTransition(async () => {
      const result = await action();
      if (result.ok) setState((s) => ({ ...s, [id]: result.status === "pending" && next === "following" ? "pending" : next }));
      else setMessage(result.message ?? "Não foi possível concluir.");
      setBusy(null);
    });
  }

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {people.map((person) => {
          const s = state[person.id];
          return (
            <li key={person.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={routes.profile(person.username)} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                <Avatar name={person.displayName} path={person.avatarPath} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{person.displayName}</span>
                  <span className="block truncate text-[13px] text-muted">@{person.username}</span>
                </span>
              </Link>

              {mode === "follower" &&
                (s === "removed" ? (
                  <span className="shrink-0 text-sm text-muted">Removido</span>
                ) : (
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    loading={busy === person.id}
                    aria-label={`Remover ${person.displayName} dos seguidores`}
                    onClick={() => run(person.id, () => removeFollower(person.id), "removed")}
                  >
                    <UserMinus aria-hidden className="size-4" /> <span aria-hidden>Remover</span>
                  </Button>
                ))}

              {mode === "following" &&
                (s === "unfollowed" ? (
                  <Button
                    className="shrink-0"
                    loading={busy === person.id}
                    aria-label={`Seguir ${person.displayName}`}
                    onClick={() => run(person.id, () => follow(person.id, { refresh: false }), "following")}
                  >
                    <UserPlus aria-hidden className="size-4" /> <span aria-hidden>Seguir</span>
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    loading={busy === person.id}
                    aria-label={`${s === "pending" ? "Solicitado" : "Deixar de seguir"} ${person.displayName}`}
                    onClick={() => run(person.id, () => unfollow(person.id, { refresh: false }), "unfollowed")}
                  >
                    <UserCheck aria-hidden className="size-4" /> <span aria-hidden>{s === "pending" ? "Solicitado" : "Deixar de seguir"}</span>
                  </Button>
                ))}

              {mode === "request" &&
                (s ? (
                  <span className="shrink-0 text-sm text-muted">{s === "accepted" ? "Aceito" : "Recusado"}</span>
                ) : (
                  <span className="flex shrink-0 gap-2">
                    <Button
                      loading={busy === person.id}
                      aria-label={`Aceitar ${person.displayName}`}
                      onClick={() => run(person.id, () => respondFollowRequest(person.id, true), "accepted")}
                    >
                      <Check aria-hidden className="size-4" /> <span aria-hidden>Aceitar</span>
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy === person.id}
                      aria-label={`Recusar ${person.displayName}`}
                      onClick={() => run(person.id, () => respondFollowRequest(person.id, false), "rejected")}
                    >
                      <X aria-hidden className="size-4" /> <span aria-hidden>Recusar</span>
                    </Button>
                  </span>
                ))}

              {mode === "sent" &&
                (s === "cancelled" ? (
                  <span className="shrink-0 text-sm text-muted">Cancelado</span>
                ) : (
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    loading={busy === person.id}
                    aria-label={`Cancelar pedido para ${person.displayName}`}
                    onClick={() => run(person.id, () => unfollow(person.id, { refresh: false }), "cancelled")}
                  >
                    <X aria-hidden className="size-4" /> <span aria-hidden>Cancelar pedido</span>
                  </Button>
                ))}
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="mt-2 text-[13px] text-danger empty:hidden">
        {message}
      </p>
    </>
  );
}
