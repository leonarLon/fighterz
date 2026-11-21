"use client";

import { useState, useTransition } from "react";
import type { ReportTarget } from "@figtherz/core";
import { moderateContent, setAcademyVerified, setBusinessVerified } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

/** Remover/restaurar (com motivo) e, para academias, o selo de verificação. */
export function TargetActions({
  targetType,
  targetId,
  removed,
  removeLabel,
  restorable,
  verified,
  canVerify,
}: {
  targetType: ReportTarget;
  targetId: string;
  removed: boolean;
  removeLabel: string;
  restorable: boolean;
  verified?: boolean;
  canVerify?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [isRemoved, setRemoved] = useState(removed);
  const [isVerified, setVerified] = useState(Boolean(verified));
  const [notice, setNotice] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const id = `t-${targetId.slice(0, 8)}`;

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, onOk: () => void) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result);
      if (result.ok) onOk();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        {(!isRemoved || restorable) && (
          <>
            <div className="min-w-56 flex-1">
              <InputField id={`${id}-reason`} label="Motivo" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            {!isRemoved ? (
              <Button
                variant="outline-danger"
                disabled={pending || !reason.trim()}
                onClick={() => run(() => moderateContent(targetType, targetId, true, reason), () => setRemoved(true))}
              >
                {removeLabel}
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={pending || !reason.trim()}
                onClick={() => run(() => moderateContent(targetType, targetId, false, reason), () => setRemoved(false))}
              >
                Restaurar
              </Button>
            )}
          </>
        )}
        {canVerify && (
          <Button
            variant="secondary"
            aria-pressed={isVerified}
            disabled={pending}
            onClick={() => run(() => (targetType === "business" ? setBusinessVerified : setAcademyVerified)(targetId, !isVerified), () => setVerified((v) => !v))}
          >
            {isVerified ? "Remover selo de verificada" : "Marcar como verificada"}
          </Button>
        )}
      </div>
      {notice && (
        <p role="status" className={notice.ok ? "text-sm font-medium text-success" : "text-sm font-medium text-danger"}>
          {notice.message}
        </p>
      )}
    </div>
  );
}
