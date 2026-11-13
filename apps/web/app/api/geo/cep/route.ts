import { NextResponse, type NextRequest } from "next/server";
import { normalizeCep } from "@figtherz/core";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GEO_ERROR_MESSAGES, lookupCep } from "@/lib/geo";

// Proxy da ViaCEP: o navegador nunca chama o serviço direto (cache + cota no banco).
export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Entre para buscar CEP." }, { status: 401 });
  const cep = normalizeCep(request.nextUrl.searchParams.get("cep") ?? "");
  if (!cep) return NextResponse.json({ error: "CEP deve ter 8 dígitos." }, { status: 400 });

  const result = await lookupCep(await createClient(), cep);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "user_limit" ? 429 : 503;
    const message = result.error === "not_found" ? "CEP não encontrado. Preencha o endereço manualmente." : GEO_ERROR_MESSAGES[result.error];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(result.data);
}
