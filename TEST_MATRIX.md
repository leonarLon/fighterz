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
| Perfil comercial de academia | Bucket covers: só a gestão escreve na pasta da academia | Dono envia; outra academia, professor, visitante e caminho inválido não | Segurança (pgTAP) | `22_academy_media.test.sql` | ✅ |
| Perfil comercial de academia | Logo/banner só com arquivo enviado e da própria pasta | Pasta de outra academia e arquivo não enviado recusados; terceiro não altera | Integração (pgTAP) | `22_academy_media.test.sql` | ✅ |
| Perfil comercial de academia | Galeria com limite (12, Fase 6 liga ao plano) | Legenda normalizada, 13ª foto recusada, academia oculta não expõe, terceiro não apaga | Integração (pgTAP) | `22_academy_media.test.sql` | ✅ |
| Perfil comercial de academia | Fluxo do dono | Logo, banner e foto com legenda; visitante vê; apagar some do público (axe) | E2E | `apps/web/tests/e2e/commercial.spec.ts` | ✅ |
| Páginas de marca, loja e serviço | Criação só por função; dono + admins com aceite | Slug, dono ativo, convite/aceite, admin não convida, saída, dono não sai, membros não públicos | Segurança (pgTAP) | `23_businesses.test.sql` | ✅ |
| Páginas de marca, loja e serviço | Gestão não suspende nem se dá selo; oculta some | Status/selo negados, modalidade inválida, conta suspensa bloqueada | Segurança (pgTAP) | `23_businesses.test.sql` | ✅ |
| Páginas de marca, loja e serviço | Catálogo e promoções sem preço inventado, com limites | Pago exige valor, gratuito sem valor, inativo oculto, limite 30, cupom normalizado, datas, só vigente é pública | Integração (pgTAP) + Unitário | `23_businesses.test.sql`, `commercial.test.ts` | ✅ |
| Páginas de marca, loja e serviço | Publicar como página | Só gestão publica; post fora do perfil pessoal; aparece na página | Integração + E2E | `23_businesses.test.sql`, `commercial.spec.ts` | ✅ |
| Páginas de marca, loja e serviço | Fluxo completo | Criar (tipo obrigatório), dados, item com erro e correção, promoção, convite aceito, publicar como página, visitante vê, ocultar → 404 | E2E | `commercial.spec.ts` | ✅ |
| Páginas de marca, loja e serviço | API direta | Demo não edita, não cadastra item, não publica como a loja, não lista membros | Segurança (E2E) | `commercial.spec.ts` | ✅ |
| Planos e assinaturas | Só admin escreve planos e benefícios (auditado) | Usuário não cria/altera; benefício desconhecido recusado; visitante vê planos ativos; auditoria registra | Segurança (pgTAP) | `24_plans_subscriptions.test.sql` | ✅ |
| Planos e assinaturas | Benefício verificado no banco | Sem plano: 12/30/5; com plano: 40/100; suspensa e cancelada voltam ao padrão; destaque só com plano ativo | Integração (pgTAP) | `24_plans_subscriptions.test.sql` | ✅ |
| Planos e assinaturas | Ciclo da assinatura | Só admin cria; público do plano confere; uma aberta por entidade; motivo obrigatório; transições inválidas negadas; renovação; expiração diária (pg_cron); histórico append-only | Integração (pgTAP) | `24_plans_subscriptions.test.sql` | ✅ |
| Planos e assinaturas | Validação de entrada | Benefícios (inteiros, vazio = padrão), slug, preço só texto, datas, motivo | Unitário (Vitest) | `packages/core/src/plans.test.ts` | ✅ |
| Planos e assinaturas | Fluxo admin + dono | Criar plano (erro e correção), associar, duplicada recusada, dono vê limite 25, suspender (motivo), dono vê suspensa e limite 12, reativar, cancelar, histórico (axe) | E2E | `apps/web/tests/e2e/plans.spec.ts` | ✅ |
| Planos e assinaturas | Destaque sinalizado | Academia e página com plano aparecem primeiro com "Em destaque" | E2E | `plans.spec.ts` | ✅ |
| Planos e assinaturas | Acesso indevido | Demo recebe 404 no painel; API: não se dá plano, não insere, não altera benefício, não lê assinaturas | Segurança (E2E) | `plans.spec.ts` | ✅ |
| Professores gratuitos | Nenhum recurso de professor depende de plano | Nenhuma política das tabelas de professor cita plano/assinatura; professor sem plano cria perfil; área do professor sem menção a assinatura | pgTAP + E2E | `24_plans_subscriptions.test.sql`, `plans.spec.ts` | ✅ |
| Formulários (regressão) | Select mantém a escolha após erro de validação | Aula nova: dia escolhido continua após erro de nome e é salvo; plano criado com o público certo | E2E | `academies.spec.ts`, `plans.spec.ts` | ✅ |
| Detecção comercial | Regras explicáveis (sem IA), iguais no banco e no core | 9 textos: treino, "promoção de faixa", "vendo o treino", TotalPass/Wellhub = 0; preço/cupom/link/chamada/contato pontuam; cada ponto com código e trecho | Unitário (Vitest) + pgTAP | `packages/core/src/commercial-detection.test.ts`, `25_commercial_detection.test.sql` | ✅ |
| Detecção comercial | Só perfil pessoal; nada automático | Post pessoal comum sem sinal; post de página ignorado; 1 post comercial não abre revisão; 2 abrem; nada removido nem suspenso sozinho | Integração (pgTAP) | `25_commercial_detection.test.sql` | ✅ |
| Detecção comercial | Transparência e permissões | Pessoa vê os próprios sinais e só revisões decididas; terceiros não; só moderação decide; API não forja sinal nem lê risco | Segurança (pgTAP + E2E) | `25_commercial_detection.test.sql`, `commercial-detection.spec.ts` | ✅ |
| Detecção comercial | Decisão e recurso | Remover exige motivo; posts removidos e aviso; recurso exige explicação, um por revisão, só do dono; aceito restaura posts e marca "desfeita"; mesmo conteúdo não reabre | Integração (pgTAP) | `25_commercial_detection.test.sql` | ✅ |
| Detecção comercial | Fluxo completo | Aviso não bloqueante ao publicar; dois posts → fila com motivos; moderação remove; notificação; /revisoes com motivos (axe); recurso; aceito → posts voltam | E2E | `apps/web/tests/e2e/commercial-detection.spec.ts` | ✅ |
| Cobertura | Regras de negócio do core ≥ 80% | `npm run test:coverage -w @figtherz/core`: 94,5% instruções, 87,4% desvios, 92,3% funções, 96,0% linhas | Vitest + v8 | `packages/core/vitest.config.ts`, `business.test.ts` | ✅ |
| Painel administrativo | Página comercial denunciável e moderável | Denúncia válida/inexistente, fila com nome/link/responsável, suspender resolve denúncias, visitante não vê, dono não reativa, moderação reativa | Integração (pgTAP) | `26_admin_commercial.test.sql` | ✅ |
| Painel administrativo | Selo e histórico | Moderador não dá selo; admin dá; suspensão, reativação e selo no histórico; visão geral com números comerciais | Segurança (pgTAP) | `26_admin_commercial.test.sql` | ✅ |
| Painel administrativo | Fluxo completo | Denúncia pela interface → suspensão na fila → 404 público → aviso na gestão → reativação em Páginas → selo pelo admin → histórico (axe) | E2E | `apps/web/tests/e2e/admin-commercial.spec.ts` | ✅ |
| Painel administrativo | Papéis | Admin vê Publicidade, Páginas, Planos e Assinaturas; moderador vê Publicidade e Páginas, sem Planos/Assinaturas (404) | E2E | `admin-commercial.spec.ts` | ✅ |
