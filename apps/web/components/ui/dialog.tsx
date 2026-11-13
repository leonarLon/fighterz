"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Modal com o <dialog> nativo: foco preso, Esc fecha e o conteúdo atrás fica inerte (DESIGN_SYSTEM.md §5).
 * Abaixo de 640 px vira um "sheet" encostado na base da tela.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-0 mt-auto w-full max-w-none rounded-t-lg border border-border bg-surface p-0 text-text backdrop:bg-black/50 sm:m-auto sm:max-w-md sm:rounded-lg"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="dialog-title" className="font-display text-xl font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex size-11 items-center justify-center rounded-md text-muted hover:text-text"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{open && children}</div>
    </dialog>
  );
}
