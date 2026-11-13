import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BRAZILIAN_STATES } from "@figtherz/core";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GEO_ERROR_MESSAGES, geocodeAddress } from "@/lib/geo";

const bodySchema = z.object({
  street: z.string().trim().max(120).optional(),
  number: z.string().trim().max(20).optional(),
  neighborhood: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.enum(BRAZILIAN_STATES),
  postal_code: z.string().regex(/^\d{8}$/).optional().or(z.literal("")),
});

// Proxy do Nominatim. Só dispara em clique explícito ("Localizar no mapa"): autocomplete é proibido.
// O resultado é só uma sugestão; a coordenada salva é a que o usuário confirma no mapa.
export async function POST(request: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Entre para localizar endereços." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Preencha ao menos cidade e estado." }, { status: 400 });

  const result = await geocodeAddress(await createClient(), { ...parsed.data, postal_code: parsed.data.postal_code || null });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "user_limit" ? 429 : 503;
    return NextResponse.json({ error: GEO_ERROR_MESSAGES[result.error] }, { status });
  }
  return NextResponse.json(result.data);
}
