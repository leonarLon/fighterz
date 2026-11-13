import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_ONLY, PROTECTED_PREFIXES, matchesPrefix, routes } from "@/lib/routes";

// Renova a sessão do Supabase em cada navegação e protege rotas.
// É só uma camada de UX: cada Server Action e o RLS verificam a sessão de novo.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // getClaims valida o JWT. Não colocar código entre a criação do cliente e esta chamada.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!isSignedIn && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const redirect = redirectTo(routes.signIn);
    const url = new URL(redirect.headers.get("location")!);
    url.searchParams.set("next", pathname + search);
    redirect.headers.set("location", url.toString());
    return redirect;
  }

  if (isSignedIn && (pathname === routes.home || matchesPrefix(pathname, GUEST_ONLY))) {
    return redirectTo(routes.feed);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff2?)$).*)"],
};
