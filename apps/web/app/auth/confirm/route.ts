import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routes, safeNextPath } from "@/lib/routes";

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "email_change"];

// Destino dos links de e-mail (templates em supabase/templates). Usa token_hash, então
// funciona mesmo se o link for aberto em outro navegador ou dispositivo.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? routes.resetPassword : routes.feed;
  const next = safeNextPath(searchParams.get("next"), fallback);

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const failure = new URL(routes.signIn, request.url);
  failure.searchParams.set("erro", "link-invalido");
  return NextResponse.redirect(failure);
}
