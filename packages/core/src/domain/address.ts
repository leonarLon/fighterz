export type Address = {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  postal_code?: string | null;
};

/** Mantém só os dígitos. Retorna null se não tiver 8 dígitos. */
export function normalizeCep(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

export function formatCep(cep: string): string {
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

/** "Rua X, 120 - Sala 2 - Centro, Curitiba/PR - CEP 80020-000" */
export function formatAddress(a: Address): string {
  const streetLine = [a.street, a.number].filter(Boolean).join(', ');
  const parts = [
    [streetLine, a.complement].filter(Boolean).join(' - '),
    a.neighborhood,
    `${a.city}/${a.state}`,
  ].filter(Boolean);
  const text = parts.join(' - ');
  return a.postal_code ? `${text} - CEP ${formatCep(a.postal_code)}` : text;
}

export type ViaCepResult = { street: string; neighborhood: string; city: string; state: string; postal_code: string };

/** Interpreta a resposta da ViaCEP (https://viacep.com.br/ws/{cep}/json/). */
export function parseViaCep(json: unknown): ViaCepResult | null {
  if (!json || typeof json !== 'object' || (json as { erro?: unknown }).erro) return null;
  const data = json as Record<string, unknown>;
  const str = (key: string) => (typeof data[key] === 'string' ? (data[key] as string).trim() : '');
  const cep = normalizeCep(str('cep'));
  if (!cep || !str('localidade') || !/^[A-Z]{2}$/.test(str('uf'))) return null;
  return { street: str('logradouro'), neighborhood: str('bairro'), city: str('localidade'), state: str('uf'), postal_code: cep };
}

export type GeocodeResult = { latitude: number; longitude: number; label: string };

/** Interpreta a resposta do Nominatim (format=jsonv2). Só o 1º resultado: o usuário confirma o pino. */
export function parseNominatim(json: unknown): GeocodeResult | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const first = json[0] as Record<string, unknown>;
  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return { latitude, longitude, label: typeof first.display_name === 'string' ? first.display_name : '' };
}

/** Parâmetros de busca estruturada do Nominatim (sem autocomplete; só em clique explícito). */
export function nominatimQuery(a: Address): URLSearchParams {
  const params = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'br', addressdetails: '0' });
  const street = [a.number, a.street].filter(Boolean).join(' ');
  if (street) params.set('street', street);
  params.set('city', a.city);
  params.set('state', a.state);
  if (a.postal_code) params.set('postalcode', formatCep(a.postal_code));
  params.set('country', 'Brasil');
  return params;
}

/**
 * Links de rota sem API (ARCHITECTURE.md §5): geo: no Android, Apple Maps no iOS, OpenStreetMap no desktop.
 * Usa coordenadas quando houver; senão, o endereço em texto.
 */
export function directionsLinks(a: Address & { latitude?: number | null; longitude?: number | null }) {
  const hasCoords = a.latitude != null && a.longitude != null;
  const text = encodeURIComponent(formatAddress({ ...a, postal_code: null }));
  const coords = hasCoords ? `${a.latitude},${a.longitude}` : '';
  return {
    android: hasCoords ? `geo:${coords}?q=${coords}` : `geo:0,0?q=${text}`,
    apple: hasCoords ? `https://maps.apple.com/?daddr=${coords}` : `https://maps.apple.com/?daddr=${text}`,
    osm: hasCoords
      ? `https://www.openstreetmap.org/directions?to=${coords}#map=16/${coords.replace(',', '/')}`
      : `https://www.openstreetmap.org/search?query=${text}`,
  };
}
