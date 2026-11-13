"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Pencil, Star, Trash2, XCircle } from "lucide-react";
import { deleteEvent, setEventInterest, setEventStatus } from "@/app/actions/events";
import { routes } from "@/lib/routes";
import { Button, buttonClasses } from "@/components/ui/button";

export function EventActions({
  eventId,
  loggedIn,
  interested,
  saved,
}: {
  eventId: string;
  loggedIn: boolean;
  interested: boolean;
  saved: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({ interested, saved });
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(kind: "interested" | "saved") {
    if (!loggedIn) {
      router.push(`${routes.signIn}?next=${encodeURIComponent(routes.event(eventId))}`);
      return;
    }
    const next = !state[kind];
    setState((s) => ({ ...s, [kind]: next }));
    startTransition(async () => {
      const result = await setEventInterest(eventId, kind, next);
      if (!result.ok) {
        setState((s) => ({ ...s, [kind]: !next }));
        setNotice(result.message);
        return;
      }
      if (kind === "saved") setNotice(next ? "Evento salvo." : "Removido dos salvos.");
      else {
        setNotice(next ? "Interesse registrado. Avisaremos se o evento mudar." : "Interesse removido.");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button variant={state.interested ? "secondary" : "primary"} aria-pressed={state.interested} disabled={pending} onClick={() => toggle("interested")}>
        <Star aria-hidden className="size-4" fill={state.interested ? "currentColor" : "none"} />
        Tenho interesse
      </Button>
      <Button variant="secondary" aria-pressed={state.saved} disabled={pending} onClick={() => toggle("saved")}>
        <Bookmark aria-hidden className="size-4" fill={state.saved ? "currentColor" : "none"} />
        Salvar
      </Button>
      <p aria-live="polite" className="w-full text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </>
  );
}

export function EventManageActions({ eventId, status }: { eventId: string; status: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result.message ?? "");
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-md border border-dashed border-border p-3">
      <p className="mb-2 text-sm font-semibold">Organização</p>
      <div className="flex flex-wrap gap-2">
        {status !== "cancelled" && (
          <Link href={routes.editEvent(eventId)} className={buttonClasses("secondary")}>
            <Pencil aria-hidden className="size-4" /> Editar
          </Link>
        )}
        {status === "draft" && (
          <>
            <Button disabled={pending} onClick={() => run(() => setEventStatus(eventId, "published"))}>
              Publicar
            </Button>
            <Button
              variant="outline-danger"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Excluir este rascunho?")) run(() => deleteEvent(eventId));
              }}
            >
              <Trash2 aria-hidden className="size-4" /> Excluir rascunho
            </Button>
          </>
        )}
        {status === "published" && (
          <Button
            variant="outline-danger"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Cancelar o evento? Quem marcou interesse será avisado. Não dá para reabrir.")) {
                run(() => setEventStatus(eventId, "cancelled"));
              }
            }}
          >
            <XCircle aria-hidden className="size-4" /> Cancelar evento
          </Button>
        )}
      </div>
      <p aria-live="polite" className="mt-2 text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </div>
  );
}
