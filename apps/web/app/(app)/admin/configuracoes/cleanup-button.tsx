"use client";

import { useState, useTransition } from "react";
import { processCleanupQueue } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function CleanupButton({ queued }: { queued: number }) {
  const [notice, setNotice] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <p className="text-sm">
        {queued === 0 ? "Nenhum arquivo aguardando limpeza." : `${queued} ${queued === 1 ? "arquivo aguarda" : "arquivos aguardam"} limpeza.`}
      </p>
      <Button variant="secondary" disabled={pending || queued === 0} onClick={() => startTransition(async () => setNotice(await processCleanupQueue()))}>
        Limpar arquivos
      </Button>
      {notice && (
        <p role="status" className={notice.ok ? "text-sm font-medium text-success" : "text-sm font-medium text-danger"}>
          {notice.message}
        </p>
      )}
    </div>
  );
}
