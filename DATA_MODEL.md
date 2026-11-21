# Modelo de Dados

> Status: **aprovado em 13/11/2026.** As migrations serão geradas a partir deste documento na Fase 2.
> Banco: PostgreSQL 15+ com `postgis`, `pg_trgm`, `unaccent`, `citext`.

## 1. Convenções
- PK `id uuid default gen_random_uuid()`, exceto tabelas de junção (PK composta) e `profiles` (PK = `auth.users.id`).
- Auditoria em toda tabela mutável: `created_at timestamptz not null default now()`, `updated_at` (trigger `set_updated_at`).
- Exclusão de conteúdo social: **soft delete** (`deleted_at`) + remoção física por rotina após 30 dias (LGPD). Exclusão de conta: `on delete cascade` a partir de `auth.users`.
- Enums como tipos Postgres (`create type`) para valores estáveis. Listas editáveis pelo admin viram tabelas.
- Contadores (`like_count`, `comment_count`, `follower_count`) **desnormalizados e mantidos por triggers**, nunca pelo cliente.
- Paginação: keyset em `(created_at desc, id desc)`. Índices compostos nessa ordem.
- Nomes de tabela em inglês (código). Textos de interface em português.

## 2. Ajustes em relação à lista inicial do briefing

| Proposta original | Decisão | Motivo |
|---|---|---|
| `user_settings` + `user_privacy_settings` | **Uma tabela `user_settings`** | Relação 1:1 com o mesmo dono e o mesmo ciclo de vida. Duas tabelas só duplicam joins |
| `user_roles` com professor e admin de academia | `user_roles` **só para papéis da plataforma** (superadmin, admin, moderator) | "Professor" vem de `teacher_profiles.status = approved`. "Admin de academia" vem de `academy_memberships.role`. Evita dois lugares dizendo a mesma coisa |
| `athlete_progress` | **`martial_art_ranks`** (catálogo de graduações) + **`rank_promotions`** (histórico) | Exigência: cada modalidade com estrutura própria. Uma tabela genérica de "progresso" não modela isso |
| — | **`academy_staff` absorvido em `academy_memberships`** com `role` e aceite mútuo | Professor em várias academias, sem vínculo falso |
| — | **`post_mentions`** | Marcação com aprovação do marcado |
| — | **`follow_requests`** via `follows.status` | Perfil privado |
| — | **`rate_limits`, `geocode_cache`, `app_errors`, `admin_audit_log`** | Segurança, custo zero e observabilidade |
| `academy_followers` | Mantida separada de `follows` | Alvos diferentes (usuário vs. academia), FKs reais em vez de polimorfismo |

## 3. Diagrama de relacionamentos (resumo)

```
auth.users 1─1 profiles 1─1 user_settings
profiles 1─0..1 teacher_profiles
profiles N─N profiles            (follows)
profiles N─N academies           (academy_memberships: student/teacher/admin/owner)
profiles N─N academies           (academy_followers)
academies 1─N academy_units 1─N class_schedules N─1 martial_arts
class_schedules N─0..1 profiles  (teacher)
martial_arts 1─N martial_art_ranks
profiles N─N martial_arts        (user_martial_arts) 1─N rank_promotions
profiles 1─N athlete_achievements N─0..1 events
profiles 1─N training_checkins ─0..1 class_schedules / academy_units / posts
profiles 1─N posts 1─N post_media / post_likes / comments / saved_posts / post_mentions
events N─N profiles              (event_interests)
reports / moderation_actions / blocked_users
```

## 4. Tabelas

### 4.1 Usuários e permissões

**profiles**
| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid PK | FK `auth.users(id)` on delete cascade |
| username | citext | unique, `^[a-z0-9_.]{3,30}$` |
| display_name | text | 1–60 |
| bio | text | ≤ 500 |
| avatar_path, cover_path | text | caminho no Storage |
| city, state | text | opcionais, usados em sugestões |
| is_private | boolean | default false |
| status | enum `account_status` (`active`,`suspended`,`deleted`) | |
| follower_count, following_count, post_count | int | triggers |
| search_vector | tsvector | gerado: username + display_name + bio |

Índices: unique(username), GIN(search_vector), GIN trigram(display_name).

**user_settings** (1:1)
`user_id PK FK`, `birth_date date null` (**movida de `profiles` na Fase 2**: `profiles` é legível por todos, e a data de nascimento só serve para checar a idade), `declared_age smallint null check 18..120` (**migration 19, 18/11/2026**: o cadastro passou a pedir a idade em vez da data; contas antigas mantêm `birth_date`, e uma das duas é obrigatória). O usuário não altera nenhuma das duas, `theme enum('light','dark','system') default 'system'`, `locale default 'pt-BR'`,
visibilidade granular: `show_ranks`, `show_achievements`, `show_checkins`, `show_academies` (enum `visibility`: `public`,`followers`,`private`),
notificações: `notify_likes`, `notify_comments`, `notify_follows`, `notify_mentions`, `notify_events` (bool),
consentimentos LGPD: `terms_accepted_at`, `privacy_accepted_at`.

> O tema persiste **no banco** (entre dispositivos) **e** em cookie (sem flash na primeira renderização, inclusive para visitantes).

**user_roles**
`user_id FK`, `role enum('superadmin','admin','moderator')`, `granted_by`, `created_at`. PK(user_id, role).
Função `has_role(role)` `security definer stable` usada nas políticas.

**teacher_profiles** (1:0..1)
`user_id PK FK`, `professional_name`, `bio`, `experience_years`, `lineage text` (ex.: "linhagem"), `access_plans text` (≤ 500, planos aceitos onde dá aula, migration 21), `certifications jsonb` (lista de {título, emissor, ano}), `contact_email`, `contact_phone`, `show_contact bool default false`, `social_links jsonb` (validado: só URLs https), `status enum('pending','approved','rejected','revoked')`, `reviewed_by`, `reviewed_at`, `review_notes`.
Modalidades ensinadas: `teacher_martial_arts(teacher_id, martial_art_id, rank_id)` PK composta.

### 4.2 Modalidades e graduações

**martial_arts**: `id`, `slug unique`, `name`, `description`, `has_ranks bool`, `is_active`, `sort_order`. Gerida pelo admin. Seed: as 11 modalidades do briefing + "Outra".

**martial_art_ranks**: catálogo de graduações por modalidade
`id`, `martial_art_id FK`, `ordinal int` (ordem), `name` ("Faixa Azul", "Kruang 3", "1º Dan"), `color_hex` (nullable), `secondary_color_hex` (nullable, faixas bicolores como a coral; adicionada na Fase 2), `max_degrees int default 0` (graus/stripes), `min_age int` (ex.: faixas infantis), `track enum('adult','kids')`.
unique(martial_art_id, track, ordinal).

> Exemplo BJJ adulto: branca(4 graus) → azul(4) → roxa(4) → marrom(4) → preta(6) → coral → vermelha. Muay Thai, Judô, Karatê, Taekwondo, Capoeira e Krav Maga recebem suas próprias listas no seed. Como sistemas variam entre federações, o seed traz um padrão comum e admite `federation text` opcional na graduação do usuário.

**user_martial_arts**: a modalidade na vida do atleta
`id`, `user_id FK`, `martial_art_id FK`, `current_rank_id FK nullable`, `current_degree smallint`, `started_on date`, `is_teaching bool`, `visibility`. unique(user_id, martial_art_id).
Check: `current_degree <= rank.max_degrees` (via trigger).

**rank_promotions**: histórico
`id`, `user_martial_art_id FK cascade`, `rank_id FK`, `degree smallint`, `promoted_on date`, `academy_id FK nullable`, `promoted_by_teacher_id FK nullable`, `verification enum('self_reported','teacher_confirmed')`, `notes`.
A graduação atual é atualizada por trigger a partir das promoções, para não haver duas fontes divergentes. **Desde a migration 20 (21/11/2026) é a maior faixa e grau registrados** (`ordinal desc, degree desc`, desempate pela data); antes era a de data mais recente, o que escondia faixas registradas com data antiga.
Confirmação: só o professor indicado pode mudar para `teacher_confirmed` (função RPC dedicada).

### 4.3 Academias, unidades e aulas

**academies**
`id`, `slug unique`, `name`, `description`, `logo_path`, `cover_path`, `website`, `instagram`, `contact_email`, `contact_phone`, `external_links jsonb`, `status enum('active','hidden','suspended')`, `is_verified bool`, `created_by FK`, `follower_count`, `search_vector`.
Modalidades: `academy_martial_arts(academy_id, martial_art_id)`.

**academy_units**
| Coluna | Tipo |
|---|---|
| id, academy_id FK cascade, name | |
| postal_code | text `^\d{8}$` |
| street, number, complement, neighborhood, city, state (char(2)), reference_point | text |
| latitude, longitude | `double precision` nullable (em par) |
| location | `geography(Point,4326)` **gerada** a partir de latitude/longitude (Fase 4: o cliente envia números simples e o banco monta o ponto) |
| coords_source | enum('manual','nominatim') |
| coords_confirmed_at | timestamptz |
| timezone | text default 'America/Sao_Paulo' |
| is_active | bool |

**academy_unit_access** (migration 21, 21/11/2026: TotalPass, Wellhub e diária **por unidade**)
`id`, `unit_id FK`, `academy_id FK` (copiado da unidade por trigger), `kind enum('totalpass','wellhub','day_pass')`, `accepted bool`, `plans text[]` (até 10, sem repetição), `martial_art_ids uuid[]` (validados no trigger), `restrictions`, `access_hours`, `notes`, `price_status enum('paid','free','undisclosed')` e `price_cents int` (só diária; valor obrigatório quando paga e proibido nos outros casos), `updated_at`, `updated_by`. unique(unit_id, kind). Leitura pública se a academia é visível; escrita só `is_academy_manager` (owner/admin). Professor da academia **não** edita, a não ser que o dono o promova a admin.

**academy_photos** (migration 22): `id`, `academy_id FK`, `path` (bucket `covers`, `academy/<id>/gallery-*.webp|jpg`, unique), `caption ≤ 200` (texto alternativo), `width`, `height`, `position`, `created_by`. Limite por `academy_gallery_limit()` (12 sem plano). `academies.logo_path`/`cover_path` passam a ter formato checado e exigir o arquivo enviado. Bucket `covers`: público para leitura, escrita só para a gestão da entidade dona da pasta (`can_manage_cover_path`).

**businesses** (migration 23: páginas de marca, loja e serviço, separadas do perfil pessoal)
`id`, `slug unique`, `name`, `category enum('brand','store','service')`, `description`, `logo_path`, `cover_path`, `website`, `instagram`, `contact_email`, `contact_phone`, `city`, `state`, `martial_art_ids uuid[]`, `status enum('active','hidden','suspended')`, `is_verified`, `created_by`, `search_vector`. Criada só por `create_business()` (3/dia). Gestão alterna ativa/oculta; suspensão e selo são da moderação.
- `business_members(business_id, user_id, role owner|admin, status pending|active, invited_by)`: convite pelo dono (`invite_business_admin`, notificação `business_invite`), aceite (`respond_business_invite`), saída/remoção (`remove_business_member`; dono não sai). Visível só para a própria pessoa e a gestão.
- `business_items`: produto ou serviço, `price_status` + `price_cents` (mesma regra da diária), `url https`, `image_path` (opcional, sem tela ainda), `is_active`. Limite `business_catalog_limit()` (30).
- `business_promotions`: `title`, `description`, `coupon_code` (maiúsculas), `url`, `starts_on`, `ends_on`. Público vê só as vigentes; limite `business_promotions_limit()` (5 vigentes ou futuras).
- `posts.business_id`: "publicar como página" por `create_page_post()` (só gestão ativa, página ativa). O autor continua responsável; o post sai do perfil pessoal (`get_profile_posts`) e aparece na página (`get_business_posts`). `post_cards` ganhou `business_name/slug/logo_path`.

**plans / plan_features / subscriptions / subscription_events** (migration 24: planos administrados, sem pagamento)
- `plans`: `slug`, `name`, `description`, `price_label` (texto de referência), `audience enum('academy','business','both')`, `is_active`, `sort_order`. Leitura pública dos ativos; escrita só admin (RLS) com auditoria.
- `plan_features(plan_id, feature_key, value)`: chaves válidas definidas por `default_entitlement()` (galeria 12, catálogo 30, promoções 5, destaque 0).
- `subscriptions`: `plan_id`, `academy_id` **ou** `business_id`, `status enum('active','suspended','cancelled','expired')`, `starts_on`, `ends_on`, `notes`, `created_by`. Uma ativa/suspensa por entidade. Leitura: admin e gestão da entidade. Escrita só pelas funções `admin_*` (exigem `has_role('admin')`).
- `subscription_events`: histórico append-only (criada, mudança de situação, troca de plano/validade, expirada), com motivo e ator.
- `entitlement(kind, id, key)` = maior entre o padrão e o plano da assinatura ativa e vigente. Expiração diária por pg_cron (`expire_subscriptions`).

Índices: GiST(location), btree(state, city, neighborhood) com `unaccent(lower())`.

**academy_memberships**
`academy_id FK`, `user_id FK`, `role enum('owner','admin','teacher','student')`, `status enum('pending','active','rejected','left')`, `requested_by enum('user','academy')`, `approved_by`, `approved_at`. PK(academy_id, user_id, role).
Regra: vínculo `teacher`/`admin` só fica `active` com aceite da **outra parte** (a academia convida e o professor aceita, ou o professor pede e um owner/admin aprova). O criador da academia vira `owner` automaticamente.

**academy_followers**: PK(academy_id, user_id), `created_at`.

**class_schedules**
| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid | |
| academy_id | FK | redundante com unit, mas útil para RLS. **Check via trigger: unit pertence à academia** |
| unit_id | FK cascade | endereço vem da unidade (não duplicado) |
| teacher_id | FK profiles nullable | precisa ter membership `teacher` ativa na academia |
| martial_art_id | FK | |
| name | text | "Muay Thai Iniciante" |
| level | enum('all','beginner','intermediate','advanced','kids','competition') | |
| weekday | smallint 0–6 | |
| starts_at, ends_at | time | check `ends_at > starts_at` |
| accepts_trial | bool | "aula experimental" |
| notes | text | |
| status | enum('active','paused','cancelled') | |

Índices: (unit_id, weekday, starts_at), (martial_art_id, weekday, starts_at), (teacher_id).
Visível **sem login** quando a academia está `active` e a aula `active`.

### 4.4 Rede social

**follows**: `follower_id`, `following_id`, `status enum('pending','accepted')`, `created_at`. PK(follower_id, following_id), check `follower_id <> following_id`. Índice (following_id, status).

**posts**
| Coluna | Tipo |
|---|---|
| id, author_id FK | |
| kind | enum('standard','checkin','achievement','event_share') |
| caption | text ≤ 2200 |
| martial_art_id, academy_id, unit_id, event_id | FKs opcionais |
| location_label | text opcional (texto livre, sem coordenadas do usuário) |
| visibility | enum('public','followers','private') |
| external_video_url | text (só domínios permitidos: youtube.com, youtu.be, vimeo.com) |
| like_count, comment_count, save_count | int |
| moderation_status | enum('visible','under_review','removed') |
| deleted_at | timestamptz |

Índices: (author_id, created_at desc, id desc), (created_at desc) where visible e public, GIN(search_vector).

**post_media**: `id`, `post_id FK cascade`, `position smallint` (0–9), `type enum('image','video')`, `storage_path`, `thumbnail_path`, `width`, `height`, `duration_ms` (≤ 60000), `size_bytes`, `alt_text`, `status enum('uploading','processing','ready','failed')`. unique(post_id, position).

**post_mentions**: PK(post_id, user_id), `status enum('pending','approved','rejected')`. Só aparece publicamente quando aprovada (ou se o usuário marcado ativou auto-aprovação).

**post_likes**: PK(post_id, user_id). **comment_likes**: PK(comment_id, user_id). **saved_posts**: PK(user_id, post_id), `created_at`.
> PKs compostas garantem **impossibilidade de curtida duplicada**. O cliente usa `upsert`/`delete` idempotentes.

**comments**: `id`, `post_id FK cascade`, `author_id`, `parent_id FK comments nullable` (**1 nível** de resposta, check por trigger), `body ≤ 1000`, `like_count`, `moderation_status`, `deleted_at`. Índice (post_id, created_at).

**notifications**: `id`, `recipient_id`, `actor_id`, `type enum('follow','follow_request','like','comment','reply','mention','class_update','event_update','promotion_confirmed','membership_request','moderation')`, `post_id`, `comment_id`, `academy_id`, `event_id` (FKs opcionais cascade), `read_at`, `created_at`.
Índice (recipient_id, created_at desc), parcial (recipient_id) where read_at is null.
Dedup: unique parcial em (recipient, actor, type, post_id) para `like`.

### 4.5 Evolução esportiva

**athlete_achievements**: `id`, `user_id`, `martial_art_id`, `type enum('competition_result','milestone','certification','other')`, `title`, `event_id FK nullable`, `event_name text` (quando o evento não está na plataforma), `placement smallint` (1, 2, 3...), `medal enum('gold','silver','bronze') nullable`, `division text`, `achieved_on date`, `evidence_url`, `visibility`.

**training_checkins**: `id`, `user_id`, `academy_id nullable`, `unit_id nullable`, `martial_art_id`, `class_schedule_id nullable`, `trained_at timestamptz` (não pode ser futuro: check `<= now() + 1h`), `duration_min smallint`, `notes ≤ 500`, `verification enum('self_reported','teacher_confirmed')`, `confirmed_by`, `post_id nullable`, `visibility`.
Índice (user_id, trained_at desc). Limite: 5 check-ins/dia por usuário (rate limit).
> A interface exibe "registrou um treino em X", **nunca** "esteve em X".

> **Implementado na Fase 5 (13/11/2026), com ajustes:**
> - A visibilidade da jornada vem de `user_settings` (`show_ranks`, `show_achievements`, `show_checkins`), e não de uma coluna `visibility` por linha. A função `can_view_journey(dono, seção)` aplica a escolha mais a privacidade do perfil e bloqueios.
> - `rank_promotions` ganhou `user_id` (copiado da modalidade por trigger, para a RLS) e `confirmed_at`. O trigger valida graduação da modalidade, `degree <= max_degrees`, data não futura e professor aprovado. Editar graduação, grau, data ou professor volta a promoção para `self_reported`. Recusar a confirmação desfaz a indicação do professor.
> - `training_checkins` **não** tem confirmação pelo professor (só graduações têm) nem `unit_id`/`visibility`. Check-in só nasce por `create_checkin()`, que cria o post `kind = 'checkin'` na mesma transação quando o usuário escolhe compartilhar. `posts.academy_id` foi criado para o card "registrou um treino em X".
> - Views de leitura: `journey_cards`, `promotion_cards`, `checkin_cards` (`security_invoker`). `get_training_summary(user)` dá o resumo para o perfil.

### 4.6 Eventos

**events**: `id`, `organizer_user_id nullable`, `organizer_academy_id nullable` (check: exatamente um), `type enum('championship','seminar','open_mat','graduation','workshop','special_training','other')`, `martial_art_id`, `title`, `description`, `starts_at`, `ends_at`, `unit_id nullable` **ou** endereço próprio + `location geography`, `external_url` (regulamento/inscrição), `cover_path`, `status enum('draft','published','cancelled','finished')`, `interest_count`.
Índices: (starts_at) where published, GiST(location).

**event_interests**: PK(event_id, user_id, kind), `kind enum('saved','interested')`.

> **Implementado na Fase 5 (13/11/2026), com ajustes:**
> - Organizador: `created_by` (sempre) + `academy_id` opcional, no lugar de "exatamente um entre usuário e academia". Evento pessoal exige professor aprovado; evento de academia exige gestor (owner/admin). Assim fica registrado quem criou mesmo quando a academia organiza.
> - `status` só tem `draft`, `published` e `cancelled`. "Encerrado" é derivado de `ends_at`, sem rotina para mudar status. Cancelado não volta a publicado; publicado não é excluído (é cancelado, e os interessados recebem `event_update`). Só rascunho é excluído.
> - Cidade, UF e coordenadas ficam sempre na linha: com `unit_id`, o trigger copia da unidade. Endereço próprio ainda não tem pino no mapa (só link de rota pelo endereço).
> - Interesse e salvos são privados (cada um vê os seus); `interest_count` é público. `notifications.event_id` leva ao evento. `cover_path` ficou para depois (sem bucket `covers`).
> - A política de SELECT de `events` usa as colunas da linha, não `can_view_event(id)`: no `INSERT ... RETURNING` a linha nova ainda não é visível para uma função que consulta a tabela.

### 4.7 Segurança e moderação

**blocked_users**: PK(blocker_id, blocked_id), check diferente. Bloquear remove follows nos dois sentidos (trigger).

**reports**: `id`, `reporter_id`, `target_type enum('post','comment','profile','academy','event')`, `target_id uuid`, `reason enum('spam','harassment','violence','nudity','minor_safety','impersonation','misinformation','other')`, `details`, `status enum('open','in_review','resolved','dismissed')`, `assigned_to`, `resolved_at`.
unique(reporter_id, target_type, target_id) where status in ('open','in_review'). `minor_safety` entra com **prioridade máxima** na fila.
> Aqui o alvo é polimórfico de propósito: a tabela é de auditoria e não deve sumir em cascata quando o alvo é removido.

**moderation_actions**: `id`, `moderator_id` (nulo = rotina automática), `target_type`, `target_id`, `action enum('remove_content','restore_content','dismiss_reports','warn','suspend','unsuspend','ban','verify','unverify')`, `reason`, `expires_at`, `created_at`. **Append-only**: sem grant de INSERT/UPDATE/DELETE para clientes; só as funções de moderação escrevem (Fase 6). `report_id` foi dispensado: as decisões valem para todas as denúncias abertas do alvo.

**profiles** (Fase 6): `suspended_until` (nulo com status `suspended` = banimento) e `suspension_reason`, sem grant de UPDATE para o usuário.

**platform_settings** (Fase 6): linha única com `signups_open` (barra cadastro no banco, por trigger em `auth.users`) e `announcement` (aviso no topo do site). Leitura pública, escrita só admin, auditada.

**admin_audit_log**: append-only. Registra mudanças de papéis, aprovações de professor/academia e alterações de modalidades.

**rate_limits**: `key text` (ex.: `post:{uid}`), `window_start`, `count`. Função `check_rate_limit(key, max, window)`.

**geocode_cache**: `query_hash PK`, `provider`, `response jsonb`, `created_at`. **app_errors**: erros do cliente.


## 5. Políticas RLS (resumo)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | todos (dados públicos), exceto bloqueadores. Perfil privado mostra só o cabeçalho | via trigger de signup | dono | via exclusão de conta |
| user_settings | dono | trigger | dono | — |
| user_roles | dono vê os próprios; admin vê todos | superadmin | superadmin | superadmin |
| teacher_profiles | `approved` para todos; dono e admin veem sempre | dono (status forçado `pending`) | dono (sem alterar status); admin altera status | dono |
| academies / units / class_schedules | todos se `active` | usuário autenticado (vira owner) | owner/admin da academia | owner |
| academy_memberships | membros da academia + o próprio usuário; `active` teacher é público | usuário (pedido) ou admin da academia (convite) | a outra parte aprova | qualquer das partes |
| posts | `public`: todos (menos bloqueios); `followers`: seguidores aceitos; `private`: autor; `removed`: autor e moderador | autor = `auth.uid()` + rate limit | autor (campos limitados) | autor (soft) / moderador |
| post_media | herda do post | autor do post | autor | autor |
| likes / saved / comments | herda visibilidade do post | `user_id = auth.uid()` e post visível e não bloqueado | autor do comentário | autor; autor do post pode apagar comentários no seu post |
| follows | público para `accepted`; `pending` só as duas partes | follower = uid | seguido aceita | qualquer parte |
| notifications | destinatário | só triggers (`security definer`) | destinatário (`read_at`) | destinatário |
| training_checkins / achievements / rank_promotions | conforme `visibility` + `user_settings` | dono | dono; professor só confirma via RPC | dono |
| events | `published` para todos | professor aprovado ou admin de academia | organizador | organizador |
| reports | reporter vê os seus; moderadores veem todos | autenticado + rate limit | moderador | — |
| moderation_actions / audit | moderador/admin | moderador/admin | **ninguém** | **ninguém** |

Todas as políticas serão cobertas por testes pgTAP do tipo "usuário A **não** consegue ler/alterar dado de B".

## 6. Storage (buckets)
| Bucket | Acesso | Limite | Caminho |
|---|---|---|---|
| `avatars` | público leitura | 2 MB, image/webp,jpeg,png | `{uid}/...` |
| `covers` | público leitura | 4 MB | `{uid}/...` ou `academy/{id}/...` |
| `post-media` | **privado**. Leitura por URL assinada (1 h), emitida só se a RLS permitir ver o post | 25 MB, image/webp, image/jpeg (vídeo fora do MVP) | `{uid}/{post_id}/{posição}-{aleatório}.webp` |

> **Implementado na Fase 3 e aprovado em 13/11/2026:** um único bucket privado em vez de `post-media` + `post-media-private`. Assim um post que muda de visibilidade, ou o perfil que fica privado, não exige mover arquivos: a política de SELECT do Storage reaproveita `can_view_post()`. A validade de 1 h (e não 60 s) evita imagens quebradas durante a leitura de uma página do feed. `avatars` e `covers` ainda não foram criados.

Escrita sempre restrita a `(storage.foldername(name))[1] = auth.uid()::text`.

> **Fase 7 (13/11/2026):**
> - `post-media` aceita também `video/mp4` e `video/webm` (até 25 MB). Um post tem até 10 fotos **ou** 1 vídeo. `post_media.thumbnail_path` guarda a miniatura (WebP gerada no aparelho) e segue a mesma política de leitura do post. Check: vídeo exige `duration_ms` (≤ 60 s).
> - `avatars` criado (público para leitura, 2 MB, WebP/JPEG, `{uid}/avatar-{aleatório}.webp`). `covers` continua não criado.
> - `storage_cleanup_queue` (interna, RLS sem políticas): arquivos a apagar. `purge_deleted_content()` roda todo dia às 3h (UTC) pelo pg_cron.

## 7. Funções RPC

**Implementadas na Fase 3:** `get_home_feed`, `get_profile_posts`, `get_saved_posts`, `get_explore`, `search_profiles`, `create_post` (post + mídias + marcações numa transação), `delete_post`, `delete_comment`, `mark_all_notifications_read`, além das views `post_cards`, `comment_cards` e `notification_cards` (`security_invoker`). Feed e Explorar são `security definer` com filtro explícito equivalente à RLS: filtram primeiro por índice e só montam os cards da página. Com a RLS avaliada linha a linha, a página do meio do feed passava de 300 ms; agora fica em ~3–9 ms com 1.000 posts. Soft delete de post e de comentário só por função, porque um UPDATE direto deixaria a linha invisível pela própria política de SELECT. `posts.academy_id`, `unit_id` e `event_id` entram nas Fases 4 e 5, junto com as tabelas de destino.

**Implementadas na Fase 5:** `create_checkin`, `confirm_promotion`, `get_training_summary`, `can_view_journey`, `can_view_event`, views `journey_cards`, `promotion_cards`, `checkin_cards`, `event_cards`.

**Planejadas:**
`get_home_feed`, `get_explore`, `get_profile_page`, `get_academy_page`, `get_teacher_schedule` (todas as academias do professor), `search_global`, `search_units_nearby(lat, lng, radius_km, filtros)`, `create_checkin(... , share_to_feed)`, `confirm_promotion`, `respond_membership`, `toggle_like`, `delete_my_account`, `export_my_data` (LGPD).
