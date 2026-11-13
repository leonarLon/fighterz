import type { Metadata } from "next";
import { FormMessage } from "@/components/ui/form-message";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Política de Privacidade" };

// Rascunho alinhado a SECURITY.md §7. O texto final exige revisão jurídica antes da abertura pública.
export default function PrivacyPage() {
  return (
    <article className="space-y-4">
      <PageHeader title="Política de Privacidade" description="Versão preliminar." />
      <FormMessage status="error" message="Rascunho: texto em elaboração, sujeito a revisão jurídica." />
      <h2 className="font-display text-2xl font-semibold">Dados que coletamos</h2>
      <p>
        E-mail, nome, nome de usuário e data de nascimento (usada só para confirmar a idade mínima e nunca exibida).
        Não coletamos CPF, documentos, gênero ou sua localização.
      </p>
      <h2 className="font-display text-2xl font-semibold">Seus direitos (LGPD)</h2>
      <p>
        Você pode corrigir seus dados no perfil e excluir sua conta a qualquer momento em Configurações. A exclusão
        apaga seu perfil e seu conteúdo.
      </p>
    </article>
  );
}
