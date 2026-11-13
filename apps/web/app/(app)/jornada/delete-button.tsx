"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAchievement, deleteCheckin, deletePromotion, removeJourneyArt } from "@/app/actions/journey";
import { Button } from "@/components/ui/button";

const ACTIONS = {
  art: removeJourneyArt,
  promotion: deletePromotion,
  achievement: deleteAchievement,
  checkin: deleteCheckin,
} as const;

const CONFIRM: Record<keyof typeof ACTIONS, string> = {
  art: "Remover a modalidade apaga também o histórico de graduações dela. Continuar?",
  promotion: "Apagar esta graduação do histórico?",
  achievement: "Apagar esta conquista?",
  checkin: "Apagar este registro de treino? Um post compartilhado continua no feed até você apagá-lo.",
};

/** Botão de excluir com confirmação. O nome acessível diz o que será apagado. */
export function DeleteButton({ kind, id, label }: { kind: keyof typeof ACTIONS; id: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <span className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-[13px] text-danger">
          {error}
        </span>
      )}
      <Button
        variant="ghost"
        aria-label={label}
        title={label}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(CONFIRM[kind])) return;
          startTransition(async () => {
            const result = await ACTIONS[kind](id);
            if (!result.ok) setError(result.message);
            else router.refresh();
          });
        }}
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </span>
  );
}
