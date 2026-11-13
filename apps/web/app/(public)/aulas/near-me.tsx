"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";

/**
 * Usa a localização do aparelho só para esta busca: vai na URL da consulta e nunca é gravada
 * (SECURITY.md §7: a localização do usuário não é armazenada).
 */
export function NearMeButton({ formId }: { formId: string }) {
  const [status, setStatus] = useState("");

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("Seu navegador não informa a localização. Busque por cidade ou bairro.");
      return;
    }
    setStatus("Obtendo sua localização…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const form = document.getElementById(formId) as HTMLFormElement | null;
        if (!form) return;
        (form.elements.namedItem("lat") as HTMLInputElement).value = position.coords.latitude.toFixed(4);
        (form.elements.namedItem("lng") as HTMLInputElement).value = position.coords.longitude.toFixed(4);
        form.requestSubmit();
      },
      () => setStatus("Não foi possível obter a localização. Busque por cidade ou bairro."),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={locate}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 font-semibold hover:bg-bg"
      >
        <LocateFixed aria-hidden className="size-4" /> Perto de mim
      </button>
      <p aria-live="polite" className="mt-1 text-[13px] text-muted empty:hidden">
        {status}
      </p>
    </div>
  );
}
