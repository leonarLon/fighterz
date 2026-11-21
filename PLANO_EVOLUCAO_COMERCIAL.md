# Plano de evolução: comercial, planos e correções (21/11/2026)

> Status: **Fases 1 e 2 concluídas. Decisões do usuário (21/11/2026): graduação atual = maior faixa e grau; marcas/lojas/serviços como página separada; execução fase a fase. Fase 3 (graduação) implementada localmente.** Cada fase abaixo só começa com o "pode seguir" do usuário. Migrations remotas e publicação continuam exigindo autorização separada.

## 1. Auditoria: o que já existe e será reaproveitado

| Área | Situação atual | Reaproveitamento |
|---|---|---|
| Academias | `academies` (com `logo_path` e `cover_path` **sem upload implementado**), `academy_units` (endereço, PostGIS), `academy_memberships` (owner/admin/teacher/student com aceite mútuo), `class_schedules`, selo `is_verified` | Base do **perfil comercial de academia**: não criar tabela paralela. Unidades recebem as informações de TotalPass, Wellhub e diária |
| Permissões de academia | `is_academy_manager()` (owner/admin) e `is_academy_owner()` no banco | Usadas nas novas políticas RLS. Professor só edita a academia se o dono o promover a admin (regra existente) |
| Professores | `teacher_profiles` com aprovação admin, grade, vínculo com academias: **tudo gratuito** | Nada muda. Testes novos garantem que nenhum recurso de professor passa a depender de plano |
| Jornada | `user_martial_arts`, `rank_promotions` (histórico com confirmação do professor), `refresh_current_rank()` | Correção do bug (seção 2) |
| Moderação | `reports` com prioridade, `moderation_actions` (append-only), suspensão, `/admin` com papéis | Detecção comercial alimenta a mesma fila. Recursos (apelações) viram um tipo novo de registro ligado à ação |
| Mídia | Buckets `post-media` (privado) e `avatars` (público); processamento no aparelho; limpeza por pg_cron | Novo bucket `covers` (público) para logo/banner/galeria de páginas comerciais. A pendência "bucket covers" do roadmap é resolvida aqui |
| Admin | `/admin` com visão geral, denúncias, usuários, professores, academias, eventos, modalidades, histórico, configurações | Novas seções: Páginas comerciais, Planos, Assinaturas, Publicidade indevida, Recursos |
| Testes | pgTAP 349, Vitest 46, Playwright 110 (+18 pulados), axe em todas as telas novas | Mesmas ferramentas. Única dependência nova proposta: `@vitest/coverage-v8` (MIT, local, sem serviço) |

## 2. Bug de graduação: causa real (reproduzida)

- **Regra atual:** a graduação atual é a promoção com **data mais recente** (`refresh_current_rank`: `order by promoted_on desc`).
- **Reprodução (banco local, transação desfeita):** demo é Faixa Azul 3 graus com registro de 29/10/2026. Registrar "Faixa Roxa" com data anterior → continua **Faixa Azul** e o site responde "Graduação registrada". Registrar a mesma roxa com a data de hoje → vira Faixa Roxa.
- **Por que acontece com usuários reais:** quem corrige ou completa o histórico registra faixas com datas passadas; a faixa nova nunca vira a atual e não há aviso nem forma de editar um registro.
- **Correção proposta (decisão do usuário):**
  - **A (recomendada):** graduação atual = **maior faixa e grau** registrados (`ordinal desc, degree desc, promoted_on desc`). Faixas não regridem; o histórico fica intacto.
  - **B:** manter "mais recente", mas avisar quando o registro não vira o atual e permitir editar data/faixa de um registro.
  - Nos dois casos: editar registro existente (hoje só dá para apagar), mensagem clara de qual é a graduação atual depois de salvar, e teste de regressão que reproduz o caso.

## 3. Conflitos do pedido com as regras do projeto

| Pedido | Regra | Proposta |
|---|---|---|
| "IA local gratuita, se viável" na detecção comercial | **Sem IA** (`AI_ARCHITECTURE.md`) | Só regras e heurísticas explicáveis (cada ponto do score tem um motivo legível). Reabrir IA exige nova decisão |
| Planos com "preço de referência" | Custo zero, sem gateway | Preço é só texto informativo. Nenhuma tela diz que algo foi pago; ativação é manual pelo admin |
| Banners, fotos e vídeos comerciais | Storage gratuito do Supabase: 1 GB no total | Limites por plano (quantidade e tamanho), processamento no aparelho como hoje, vídeo comercial reaproveita as regras dos posts |
| Cobertura de 80–90% | — | Medida no `packages/core` e nas regras de negócio (Vitest). Regras de banco são cobertas por pgTAP (não entram no percentual). E2E não gera cobertura de linha |

## 4. Arquitetura proposta

**Página comercial** é uma entidade separada do perfil pessoal, administrada por uma ou mais contas, como já acontece com academias:

- **Academia** continua sendo `academies` (já tem dono, admins, logo, capa, links). Ganha recursos comerciais.
- **Marca, loja ou serviço** vira uma tabela nova `businesses` com o mesmo desenho de `academies`: `business_members` (owner/admin), categoria, logo, banner, descrição, links, contato, catálogo (`business_items`: produto ou serviço com preço informativo e link externo) e promoções.
- **Publicações comerciais:** posts ganham um "publicar como página" opcional (`posts.business_id` / `posts.academy_id` já existe para check-in). Conteúdo comercial sai do perfil pessoal e vai para a página.
- **Planos:** `plans` (nome, preço de referência em texto, ativo) + `plan_features` (chave do benefício e limite, ex.: `banner`, `gallery_photos=20`, `promotions=5`, `catalog_items=50`, `metrics`). `subscriptions` liga um plano a uma academia **ou** a uma página (`academy_id` / `business_id`, exatamente um preenchido), com status `active | suspended | cancelled | expired`, início, fim, e `subscription_events` (histórico append-only, quem fez e por quê). Expiração automática por pg_cron. Usuário **nunca** escreve nessas tabelas.
- **Verificação de benefício no banco:** função `entitlement(entidade, chave)` usada nas políticas e triggers (ex.: inserir a 21ª foto da galeria com limite 20 falha no banco). A interface só esconde o que o banco já nega.
- **Sem plano:** academia continua com tudo que tem hoje (grade, unidades, professores, TotalPass/Wellhub/diária). Plano libera só o que é novo (banner, galeria, promoções, catálogo grande, métricas, destaque na busca).

**TotalPass, Wellhub e diária** numa tabela `academy_unit_access` (uma linha por unidade e tipo `totalpass | wellhub | day_pass`): aceita (sim/não), planos aceitos, modalidades (ids), restrições, horários de acesso, observações, e para diária `price_status` (`paid | free | undisclosed`) + valor em centavos só quando `paid`. `updated_at`/`updated_by` para "última atualização". Escrita só por `is_academy_manager`. Nenhum preço é inventado: sem informação, a página mostra "não informado".

**Detecção de publicidade indevida** (heurística, sem IA):
- Sinais por post e por perfil pessoal: links de loja/checkout, cupom (`CUPOM`, `% OFF`, código promocional), preço (`R$`), chamada de venda ("compre", "encomende", "chama no direct"), contato comercial na bio, repetição do mesmo texto/link, frequência de posts com sinais, perfil que se apresenta como marca.
- Contexto reduz score: foto de treino, competição, check-in, relato pessoal sem link nem preço.
- `commercial_signals` (append-only, com o motivo de cada ponto) e `commercial_risk` por perfil (score 0–100 com decaimento). Acima do limiar entra na fila do admin. **Nunca** suspende sozinho.
- Admin decide: ignorar, avisar (notificação "crie uma página comercial"), ocultar post, aplicar moderação existente. A pessoa pode **recorrer** (`appeals`), e a decisão vai para `moderation_actions`.
- Roda no banco (trigger no post + pg_cron diário), sem scraping externo e sem análise de imagem.

## 5. Migrations previstas (locais primeiro, remotas só com autorização)

| # | Conteúdo |
|---|---|
| 20 | Graduação: nova regra de graduação atual + edição de registro |
| 21 | `academy_unit_access` (TotalPass, Wellhub, diária) + RLS + view pública |
| 22 | Bucket `covers`, upload de logo/banner/galeria de academia (`academy_media`) |
| 23 | `businesses`, `business_members`, `business_items`, `business_promotions`, `posts.business_id` + RLS |
| 24 | `plans`, `plan_features`, `subscriptions`, `subscription_events`, `entitlement()`, expiração por pg_cron |
| 25 | `commercial_signals`, `commercial_risk`, `appeals`, funções de revisão, auditoria |

Todas aditivas (nenhuma coluna existente é apagada). Toda view nova com `revoke insert, update, delete` (teste `16_rls_review`).

## 6. Plano de testes

- **pgTAP (integração com banco local):** RLS de cada tabela nova (dono, admin da academia, professor, aluno, visitante, admin da plataforma), IDOR (editar unidade/página de outro), usuário tentando se dar plano ou mudar assinatura, limites por plano, assinatura suspensa/expirada bloqueando benefício, graduação de terceiros, injeção nos campos de texto.
- **Vitest:** regras do score comercial (casos pessoais que **não** podem pontuar e casos comerciais que devem), validação de preço/diária, limites de plano, graduação atual, formulários (schemas Zod). Cobertura com `@vitest/coverage-v8` no `packages/core`.
- **Playwright (desktop + Pixel 7, axe):** os 8 fluxos do pedido (graduação com logout/login; unidade com TotalPass/Wellhub/diária; perfil comercial de academia; página de marca; plano criado, associado, suspenso e reativado; professor gratuito; publicidade pessoal × comercial com revisão e recurso; administração com histórico).
- **Regressão:** suíte completa a cada fase.
- **Matriz de rastreabilidade:** `TEST_MATRIX.md` (funcionalidade → requisito → cenário → tipo → arquivo → status), criada na Fase 3 e atualizada a cada fase.

## 7. Ordem de execução e pontos de autorização

| Fase | Entrega | Precisa de autorização para |
|---|---|---|
| 3 | Bug de graduação | migration 20 remota + deploy |
| 4 | TotalPass, Wellhub, diária | migration 21 remota + deploy |
| 5 | Perfil comercial de academia (mídia) + páginas de marca/loja/serviço | migrations 22–23 + deploy |
| 6 | Planos e assinaturas (admin) | migration 24 + deploy |
| 7 | Detecção comercial, revisão e recursos | migration 25 + deploy |
| 8 | Painel admin integrado | deploy |
| 9–10 | Regressão completa, cobertura, documentação, relatório | — |

## 8. Riscos

- **Storage gratuito (1 GB):** galerias e vídeos comerciais podem esgotar a cota. Mitigação: limites por plano e painel de uso no admin.
- **Uso comercial na Vercel Hobby:** os termos da Vercel proíbem uso comercial no plano gratuito. Ativar planos com cobrança real (mesmo fora da plataforma) exigirá mudar de hospedagem. Registrado em `COST_ZERO_POLICY.md`.
- **Falsos positivos na detecção:** por isso nada é automático; admin revisa e a pessoa pode recorrer.
- **Escopo:** é a maior mudança desde a Fase 4. Fases independentes permitem publicar e validar uma de cada vez.

## 9. Checklist

| Funcionalidade | Analisado | Planejado | Implementado | Unit | Integração | E2E | Segurança | Regressão | Docs | Validado |
|---|---|---|---|---|---|---|---|---|---|---|
| Bug de graduação | ✅ (reproduzido) | ✅ | ✅ (publicado 21/11) | — (regra no banco) | ✅ pgTAP 20 | ✅ | ✅ RLS | ✅ suíte completa | ✅ | ✅ |
| TotalPass / Wellhub / diária | ✅ | ✅ | ✅ (publicado 21/11) | ✅ | ✅ pgTAP 21 | ✅ | ✅ RLS + API | ✅ suíte completa | ✅ | ✅ |
| Perfil comercial de academia | ✅ | ✅ | ✅ (publicado 21/11) | — | ✅ pgTAP 22 | ✅ | ✅ RLS + Storage | ✅ suíte completa | ✅ | ✅ |
| Páginas de marca, loja e serviço | ✅ | ✅ | ✅ (publicado 21/11) | ✅ | ✅ pgTAP 23 | ✅ | ✅ RLS + API | ✅ suíte completa | ✅ | ✅ |
| Planos e assinaturas | ✅ | ✅ | ✅ (publicado 22/11) | ✅ | ✅ pgTAP 24 | ✅ | ✅ RLS + API | ✅ suíte completa | ✅ | ✅ |
| Professores gratuitos | ✅ | ✅ | ✅ (sem mudança) | — | ✅ pgTAP 24 | ✅ | ✅ | ✅ suíte completa | ✅ | ✅ |
| Detecção de publicidade indevida | ✅ | ✅ | ✅ (publicado 22/11) | ✅ | ✅ pgTAP 25 | ✅ | ✅ RLS + API | ✅ suíte completa | ✅ | ✅ |
| Painel administrativo | ✅ | ✅ | ✅ (local) | — | ✅ pgTAP 26 | ✅ | ✅ papéis | ✅ suíte completa | ✅ | ⬜ aceite + produção |
| Cobertura e documentação | ✅ | ✅ | ⬜ | — | — | — | — | — | ⬜ | ⬜ |
