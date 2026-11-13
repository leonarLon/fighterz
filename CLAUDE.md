# Figtherz: contexto para o Claude Code

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
1. Pendências conhecidas da Fase 3: upload de avatar (bucket `avatars`), limpeza de uploads órfãos e remoção física de conteúdo apagado após 30 dias (pg_cron), vídeo (fora do MVP).
2. Fase 6: painel admin, moderação com histórico, suspensão, auditoria, revisão completa de RLS.
