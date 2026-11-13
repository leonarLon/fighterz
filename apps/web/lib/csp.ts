// Content Security Policy com nonce por requisição (SECURITY.md §4, endurecida na Fase 7).
// O Next lê o nonce do cabeçalho da requisição e o aplica aos próprios scripts. 'strict-dynamic' deixa esses
// scripts carregarem os chunks seguintes (ex.: Leaflet) sem liberar scripts inline injetados.

export function buildCsp(nonce: string, isDev = process.env.NODE_ENV !== "production"): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabaseUrl.replace(/^http/, "ws");
  return [
    "default-src 'self'",
    // Em desenvolvimento o React usa eval para reconstruir stacks de erro; em produção não.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Estilos inline continuam liberados: React (style={}) e Leaflet usam atributos style.
    // Um nonce aqui desligaria 'unsafe-inline' também para atributos.
    "style-src 'self' 'unsafe-inline'",
    // Tiles do OpenStreetMap (mapas) e fotos do Storage.
    `img-src 'self' data: blob: ${supabaseUrl} https://tile.openstreetmap.org`,
    "font-src 'self'",
    // Vídeos dos posts (URL assinada do Storage) e pré-visualização local (blob:).
    `media-src 'self' blob: ${supabaseUrl}`,
    `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/** 128 bits aleatórios em base64 (Web Crypto: funciona no runtime do proxy). */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
