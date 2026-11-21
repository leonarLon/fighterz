# Fighterz (antigo Figtherz): contexto para o Claude Code

Rede social de artes marciais (alunos, professores, academias). Idioma do projeto e das conversas: **português (Brasil)**.

## Regras inegociáveis
- **Custo zero**: nenhum serviço pago, trial, cartão ou API comercial. Toda tecnologia nova passa pelo checklist de `COST_ZERO_POLICY.md`.
- **Sem IA**: removida do escopo (ver `AI_ARCHITECTURE.md`).
- **Pedir autorização antes de**: criar/alterar recursos remotos no Supabase, rodar migrations remotas, publicar, excluir dados, alterar contas externas. O desenvolvimento é **100% local** (Supabase CLI + Docker).
- Permissões sempre no banco (RLS), nunca só no frontend.
- Somente maiores de 18 anos podem criar conta (ECA Digital, ver `SECURITY.md` §6).

## Decisões aprovadas (13/11/2026)
Stack Next.js 16 + Tailwind 4 + Supabase local + Leaflet/OSM · 18+ · limites de mídia (10 fotos/post, vídeo ≤ 60 s / 25 MB) · MVP = Fases 2 + 3 (sem vídeo) + 4 · nome **Figtherz**. Detalhes em `PRODUCT_ROADMAP.md`.

## Ambiente
- Windows 11, Node 24, npm workspaces. Projeto em `C:\dev\figtherz` (movido do OneDrive).
- WSL2 e Docker Desktop instalados.
- No Claude Code, o Bash pode não ter acesso à rede: use o PowerShell para `npm`/`npx`.
- `apps/web/AGENTS.md`: o Next.js 16 tem mudanças incompatíveis. Consultar `node_modules/next/dist/docs/` antes de escrever código do Next.

## Estado atual
- Fase 1 (documentação) concluída e aprovada. Primeiro commit (Fases 1 + 2) enviado para `origin/main` em 13/11/2026.
- Fase 2 (fundação) **aceita em 13/11/2026**. Verificações verdes: pgTAP 64, Vitest 13 (core 10 + web 3), Playwright 41 (desktop + mobile, com axe), typecheck, lint e `next build`.
  - `supabase/migrations/`: extensões e helpers, profiles/user_settings/user_roles/admin_audit_log, martial_arts/ranks, catálogo de modalidades (em migration, não no seed), rate_limits.
  - `supabase/seed.sql`: só contas de demonstração locais. `supabase/templates/`: e-mails pt-BR com `token_hash` → `/auth/confirm`.
  - `packages/core`: schemas Zod (auth, perfil), idade, senha, tema, tipos gerados do banco.
  - `apps/web`: `proxy.ts` (o antigo middleware), Server Actions em `app/actions/`, grupos `(auth)`, `(app)` e `(public)`, design system em `components/ui`.

- Fase 3 (rede social) **aceita em 13/11/2026**. Verificações verdes: pgTAP 156, Vitest 21 (core 18 + web 3), Playwright 55 (+7 pulados de propósito no mobile), typecheck, lint e build.
  - Migrations 06–09: grafo social (bloqueios, follows com solicitação), posts/mídia/marcações/curtidas/comentários/salvos, notificações (Realtime) e denúncias com ocultação preventiva, Storage e funções de leitura.
  - Seed local: 25 atletas (`atleta1..25@figtherz.local`, senha `Figtherz123`), 1.000 posts, follows, curtidas e comentários.

- Fase 4 (professores e academias) **aceita em 13/11/2026**. Verificações verdes: pgTAP 212, Vitest 33 (core 30 + web 3), Playwright 75 (+11 pulados de propósito no mobile), typecheck, lint e build.
  - Migrations 10–12: teacher_profiles (aprovação admin, view pública `teacher_cards`), academias/unidades (PostGIS)/vínculos/seguidores/grade, geocode_cache, funções de vínculo com aceite mútuo, `search_classes`, `get_teacher_schedule`.
  - Seed: 4 academias fictícias, 12 aulas; atleta2 é professor em 3 academias (aceite); atleta7 tem pedido pendente; admin@figtherz.local aprova em /admin/professores.

- Fase 5 (evolução e comunidade esportiva) **aceita em 13/11/2026**. Verificações verdes: pgTAP 280, Vitest 42 (core 39 + web 3), Playwright 87 (+13 pulados de propósito no mobile), typecheck, lint e build.
  - Migrations 13–14: jornada (modalidades do atleta, `rank_promotions` com graus validados e confirmação do professor, conquistas, `training_checkins` + `create_checkin` com post opcional) e eventos (interesse/salvar, aviso de cancelamento).
  - Telas: `/jornada` (graduações, calendário de treinos, conquistas), `/jornada/treino`, `/eventos`, `/eventos/[id]`, `/eventos/novo`, fila "Graduações para confirmar" em `/professor`, jornada no perfil público, privacidade da jornada em Configurações.
  - Seed: demo é faixa azul (2 graus confirmados por atleta2, 3º grau aguardando), tem treinos, conquistas e interesse no seminário do atleta2; 3 eventos publicados e 1 rascunho.

- Fase 6 (administração e segurança) **aceita em 13/11/2026**. Verificações verdes: pgTAP 325, Vitest 42 (core 39 + web 3), Playwright 97 (+15 pulados de propósito no mobile), typecheck, lint e build.
  - Migration 15: `moderation_actions` (append-only), suspensão com prazo (login bloqueado via `banned_until`, escrita negada por trigger, expiração por pg_cron), fila de denúncias, `moderate_content`/`close_reports`, selo de academia, `platform_settings` (cadastros abertos, aviso no topo), denúncia de academia e evento.
  - `/admin`: visão geral, denúncias, usuários (papéis só para superadmin), professores, academias, eventos, modalidades, histórico e configurações.
  - Seed: `moderador@figtherz.local` (moderador) e denúncias de exemplo (post do atleta25 com segurança de menores, perfil do atleta24 por spam).

- Fase 7 (finalização) **aceita em 14/11/2026**. Verificações verdes: pgTAP 340, Vitest 45 (core 42 + web 3), Playwright 105 (+17 pulados de propósito), typecheck, lint e build.
  - Migrations 16–18: vídeo em posts (pedido do usuário; até 60 s / 25 MB, 1 por post, miniatura), bucket `avatars`, purga após 30 dias + fila de limpeza do Storage (pg_cron).
  - CSP com nonce no `proxy.ts` (`lib/csp.ts`), verificada também em build de produção.
  - Seed: 7 professores aprovados (atleta2, 6, 14–18) + 1 pendente. `npm run db:seed-media` gera 79 fotos, 8 vídeos e 26 fotos de perfil localmente (Chromium do Playwright).
  - Docs: README (contas de demonstração), `DEPLOYMENT.md` §8 (checklist de publicação), `MOBILE_PLAN.md` (PWA primeiro, Expo depois).

## Publicação (14/11/2026)
- Supabase remoto: projeto `wdntjflsjzgkdktemrdo` (linkado). 18 migrations aplicadas; seed e mídia de demonstração levados a pedido do usuário. Atletas/demo com `Figtherz123`; admin e moderador com senha privada.
- App na Vercel (Root Directory `apps/web`); variáveis em `DEPLOYMENT.md` §8. Mudança de schema: `npx supabase db push --linked` só com autorização.

## Ajustes pós-publicação (18/11/2026, feedback de produção)
- Nome público **Fighterz** (logo, títulos, e-mails, termos). Pacotes, pasta, `project_id` e contas `@figtherz.local` continuam com o nome antigo.
- Cadastro pede **idade** (campo numérico) em vez da data de nascimento: migration 19 (`user_settings.declared_age`, `birth_date` opcional; `handle_new_user` aceita `age` ou `birth_date`). A migration remota precisa ir **antes** do deploy do código.
- E-mails de cadastro e recuperação: o SMTP embutido do Supabase tem limite muito baixo por hora (erro `over_email_send_rate_limit`). Solução: SMTP próprio gratuito configurado no painel do Supabase. As actions agora registram o erro nos logs (`console.error`) e a recuperação não mostra mais "sucesso" quando o envio falha.
- Foto: `decodeImage` tenta `createImageBitmap` e cai para `<img>` (Safari antigo, HEIC). Input aceita `image/*`.
- Sugestões do Início vazio: autores dos posts em alta primeiro; seguir pela lista usa `follow(id, { refresh: false })` (revalidar na action re-renderiza a página e a lista sumia).
- Perfil próprio: botões Publicar/Editar, atalhos (registrar treino, graduação, conquista), Jornada com "Gerenciar" e convite quando vazia, seção "Publicações" com convite para o primeiro post. Jornada e posts em `Suspense` (o topo aparece antes). O nome no rodapé da barra lateral leva ao perfil, não à edição.
- Lentidão: as funções da Vercel rodavam em `iad1` (EUA) e o banco está em `sa-east-1`. `apps/web/vercel.json` fixa `regions: ["gru1"]` (permitido no Hobby).
- `loading.tsx` só em páginas que não usam `notFound()` (início, explorar, jornada, notificações, perfil): com streaming o status já foi enviado e o 404 vira 200. O painel admin precisa do 404 (Fase 6), então o grupo `(app)` não tem `loading.tsx`. Perfil inexistente passa a responder 200 com a tela de "não encontrado" (o Next marca `noindex`).
- Seguidores: `/u/[username]/seguidores` e `/u/[username]/seguindo` (50 por página, `?pagina=`). Dono remove seguidor (`removeFollower`), deixa de seguir, aceita/recusa pedidos e cancela pedidos enviados; ações sem revalidar (a linha muda localmente). Sem migration: a RLS de `follows` já permitia. Perfil privado esconde as listas na interface, mas follows aceitos continuam legíveis pela API (decisão da Fase 3).
- Links de e-mail: `/auth/confirm` aceita `token_hash` (nossos modelos) e `code` (modelo padrão do Supabase, PKCE). `emailRedirectTo`/`redirectTo` apontam para `/auth/confirm?next=...`; Redirect URLs no painel: `https://fighterz-mu.vercel.app/**`.
- **Evolução comercial (21/11/2026):** plano em `PLANO_EVOLUCAO_COMERCIAL.md`, matriz em `TEST_MATRIX.md`. Decisões: graduação atual = maior faixa e grau; marcas/lojas/serviços como página separada (como academias); execução fase a fase; detecção comercial só com heurísticas (regra "sem IA").
- Graduação: migration 20 muda `refresh_current_rank` para `ordinal desc, degree desc, promoted_on desc` e recalcula todos. `addPromotion` também corrige registro (`promotionId`) e devolve a graduação atual na mensagem. Botão "Corrigir" no histórico da /jornada.
- TotalPass/Wellhub/diária: migration 21 (`academy_unit_access`, uma linha por unidade e tipo). `saveUnitAccess` faz update-ou-insert (sem upsert: o UPDATE não tem grant em `unit_id`/`kind`). Valores em centavos; `parseBrl`/`formatBrl` no core. Formulário em Gerenciar → Unidades; exibição em `components/academy/unit-access-info.tsx`. A mesma migration cria `teacher_profiles.access_plans` (≤ 500, texto livre: "Planos aceitos onde dou aula", pedido do usuário) e acrescenta a coluna no fim da view `teacher_cards`. A detecção comercial (Fase 7) não deve tratar esse campo como propaganda.
- Fase 5 comercial (migrations 22–23): bucket público `covers` (3 MB, webp/jpg) com caminhos `<academy|business>/<id>/<logo|banner|gallery|item>-<aleatório>`; `can_manage_cover_path()` decide a escrita. Logo/banner exigem arquivo já enviado (`cover_object_exists`). Galeria `academy_photos` (limite 12), páginas `businesses` (marca/loja/serviço) com `business_members` (dono + admins com aceite, lista não pública), `business_items` (30), `business_promotions` (5 vigentes/futuras; público vê só vigentes). Limites em funções `*_limit()` que a Fase 6 liga aos planos. "Publicar como página": `create_page_post` (posts.business_id); `get_profile_posts` exclui posts de página. Telas: `/paginas`, `/paginas/nova`, `/paginas/[slug]`, `/paginas/[slug]/gerenciar`. Helpers de campo Zod em `packages/core/src/schemas/fields.ts` (re-exportar de outro schema quebrou no Turbopack).
- Fase 6 comercial (migration 24): `plans` + `plan_features` (benefícios `gallery_photos`, `catalog_items`, `active_promotions`, `featured_listing`; padrão em `default_entitlement`, espelhado em `PLAN_FEATURES` no core), `subscriptions` (academia OU página, uma aberta por entidade) e `subscription_events` (append-only). Só admin escreve: planos por RLS + auditoria; assinaturas só por `admin_create_subscription`, `admin_set_subscription_status` (motivo para suspender/cancelar; cancelada/expirada são finais) e `admin_change_subscription`. `entitlement()` alimenta os limites `*_limit()`; `expire_subscriptions` roda no pg_cron às 3h15 UTC. Destaque aparece primeiro e sinalizado em /academias e /paginas. Telas `/admin/planos`, `/admin/assinaturas` e cartão "Plano" (só leitura) na gestão. Professores não dependem de plano (teste confere as políticas).
- Fase 7 comercial (migration 25): `commercial_text_signals()`/`commercial_text_score()` (regras públicas e explicáveis, espelhadas em `packages/core/src/domain/commercial.ts`; "promoção" e "vendo" ficam de fora de propósito). Trigger de constraint **diferido** em `posts` (create_page_post marca a página depois do insert) grava `commercial_signals`; bio é analisada ao mudar. Risco = metade do maior post + 20 por post com 40+ + metade da bio; ≥ 60 abre `commercial_reviews` (uma aberta por pessoa; equipe não entra). Moderação decide em `/admin/publicidade` (`decide_commercial_review`: arquivar, avisar, remover posts via `moderate_content`); a pessoa vê motivos e recorre em `/revisoes` (`create_commercial_appeal`, `decide_commercial_appeal` restaura). Nunca há punição automática. Testes pgTAP que fazem `ALTER TABLE posts` precisam de `set constraints all immediate` antes (evento pendente).
- Fase 8 comercial (migration 26): `report_target` ganhou `business` (denúncia de página); `moderate_content` suspende/reativa páginas; `set_business_verified` (admin). Painel: `/admin/paginas`, Publicidade e números comerciais na visão geral; histórico traduz a auditoria (planos, assinaturas). Função SQL (não plpgsql) que usa valor novo de enum na mesma migration precisa comparar como texto (`p_type::text`).
- `SelectField` recria o `<select>` quando `defaultValue` muda (`key`): o reinício do form pelo React voltava o select à opção da montagem após um erro de validação.
- Formulários com campo controlado (`checked`/`value` com estado): o React reinicia o form após cada envio e o DOM pode voltar ao padrão, enviando o valor errado no reenvio depois de um erro. Enviar o valor do estado em `<input type="hidden">` (feito em diária, check-in e professor).
- `<time>` com tempo relativo usa `suppressHydrationWarning` ("há 4 minutos" pode virar "há 5" entre servidor e navegador).
- `supabase link` grava em `supabase/.temp/*-version` e `storage-migration` as versões do projeto remoto, e o `supabase start` local passa a exigir essas imagens. Sem internet no Docker, mover esses arquivos para fora de `.temp` faz o ambiente local voltar às imagens instaladas.

## Decisões técnicas da Fase 7
- Vídeo sem transcodificação (custo zero): o navegador valida assinatura/tamanho/duração, gera o poster e zera as caixas `udta`/`meta` do MP4 (GPS). WebM vai como está. Sem legendas (limitação WCAG 1.2.2 registrada).
- O Storage bloqueia DELETE por SQL (`storage.protect_objects_delete`): o pg_cron só enfileira em `storage_cleanup_queue`; o admin apaga os arquivos em /admin/configuracoes, com `SUPABASE_SECRET_KEY` só no servidor (`lib/supabase/admin.ts`).
- `style-src` mantém `'unsafe-inline'` (atributos `style` do React e do Leaflet); `script-src` usa nonce + `'strict-dynamic'`.
- Carrossel: o foco vai na faixa rolável, não no contêiner (axe `scrollable-region-focusable`).
- Docker Desktop no Windows pode reservar portas (`netsh int ipv4 show excludedportrange protocol=tcp`) que cobrem 54321–54324. Sintoma: login falha com "E-mail ou senha incorretos" e `supabase start` dá "bind: forbidden". Correção (admin): `net stop winnat` e `net start winnat`, depois `supabase start`.
- Heredoc longo no Bash falha neste ambiente: para scripts grandes, escrever um `.py` no scratchpad e executar.

## Decisões técnicas da Fase 6
- Painel responde 404 (e não 403) para quem não é da equipe. Cada função revalida o papel no banco.
- Moderador: denúncias, conteúdo, academias, eventos e suspensão até 30 dias. Admin: + professores, modalidades, configurações, banimento e e-mails. Superadmin: + papéis. Ninguém modera papel igual ou maior.
- Notificação de moderação usa ator nulo e aparece como "Equipe Figtherz".
- Toda view nova precisa de `revoke insert, update, delete ... from anon, authenticated` (o Supabase concede por padrão). O teste `16_rls_review` falha se esquecer.
- pg_cron é a primeira rotina agendada; as pendências da Fase 3 (limpeza de órfãos, purga após 30 dias) podem usar o mesmo mecanismo.

## Decisões técnicas da Fase 5
- Desvios do DATA_MODEL registrados lá (§4.5 e §4.6): visibilidade da jornada por `user_settings`, check-in sem confirmação do professor, evento com `created_by` + `academy_id` opcional, status sem `finished`.
- Datas e horas da interface em horário de Brasília (`APP_TIMEZONE`, sem horário de verão desde 2019). Eventos em outros fusos do Brasil aparecem no horário de Brasília: limitação conhecida.
- Política de SELECT nunca deve consultar a própria tabela por id (ex.: `can_view_event(id)`): quebra o `INSERT ... RETURNING`. Usar as colunas da linha.
- `create_checkin` é `security definer` porque grava `posts.kind` e `posts.academy_id`, que o usuário não escreve direto. Rate limits de post e de check-in continuam valendo (dependem do JWT, não do papel).

## Decisões técnicas da Fase 4
- Leaflet direto, sem `react-leaflet` (Hippocratic License). Pino arrastável + campos de latitude/longitude como alternativa acessível.
- ViaCEP e Nominatim só pelo servidor (`/api/geo/*`, exige login), com cache de 90 dias e cota no banco: 30 CEPs/h e 10 geocodificações/h por usuário, mais 1 req/s global ao Nominatim. Testes automatizados **não** chamam esses serviços nem baixam tiles do OSM (bloqueados no Playwright).
- `teacher_cards` é uma view com permissões do dono (não `security_invoker`): a tabela base é só dono/admin e a view mostra apenas aprovados, com contato só se `show_contact`.
- Vínculos só mudam por funções (`request_membership`, `invite_member`, `respond_membership`, `leave_membership`, `remove_member`): quem não iniciou o pedido decide.
- Ações que fazem o item sair da lista (aceitar solicitação, aprovar professor) não chamam `revalidatePath`: a UI mostra o resultado localmente.
- `APP_USER_AGENT` usa um e-mail de contato (decidido em 13/11/2026), definido só na variável de ambiente do servidor antes de publicar (DEPLOYMENT.md).

## Decisões técnicas da Fase 3 (aprovadas pelo usuário em 13/11/2026)
- Rate limit e `created_at` forçado só valem quando há JWT (`auth.uid() is not null`). Seeds e rotinas internas inserem em massa e com datas livres.
- Bucket `post-media` único e privado, com URL assinada de 1 h (ver DATA_MODEL.md §6).
- Feed e Explorar em `security definer` com filtro explícito (ver DATA_MODEL.md §7). Qualquer mudança na RLS de `posts` precisa ser espelhada em `get_home_feed` e `get_explore`.
- Realtime no navegador: chamar `realtime.setAuth(token)` antes de assinar o canal, senão ele entra como anônimo e a RLS descarta os eventos.
- Botões com contador (curtir, comentários) usam texto `sr-only` + número visível e nome fixo com `aria-pressed` (WCAG 2.5.3).
- Edições por script Node: `String.replace` interpreta `$$` e template strings perdem barras invertidas. Para SQL e regex, preferir a ferramenta Edit.

## Decisões técnicas da Fase 2 (fora dos documentos da Fase 1)
- `cacheComponents` **desligado**: quase toda rota lê a sessão e o layout raiz lê o cookie de tema. Reavaliar nas páginas públicas da Fase 4.
- `birth_date` ficou em `user_settings` (só o dono lê), e não em `profiles`, que é público. `DATA_MODEL.md` foi atualizado.
- Tema: `data-theme="light|dark|system"` no `<html>`, lido do cookie no servidor. `system` usa `prefers-color-scheme` em CSS, então não há script de tema. O login copia `user_settings.theme` para o cookie.
- Colunas protegidas por GRANT de coluna (não por trigger). `has_role()` usa a ordem do enum: superadmin ≥ admin ≥ moderator.
- `overrides` no `package.json` raiz força `minimatch@^11.0.8` dentro de `@typescript-eslint/typescript-estree` (GHSA-g3hv-75wg-m249, só no lint). Remover quando o `typescript-eslint` publicar a correção.
- Supabase CLI fica na v2 por decisão do usuário. CSP com nonce fica para a Fase 7.
- A lista das "11 modalidades do briefing" não estava registrada. O seed usa: BJJ, Muay Thai, Judô, Karatê, Taekwondo, Capoeira, Krav Maga, Kickboxing, Boxe, MMA, Luta Olímpica + Outra. Confirmada pelo usuário em 13/11/2026.

## Próximos passos
1. Pendências restantes: legendas de vídeo, capa de evento/perfil (bucket `covers`), PWA (manifesto e ícones).
2. Publicação: só com autorização, seguindo `DEPLOYMENT.md` §7–8 (escolher entre Vercel Hobby, Cloudflare ou auto-hospedagem).
