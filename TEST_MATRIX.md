# Matriz de rastreabilidade de testes

> Criada em 21/11/2026 (plano em `PLANO_EVOLUCAO_COMERCIAL.md`). Atualizada a cada fase. Status: ✅ passou na última execução · ⬜ planejado.

| Funcionalidade | Requisito / regra | Cenário | Tipo | Arquivo | Status |
|---|---|---|---|---|---|
| Graduação | Atual = maior faixa e grau | Faixa maior com data anterior vira a atual (o bug) | Integração (pgTAP) | `supabase/tests/database/20_current_rank.test.sql` | ✅ |
| Graduação | Faixas não regridem | Faixa menor com data mais nova não rebaixa | Integração | `20_current_rank.test.sql` | ✅ |
| Graduação | Grau decide na mesma faixa | Roxa 2 graus vence roxa 0 | Integração | `20_current_rank.test.sql` | ✅ |
| Graduação | Modalidades independentes | Judô não sobrescreve BJJ | Integração | `20_current_rank.test.sql` | ✅ |
| Graduação | Correção de registro | Editar registro recalcula a atual | Integração | `20_current_rank.test.sql` | ✅ |
| Graduação | Apagar registro | Apagar o maior volta ao próximo maior | Integração | `20_current_rank.test.sql` | ✅ |
| Graduação | Só o dono escreve | Terceiro não altera, não apaga, não insere | Segurança (RLS) | `20_current_rank.test.sql` | ✅ |
| Graduação | Graus válidos, data não futura, professor aprovado, confirmação desfeita ao editar | Regras da Fase 5 | Integração | `13_journey.test.sql` | ✅ |
| Graduação | Fluxo completo do usuário | Registrar, faixa antiga vira atual, corrigir, recarregar, sair, entrar, perfil | E2E (desktop + celular, axe) | `apps/web/tests/e2e/journey.spec.ts` | ✅ |
| Graduação | Confirmação do professor | Aluno registra, professor confirma | E2E | `journey.spec.ts` | ✅ |
| TotalPass / Wellhub / diária | Por unidade, só gestor (owner/admin) escreve | Dono e admin cadastram; professor, aluno e terceiros não; gestor de outra academia não; academy_id forjado é corrigido | Segurança (pgTAP) | `21_unit_access.test.sql` | ✅ |
| TotalPass / Wellhub / diária | Nada de preço inventado | Paga exige valor; gratuita/não divulgada sem valor; TotalPass sem preço; sem diária limpa o status | Integração (pgTAP) | `21_unit_access.test.sql` | ✅ |
| TotalPass / Wellhub / diária | Validação de entrada | Valor em reais ("1.200,00", "R$ 35,90"), planos (repetidos, longos, >10), limites de texto | Unitário (Vitest) | `packages/core/src/commercial.test.ts` | ✅ |
| TotalPass / Wellhub / diária | Exibição pública e privacidade | Visitante vê; academia oculta não expõe; conta suspensa não altera | Integração | `21_unit_access.test.sql` | ✅ |
| TotalPass / Wellhub / diária | Fluxo do dono + persistência | Informar, erro de valor, corrigir, salvar, recarregar, visitante vê (axe) | E2E | `apps/web/tests/e2e/academies.spec.ts` | ✅ |
| TotalPass / Wellhub / diária | Regressão do formulário | Após erro de validação a caixa "oferece diária" não é perdida | E2E | `academies.spec.ts` | ✅ |
| TotalPass / Wellhub / diária | API direta | Demo não insere nem altera | Segurança (E2E) | `academies.spec.ts` | ✅ |
| Professor cita planos aceitos | Texto opcional (até 500), só o dono edita, público só se aprovado, sem custo | Professor informa, limite, terceiro não altera, pendente não aparece, visitante vê | pgTAP + Vitest | `21_unit_access.test.sql`, `academy.test.ts` | ✅ |
| Professor cita planos aceitos | Fluxo completo | Pedido com planos, aprovação, campo mantido, visitante vê em /professores | E2E | `academies.spec.ts` | ✅ |
| Perfil comercial de academia | Banner, galeria, limites por plano | — | pgTAP + E2E | — | ⬜ Fase 5 |
| Páginas de marca, loja e serviço | Membros owner/admin, catálogo, promoções | — | pgTAP + E2E | — | ⬜ Fase 5 |
| Planos e assinaturas | Só admin escreve; benefício verificado no banco | — | pgTAP + E2E | — | ⬜ Fase 6 |
| Professores gratuitos | Nenhum recurso de professor depende de plano | — | pgTAP + E2E | — | ⬜ Fase 6 |
| Detecção comercial | Score explicável, sem punição automática, recurso | — | Vitest + pgTAP + E2E | — | ⬜ Fase 7 |
| Painel administrativo | Ações autorizadas no banco e auditadas | — | pgTAP + E2E | — | ⬜ Fase 8 |
