# Arquitetura

> Status: **aprovada em 13/11/2026** (stack, idade 18+, limites de mídia, MVP). IA removida do escopo.

## 1. Estado atual do repositório (inspeção de 13/11/2026)
- Repositório git vazio (branch `main`, sem commits, sem arquivos).
- Ambiente: Windows 11, Node 24.22, npm 11.19, git 2.44.
- **Não instalados:** Docker, WSL2, Supabase CLI, FFmpeg.
- Hardware: i5-12400F, 32 GB RAM, RTX 4060 e 274 GB livres.

## 2. Stack recomendada

| Camada | Escolha | Por quê | Alternativa gratuita |
|---|---|---|---|
| Frontend | **Next.js (App Router) + React + TypeScript** | SSR/SSG para páginas públicas indexáveis (grade de aulas, perfil de academia), Server Actions, ecossistema | Remix, SvelteKit |
| Estilo | **Tailwind CSS** + tokens CSS (variáveis) | Temas claro/escuro por variável, mobile-first | CSS Modules |
| Componentes | **Radix UI primitives** (MIT) + componentes próprios | Acessibilidade (foco, ARIA, teclado) pronta, sem impor visual | React Aria (Apache-2.0) |
| Formulários | React Hook Form + **Zod** | Mesmo schema valida no cliente, no servidor e no app mobile futuro | Valibot |
| Estado servidor | TanStack Query | Cache, paginação infinita, otimismo em curtidas | SWR |
| Backend | **Supabase** (Postgres + Auth/GoTrue + Storage + PostgREST) | Auth completa (e-mail/senha, recuperação, confirmação), RLS no banco, storage com políticas, tudo open source e executável localmente | Postgres + Auth.js + MinIO (mais trabalho, mesma capacidade) |
| Banco | **PostgreSQL 15+, PostGIS, pg_trgm, unaccent, citext** | Geobusca e busca textual PT-BR | — |
| Mapas | **Leaflet + react-leaflet + tiles OSM** | Sem chave, sem custo | MapLibre GL + PMTiles próprios |
| Mídia | Storage do Supabase + otimização no cliente + **FFmpeg** em worker local | Ver seção 6 | MinIO |
| Testes | **Vitest**, **Playwright**, **pgTAP** | Unitário, E2E, RLS testado dentro do banco | — |
| Monorepo | **npm workspaces** | Já instalado, zero ferramenta extra | pnpm, Turborepo |

### Por que Supabase e não "Postgres puro"
O requisito de segurança exige permissões **no banco**. Com RLS, a regra vale para qualquer cliente (web hoje, app mobile amanhã, scripts). O Supabase entrega Auth + Storage + RLS integrados (o JWT do usuário chega ao Postgres como `auth.uid()`). Rodando **localmente via CLI**, não há conta nem custo. A produção no Supabase Free é **opcional** e depende de autorização (ver `COST_ZERO_POLICY.md`).

## 3. Estrutura de pastas proposta

```
Figtherz/
├─ apps/
│  └─ web/                    # Next.js
│     ├─ app/
│     │  ├─ (public)/         # rotas sem login: /a/[academia], /p/[professor], /aulas, /eventos
│     │  ├─ (auth)/           # login, cadastro, recuperar senha
│     │  ├─ (app)/            # rotas autenticadas: feed, explorar, notificações, perfil, publicar
│     │  ├─ admin/            # painel administrativo (verificação de papel no servidor)
│     │  └─ api/              # route handlers: geocode proxy, upload callbacks
│     ├─ components/          # UI (design system) e features
│     ├─ lib/                 # clientes supabase (browser/server), helpers
│     └─ tests/e2e/           # Playwright
├─ packages/
│  └─ core/                   # SEM dependência de React/Next. Reutilizável no app mobile
│     ├─ schemas/             # Zod: post, aula, unidade, check-in...
│     ├─ domain/              # regras puras: sistemas de graduação, formatação de horários, distância
│     └─ db/                  # tipos gerados do banco (supabase gen types)
├─ workers/
│  └─ media/                  # Node + FFmpeg: transcodificação e thumbnails (opcional, local/self-host)
├─ supabase/
│  ├─ migrations/             # SQL versionado (fonte da verdade do schema e RLS)
│  ├─ seed.sql                # modalidades, sistemas de faixa, dados de demonstração
│  └─ tests/                  # pgTAP: testes de RLS e funções
└─ *.md                       # documentação obrigatória
```

## 4. Onde ficam as regras de negócio (preparação para mobile)

| Tipo de regra | Local | Motivo |
|---|---|---|
| Autorização (quem lê/escreve o quê) | **RLS no Postgres** | Vale para qualquer cliente |
| Integridade (sem curtida duplicada, contadores, horários válidos) | **Constraints, triggers, funções SQL** | Impossível burlar pelo cliente |
| Operações compostas (feed com autor + mídia + "eu curti", check-in + post) | **Funções RPC SQL** (`security invoker`) | Uma ida ao banco, sem N+1, reutilizável no mobile |
| Validação de entrada | **Zod em `packages/core`** + constraints no banco | Mesmo schema na web e no mobile |
| Integrações externas (Nominatim, ViaCEP, FFmpeg) | **Servidor Next.js / worker** | Segredos e limites de taxa nunca no cliente |

O app mobile futuro (**Expo/React Native**, MIT) consome `packages/core` + `supabase-js` e herda todas as regras sem reescrevê-las.

## 5. Fluxos principais

### Feed (cronológico de seguidos)
- Função `get_home_feed(p_cursor_created_at, p_cursor_id, p_limit)` retorna posts de quem o usuário segue **e dele mesmo**, já com autor, mídias, contadores e `viewer_has_liked`/`viewer_has_saved`.
- **Paginação por cursor** (keyset) em `(created_at desc, id desc)`, 20 itens por página, sem `OFFSET`.
- Filtra bloqueios nos dois sentidos, conteúdo removido e visibilidade.
- Estratégia "fan-out on read", adequada até dezenas de milhares de usuários. Recomendações futuras entram como **outra fonte de candidatos** na mesma interface (`FeedSource`), sem mudar o cliente.

### Explorar
- Popularidade = `(likes + 2·comentários + 3·salvos) / (horas + 2)^1.5`, sobre os últimos 7 dias, calculada por consulta com índice. Se ficar pesado: tabela materializada atualizada por `pg_cron` (disponível no Supabase).

### Busca
- `tsvector` com dicionário `portuguese` + `unaccent` + `pg_trgm` para tolerância a erro de digitação ("jiujitsu" ≈ "jiu-jitsu").
- Geobusca: `academy_units.location geography(Point,4326)` + índice GiST + `ST_DWithin` / ordenação por `<->`.
- Fallback sem mapa: lista por cidade/bairro (sempre disponível).

### Unidade com localização
1. Usuário digita CEP → servidor consulta ViaCEP (com cache) → preenche endereço.
2. Clica em "Localizar no mapa" → servidor consulta Nominatim (fila 1 req/s, cache) → pino sugerido.
3. Usuário **arrasta o pino e confirma**. Salva `location`, `coords_source`, `coords_confirmed_at`.
4. Sempre é possível pular 1–2 e posicionar o pino manualmente.
- Ações: "Abrir rota" usa links universais (`geo:` no Android, `maps.apple.com` no iOS, `openstreetmap.org/directions` no desktop) **sem API**. Também há copiar endereço (Clipboard API) e compartilhar (Web Share API com fallback de link).

### Upload de mídia
Ver seção 6.

### Notificações
- Inseridas por **triggers** (curtida, comentário, resposta, seguidor, marcação) com deduplicação por `(recipient, type, entity)` dentro de uma janela.
- Entrega: **Supabase Realtime** (incluso, gratuito) para o contador de não lidas; a central é paginada por cursor.
- Push nativo do navegador fica para fase futura (Web Push com VAPID é gratuito, mas exige service worker e consentimento).

## 6. Mídia

| Etapa | Imagens | Vídeos |
|---|---|---|
| Validação no cliente | tipo MIME + assinatura do arquivo, máx. 15 MB original | mp4/webm/mov, **máx. 60 s, 25 MB** |
| Otimização | Redimensiona no navegador (canvas/`createImageBitmap`) para máx. 1600 px, **WebP q≈0.8**, remove EXIF (inclusive GPS) | Thumbnail gerada no navegador (frame em 1 s → WebP) |
| Upload | URL assinada do Storage, caminho `{user_id}/{post_id}/{uuid}.webp` | Idem |
| Pós-processamento | — | **Worker FFmpeg** (se ativo): H.264 720p, `+faststart` (carregamento progressivo), AAC 96k. Marca `post_media.status = ready` |
| Sem worker | — | O vídeo original validado é servido como está. `status = ready` direto. Documentado como limitação |
| Validação no servidor | Políticas do Storage limitam bucket, tamanho, MIME e pasta do dono | Idem |

- Reprodução: `<video preload="metadata" playsinline muted>` com autoplay só quando ≥ 60% visível (IntersectionObserver), pausando ao sair da tela. `Range requests` do Storage dão o carregamento progressivo.
- Mídia de **perfil privado** fica em bucket privado com URL assinada de curta duração, gerada após checar permissão.
- Vídeos longos: incentivar link externo (YouTube) no post.

## 7. Segurança (resumo; detalhes em `SECURITY.md`)
- RLS habilitado em **todas** as tabelas. Nenhuma tabela pública sem política.
- Chave `service_role` **apenas** no servidor, nunca em `NEXT_PUBLIC_*`.
- Rate limiting no banco (tabela + função) para posts, comentários, denúncias e geocodificação.
- Painel admin: checagem de papel em middleware **e** em cada função SQL administrativa.

## 8. Observabilidade (custo zero)
- Logs estruturados (JSON) no servidor, com `request_id`.
- Tabela `app_errors` para erros do cliente (com rate limit), visível no painel admin.
- Sem Sentry/Datadog pagos. GlitchTip (open source, auto-hospedável) é opção futura.

## 9. Backup
- Local: `supabase db dump` agendado (script) + cópia da pasta de storage.
- Não contar com backups do provedor no plano Free (a disponibilidade de backups baixáveis no Free deve ser confirmada antes da publicação). Rotina própria de `pg_dump` documentada em `DEPLOYMENT.md`.

## 10. Limites e gargalos conhecidos
| Gargalo | Quando aparece | Mitigação |
|---|---|---|
| Storage 1 GB (Supabase Free) | ~2–3 mil fotos ou ~40 vídeos | Compressão agressiva, cota por usuário, link externo para vídeos |
| Egress 5 GB/mês | Poucas centenas de usuários ativos assistindo vídeo | Thumbnails leves, sem autoplay em rede móvel (`navigator.connection.saveData`) |
| Pausa após 7 dias inativo | Projeto de teste sem acesso | Aceitável em piloto. Documentado |
| Nominatim 1 req/s | Cadastro simultâneo de muitas unidades | Fila + cache + pino manual |
| Feed fan-out on read | > ~100 mil seguidores ativos | Migrar para tabela de timeline (fan-out on write) |

## 11. Decisões que dependem de você
Listadas no relatório da Fase 1 e em `PRODUCT_ROADMAP.md` (seção "Pendências de aprovação").
