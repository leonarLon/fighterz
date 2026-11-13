"use client";

import { useState } from "react";
import { Copy, Navigation, Share2 } from "lucide-react";
import { directionsLinks, formatAddress, type Address } from "@figtherz/core";

type Props = { address: Address & { latitude: number | null; longitude: number | null }; name: string };

/** Abrir rota (sem API), copiar e compartilhar o endereço (Clipboard e Web Share). */
export function AddressActions({ address, name }: Props) {
  const [notice, setNotice] = useState("");
  const text = formatAddress(address);
  const links = directionsLinks(address);

  function routeHref() {
    if (typeof navigator === "undefined") return links.osm;
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return links.android;
    if (/iphone|ipad|ipod|macintosh/i.test(ua) && "ontouchend" in document) return links.apple;
    return links.osm;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Endereço copiado.");
    } catch {
      setNotice("Não foi possível copiar.");
    }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: name, text: `${name}: ${text}` });
      else await copy();
    } catch {
      // compartilhamento cancelado
    }
  }

  const button = "inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:bg-bg";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {/* HTML inicial igual no servidor e no cliente (OSM); o link do aparelho é escolhido no clique. */}
        <a href={links.osm} target="_blank" rel="noopener" className={button} onClick={(e) => (e.currentTarget.href = routeHref())}>
          <Navigation aria-hidden className="size-4" /> Abrir rota
        </a>
        <button type="button" onClick={copy} className={button}>
          <Copy aria-hidden className="size-4" /> Copiar endereço
        </button>
        <button type="button" onClick={share} className={button}>
          <Share2 aria-hidden className="size-4" /> Compartilhar
        </button>
      </div>
      <p aria-live="polite" className="mt-1 text-[13px] text-muted empty:hidden">
        {notice}
      </p>
    </div>
  );
}
