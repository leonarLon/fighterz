import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { readThemeCookie } from "@/lib/theme";
import { Announcement } from "@/components/announcement";
import "./globals.css";

// next/font baixa as fontes no build e as serve do próprio site (sem requisição ao Google em runtime).
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Figtherz", template: "%s · Figtherz" },
  description: "A rede social das artes marciais: alunos, professores e academias.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E10" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tema lido do cookie no servidor: a 1ª renderização já sai com o tema certo, sem flash.
  const theme = await readThemeCookie();
  return (
    <html lang="pt-BR" data-theme={theme} className={`${inter.variable} ${barlow.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-text">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold"
        >
          Pular para o conteúdo
        </a>
        <Announcement />
        {children}
      </body>
    </html>
  );
}
