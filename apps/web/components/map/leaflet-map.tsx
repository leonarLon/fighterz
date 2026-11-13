"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression, Map as LeafletMap, Marker } from "leaflet";
import { cn } from "@/components/ui/cn";

export type MapMarker = { id: string; lat: number; lng: number; title: string; subtitle?: string; href?: string };

type Props = {
  markers?: MapMarker[];
  /** Modo edição: um pino arrastável; clique no mapa também posiciona. */
  editable?: { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void };
  label: string;
  className?: string;
  center?: [number, number];
};

const BRAZIL: [number, number] = [-14.235, -51.925];

// Política de tiles do OSM (COST_ZERO_POLICY.md §3): URL HTTPS exata, atribuição visível,
// sem pré-carregar nem varrer áreas. O Referer é preservado pela Referrer-Policy do site.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

/** Mapa Leaflet sem react-leaflet (licença Hippocratic). O Leaflet só é carregado no navegador. */
export function LeafletMapView({ markers = [], editable, label, className, center }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const onChange = useRef(editable?.onChange);
  const [tileError, setTileError] = useState(false);
  const editLat = editable?.lat ?? null;
  const editLng = editable?.lng ?? null;
  const isEditable = Boolean(editable);
  const markersKey = JSON.stringify(markers);

  useEffect(() => {
    onChange.current = editable?.onChange;
  });

  useEffect(() => {
    let cancelled = false;
    let instance: LeafletMap | null = null;

    void import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      const icon = L.divIcon({ className: "figtherz-pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] });
      instance = L.map(container.current, { scrollWheelZoom: false, attributionControl: true });
      map.current = instance;
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION })
        .on("tileerror", () => setTileError(true))
        .addTo(instance);

      const points: LatLngExpression[] = [];
      for (const m of JSON.parse(markersKey) as MapMarker[]) {
        const html = `<strong>${escapeHtml(m.title)}</strong>${m.subtitle ? `<br>${escapeHtml(m.subtitle)}` : ""}${
          m.href ? `<br><a href="${escapeHtml(m.href)}">Ver detalhes</a>` : ""
        }`;
        L.marker([m.lat, m.lng], { icon, title: m.title, alt: m.title, keyboard: true }).bindPopup(html).addTo(instance);
        points.push([m.lat, m.lng]);
      }

      if (isEditable) {
        const start: [number, number] | null = editLat != null && editLng != null ? [editLat, editLng] : null;
        const place = (lat: number, lng: number) => {
          if (!pin.current) {
            pin.current = L.marker([lat, lng], { icon, draggable: true, title: "Pino da unidade", alt: "Pino da unidade" }).addTo(instance!);
            pin.current.on("dragend", () => {
              const p = pin.current!.getLatLng();
              onChange.current?.(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
            });
          } else pin.current.setLatLng([lat, lng]);
        };
        if (start) place(...start);
        instance.on("click", (e) => {
          place(e.latlng.lat, e.latlng.lng);
          onChange.current?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
        });
        instance.setView(start ?? center ?? BRAZIL, start ? 16 : center ? 13 : 4);
      } else if (points.length === 1) {
        instance.setView(points[0]!, 16);
      } else if (points.length > 1) {
        instance.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
      } else {
        instance.setView(center ?? BRAZIL, center ? 12 : 4);
      }
    });

    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
      pin.current = null;
    };
    // O mapa é recriado só quando os marcadores ou o modo mudam; o pino editável se move pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, isEditable]);

  // Coordenadas digitadas nos campos (alternativa acessível ao arrastar) movem o pino.
  useEffect(() => {
    if (!isEditable || editLat == null || editLng == null || !map.current) return;
    if (pin.current) {
      pin.current.setLatLng([editLat, editLng]);
      map.current.panTo([editLat, editLng]);
    }
  }, [editLat, editLng, isEditable]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
      <div ref={container} role="region" aria-label={label} className="h-full min-h-64 w-full bg-bg" />
      {tileError && (
        <p role="status" className="absolute inset-x-2 top-2 z-[500] rounded-md bg-surface px-3 py-2 text-[13px] shadow">
          Não foi possível carregar o mapa. O endereço continua disponível abaixo.
        </p>
      )}
    </div>
  );
}
