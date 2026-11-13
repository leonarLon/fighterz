import type { Metadata } from "next";
import { FormMessage } from "@/components/ui/form-message";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Termos de Uso" };

// Rascunho para o ambiente local. O texto final exige revisão jurídica antes da abertura pública.
export default function TermsPage() {
  return (
    <article className="space-y-4">
      <PageHeader title="Termos de Uso" description="Versão preliminar." />
      <FormMessage status="error" message="Rascunho: texto em elaboração, sujeito a revisão jurídica." />
      <h2 className="font-display text-2xl font-semibold">1. Quem pode usar</h2>
      <p>O Figtherz é destinado a pessoas com 18 anos ou mais. Contas de menores de idade são removidas.</p>
      <h2 className="font-display text-2xl font-semibold">2. Conteúdo</h2>
      <p>
        Você é responsável pelo que publica. Treinos e competições são conteúdo legítimo. Violência real, humilhação,
        assédio e exposição de crianças sem consentimento do responsável não são permitidos.
      </p>
      <h2 className="font-display text-2xl font-semibold">3. Denúncias e moderação</h2>
      <p>Conteúdo denunciado pode ser ocultado preventivamente até a análise da moderação.</p>
    </article>
  );
}
