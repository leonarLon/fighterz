"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Flag, MoreHorizontal, UserCheck, UserPlus } from "lucide-react";
import { follow, setBlocked, unfollow } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ReportForm } from "@/components/report/report-form";

type FollowState = "none" | "pending" | "accepted";

export function ProfileActions({
  profileId,
  displayName,
  initialFollow,
  blockedByMe,
}: {
  profileId: string;
  displayName: string;
  initialFollow: FollowState;
  blockedByMe: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<FollowState>(initialFollow);
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"block" | "report" | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleFollow() {
    startTransition(async () => {
      if (state === "none") {
        const result = await follow(profileId);
        if (result.ok) setState(result.status === "accepted" ? "accepted" : "pending");
        else setMessage(result.message);
      } else {
        const result = await unfollow(profileId);
        if (result.ok) setState("none");
        else setMessage(result.message);
      }
      router.refresh();
    });
  }

  function changeBlock(block: boolean) {
    startTransition(async () => {
      const result = await setBlocked(profileId, block);
      if (!result.ok) setMessage(result.message);
      setDialog(null);
      router.refresh();
    });
  }

  if (blockedByMe) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">Você bloqueou este perfil.</p>
        <Button variant="secondary" onClick={() => changeBlock(false)} loading={pending}>
          Desbloquear
        </Button>
      </div>
    );
  }

  const label = state === "accepted" ? "Seguindo" : state === "pending" ? "Solicitado" : "Seguir";
  const Icon = state === "none" ? UserPlus : UserCheck;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={state === "none" ? "primary" : "secondary"}
        onClick={toggleFollow}
        loading={pending}
        aria-pressed={state !== "none"}
        title={state === "pending" ? "Toque para cancelar a solicitação" : undefined}
      >
        <Icon aria-hidden className="size-4" /> {label}
      </Button>
      <div className="relative">
        <button
          type="button"
          aria-label="Mais opções do perfil"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex size-11 items-center justify-center rounded-md border border-border hover:bg-bg"
        >
          <MoreHorizontal aria-hidden className="size-5" />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-12 z-10 min-w-44 rounded-md border border-border bg-surface-raised py-1 shadow-lg">
            <button
              role="menuitem"
              type="button"
              onClick={() => (setMenuOpen(false), setDialog("report"))}
              className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-bg"
            >
              <Flag aria-hidden className="size-4" /> Denunciar perfil
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={() => (setMenuOpen(false), setDialog("block"))}
              className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-danger hover:bg-bg"
            >
              <Ban aria-hidden className="size-4" /> Bloquear
            </button>
          </div>
        )}
      </div>
      <p aria-live="polite" className="text-[13px] text-danger empty:hidden">
        {message}
      </p>

      <Dialog open={dialog === "block"} onClose={() => setDialog(null)} title={`Bloquear ${displayName}?`}>
        <p className="text-muted">
          Vocês deixam de se seguir. A pessoa não verá seu perfil nem suas publicações, não poderá comentar, marcar ou
          interagir com você, e não é avisada do bloqueio.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Cancelar
          </Button>
          <Button variant="outline-danger" onClick={() => changeBlock(true)} loading={pending}>
            <Ban aria-hidden className="size-4" /> Bloquear
          </Button>
        </div>
      </Dialog>
      <Dialog open={dialog === "report"} onClose={() => setDialog(null)} title="Denunciar perfil">
        <ReportForm targetType="profile" targetId={profileId} />
      </Dialog>
    </div>
  );
}
