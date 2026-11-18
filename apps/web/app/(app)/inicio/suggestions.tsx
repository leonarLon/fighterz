"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, UserCheck, UserPlus } from "lucide-react";
import { follow, unfollow } from "@/app/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export type Suggestion = {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  detail: string | null;
};

type State = "none" | "pending" | "accepted";

/** Sugestões de quem seguir, mostradas quando o Início está vazio. Seguir não recarrega a página na hora
 *  (a lista sumiria no meio do uso); o botão "Ver meu feed" recarrega quando a pessoa quiser. */
export function FollowSuggestions({ people }: { people: Suggestion[] }) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, State>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [, startTransition] = useTransition();
  const followed = Object.values(states).filter((s) => s !== "none").length;

  function toggle(person: Suggestion) {
    const current = states[person.id] ?? "none";
    setBusy(person.id);
    setMessage("");
    startTransition(async () => {
      const result = current === "none" ? await follow(person.id, { refresh: false }) : await unfollow(person.id, { refresh: false });
      if (result.ok) {
        const next: State = current === "none" ? (result.status === "accepted" ? "accepted" : "pending") : "none";
        setStates((s) => ({ ...s, [person.id]: next }));
      } else {
        setMessage(result.message);
      }
      setBusy(null);
    });
  }

  return (
    <div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {people.map((person) => {
          const state = states[person.id] ?? "none";
          const Icon = state === "none" ? UserPlus : UserCheck;
          return (
            <li key={person.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={routes.profile(person.username)} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                <Avatar name={person.displayName} path={person.avatarPath} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{person.displayName}</span>
                  <span className="block truncate text-[13px] text-muted">
                    @{person.username}
                    {person.detail ? ` · ${person.detail}` : ""}
                  </span>
                </span>
              </Link>
              <Button
                variant={state === "none" ? "primary" : "secondary"}
                onClick={() => toggle(person)}
                loading={busy === person.id}
                aria-pressed={state !== "none"}
                aria-label={`${state === "none" ? "Seguir" : state === "pending" ? "Solicitado" : "Seguindo"} ${person.displayName}`}
                className="shrink-0"
              >
                <Icon aria-hidden className="size-4" />
                <span aria-hidden>{state === "none" ? "Seguir" : state === "pending" ? "Solicitado" : "Seguindo"}</span>
              </Button>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="mt-2 text-[13px] text-danger empty:hidden">
        {message}
      </p>
      {followed > 0 && (
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" loading={refreshing} onClick={() => startRefresh(() => router.refresh())}>
            <RefreshCw aria-hidden className="size-4" /> Ver meu feed
          </Button>
        </div>
      )}
    </div>
  );
}
