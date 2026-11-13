"use client";

import dynamic from "next/dynamic";

// Leaflet usa window: carrega só no navegador, com um esqueleto enquanto isso.
export const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMapView), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg border border-border bg-bg" aria-hidden />,
});

export type { MapMarker } from "./leaflet-map";
