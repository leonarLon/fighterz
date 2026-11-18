import "server-only";
import { createHash } from "node:crypto";
import {
  nominatimQuery,
  parseNominatim,
  parseViaCep,
  type Address,
  type GeocodeResult,
  type ViaCepResult,
} from "@figtherz/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// COST_ZERO_POLICY.md §3: User-Agent identificando a aplicação (nunca o padrão da biblioteca).
// Antes de publicar, defina APP_USER_AGENT com o e-mail de contato: "Fighterz/0.1 (contato: email@dominio)".
const USER_AGENT = process.env.APP_USER_AGENT || "Fighterz/0.1 (ambiente de desenvolvimento local)";
const TIMEOUT_MS = 6000;

export type GeoError = "not_found" | "user_limit" | "busy" | "unavailable";
export type GeoResult<T> = { ok: true; data: T; cached: boolean } | { ok: false; error: GeoError };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (provider: string, query: string) => createHash("sha256").update(`${provider}:${query}`).digest("hex");

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "pt-BR" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Cache primeiro (não gasta cota); depois cota do usuário e, no Nominatim, a fila global de 1 req/s. */
async function withCacheAndQuota<T>(
  supabase: Client,
  provider: "viacep" | "nominatim",
  query: string,
  url: string,
  parse: (json: unknown) => T | null,
): Promise<GeoResult<T>> {
  const key = hash(provider, query);
  const { data: hit } = await supabase.rpc("geocode_cache_get", { p_hash: key });
  if (hit) {
    const parsed = parse(hit);
    return parsed ? { ok: true, data: parsed, cached: true } : { ok: false, error: "not_found" };
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: quota } = await supabase.rpc("geocode_take_quota", { p_provider: provider });
    if (quota === "user_limit") return { ok: false, error: "user_limit" };
    if (quota === "ok") break;
    if (attempt === 3) return { ok: false, error: "busy" };
    await sleep(1100);
  }

  let json: unknown;
  try {
    json = await fetchJson(url);
  } catch {
    return { ok: false, error: "unavailable" };
  }
  // Guarda também "não encontrado", para não repetir a consulta ao serviço público.
  await supabase.rpc("geocode_cache_put", { p_hash: key, p_provider: provider, p_query: query, p_response: json as never });
  const parsed = parse(json);
  return parsed ? { ok: true, data: parsed, cached: false } : { ok: false, error: "not_found" };
}

export function lookupCep(supabase: Client, cep: string): Promise<GeoResult<ViaCepResult>> {
  return withCacheAndQuota(supabase, "viacep", cep, `https://viacep.com.br/ws/${cep}/json/`, parseViaCep);
}

export function geocodeAddress(supabase: Client, address: Address): Promise<GeoResult<GeocodeResult>> {
  const params = nominatimQuery(address);
  return withCacheAndQuota(
    supabase,
    "nominatim",
    params.toString(),
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    parseNominatim,
  );
}

export const GEO_ERROR_MESSAGES: Record<GeoError, string> = {
  not_found: "Não encontramos esse endereço. Posicione o pino no mapa manualmente.",
  user_limit: "Limite de buscas por hora atingido. Posicione o pino manualmente ou tente mais tarde.",
  busy: "O serviço de mapas está ocupado. Tente de novo em alguns segundos.",
  unavailable: "Serviço indisponível agora. Preencha o endereço e posicione o pino manualmente.",
};
