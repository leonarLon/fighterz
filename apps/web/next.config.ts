import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// A Content-Security-Policy (com nonce por requisição) é aplicada no proxy.ts: veja lib/csp.ts.

const nextConfig: NextConfig = {
  // Cache Components fica desligado na Fase 2: quase toda rota depende da sessão (cookie)
  // e o tema é lido do cookie no layout raiz. Reavaliar quando houver páginas públicas cacheáveis.
  transpilePackages: ["@figtherz/core"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
