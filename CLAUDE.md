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
2. Fase 4 (em andamento): professores, academias, unidades (ViaCEP/Nominatim), vínculos, grade de aulas, mapa Leaflet.
