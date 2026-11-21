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
| TotalPass / Wellhub / diária | Por unidade, só gestor escreve | — | pgTAP + E2E | — | ⬜ Fase 4 |
| Perfil comercial de academia | Banner, galeria, limites por plano | — | pgTAP + E2E | — | ⬜ Fase 5 |
| Páginas de marca, loja e serviço | Membros owner/admin, catálogo, promoções | — | pgTAP + E2E | — | ⬜ Fase 5 |
| Planos e assinaturas | Só admin escreve; benefício verificado no banco | — | pgTAP + E2E | — | ⬜ Fase 6 |
| Professores gratuitos | Nenhum recurso de professor depende de plano | — | pgTAP + E2E | — | ⬜ Fase 6 |
| Detecção comercial | Score explicável, sem punição automática, recurso | — | Vitest + pgTAP + E2E | — | ⬜ Fase 7 |
| Painel administrativo | Ações autorizadas no banco e auditadas | — | pgTAP + E2E | — | ⬜ Fase 8 |
