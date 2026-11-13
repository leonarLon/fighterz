"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import type { ReportTarget } from "@figtherz/core";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ReportForm } from "./report-form";

/** "Denunciar" para páginas sem menu de opções (academia, evento). Visitante vai para o login. */
export function ReportButton({
  targetType,
  targetId,
  title,
  loggedIn,
  returnTo,
}: {
  targetType: ReportTarget;
  targetId: string;
  title: string;
  loggedIn: boolean;
  returnTo: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => (loggedIn ? setOpen(true) : router.push(`${routes.signIn}?next=${encodeURIComponent(returnTo)}`))}
      >
        <Flag aria-hidden className="size-4" /> Denunciar
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <ReportForm targetType={targetType} targetId={targetId} />
      </Dialog>
    </>
  );
}
