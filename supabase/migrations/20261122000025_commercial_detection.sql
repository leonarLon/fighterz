-- Evolução comercial · Fase 7: detecção de publicidade comercial em perfis pessoais.
-- Só regras explicáveis (sem IA): cada ponto tem um código e o trecho que o gerou. Nada é punido
-- automaticamente: acima do limiar abre uma revisão para a moderação, e a pessoa pode recorrer.
-- Não analisa: posts publicados como página, o campo "planos aceitos onde dou aula" do professor,
-- nem imagens. Regras espelhadas em packages/core/src/domain/commercial.ts (mesmos casos de teste).

alter type public.notification_type add value if not exists 'commercial_warning';
alter type public.notification_type add value if not exists 'appeal_decided';

create type public.commercial_review_status as enum ('open', 'dismissed', 'warned', 'actioned', 'reverted');
create type public.appeal_status            as enum ('open', 'accepted', 'rejected');

-- ---------------------------------------------------------------------------
-- Regras
-- ---------------------------------------------------------------------------
-- Sinais de um texto. Pontos negativos são contexto pessoal (treino, competição) e só valem sem link de loja.
create or replace function public.commercial_text_signals(p_text text)
returns table (code text, points integer, excerpt text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  t      text := public.immutable_unaccent(lower(coalesce(p_text, '')));
  m      text[];
  v_shop boolean := false;
begin
  if btrim(t) = '' then
    return;
  end if;

  m := regexp_match(t, '((https?://|www\.)\S*(shopee|mercadoli[vb]re|amzn|amazon|hotmart|kiwify|eduzz|monetizze|aliexpress|shein|nuvemshop|lojaintegrada|pag\.ae|picpay|mpago|checkout|/loja|loja\.)\S*|wa\.me/\S*|api\.whatsapp\.com\S*)');
  if m is not null then
    v_shop := true;
    code := 'shop_link'; points := 30; excerpt := left(m[1], 120); return next;
  end if;

  m := regexp_match(t, '(cupom|cupon|codigo promocional|codigo de desconto|\m\d{1,2} ?% ?off\M|\d{1,2} ?% de desconto)');
  if m is not null then
    code := 'coupon'; points := 25; excerpt := left(m[1], 120); return next;
  end if;

  m := regexp_match(t, '(r\$ ?\d[\d.,]*)');
  if m is not null then
    code := 'price'; points := 20; excerpt := left(m[1], 120); return next;
  end if;

  -- "promoção" fica de fora de propósito: no esporte é graduação ("promoção de faixa"). "vendo" também (verbo ver).
  m := regexp_match(t, '\m(compre|comprem|compra ja|encomende|encomendas abertas|peca ja|peca o seu|peca a sua|(chama|chame) no (direct|dm|pv|privado|zap|whats|inbox)|link na bio|frete gratis|garanta o seu|garanta a sua|garanta ja|ultimas unidades|estoque limitado|a venda|pronta entrega)\M');
  if m is not null then
    code := 'sales_call'; points := 20; excerpt := left(m[1], 120); return next;
  end if;

  if t ~ '\m(whats|whatsapp|zap|wpp)\M' and t ~ '\(?\d{2}\)? ?9?\d{4}[ -]?\d{4}' then
    code := 'sales_contact'; points := 10; excerpt := left((regexp_match(t, '(\(?\d{2}\)? ?9?\d{4}[ -]?\d{4})'))[1], 120); return next;
  end if;

  if not v_shop then
    m := regexp_match(t, '\m(treino|treinei|treinar|tatame|campeonato|graduacao|faixa|luta|competicao|aula|sparring|rola|seminario)\M');
    if m is not null then
      code := 'personal_context'; points := -10; excerpt := left(m[1], 120); return next;
    end if;
  end if;
end;
$$;

create or replace function public.commercial_text_score(p_text text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(0, least(100, coalesce(sum(points), 0)))::integer from public.commercial_text_signals(p_text);
$$;

-- ---------------------------------------------------------------------------
-- Sinais, risco, revisões e recursos
-- ---------------------------------------------------------------------------
create table public.commercial_signals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  code       text not null,
  points     integer not null,
  excerpt    text,
  created_at timestamptz not null default now()
);

create index commercial_signals_user_idx on public.commercial_signals (user_id, created_at desc);
create index commercial_signals_post_idx on public.commercial_signals (post_id);

create table public.commercial_risk (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  score      integer not null check (score between 0 and 100),
  updated_at timestamptz not null default now()
);

create table public.commercial_reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  status        public.commercial_review_status not null default 'open',
  score         integer not null check (score between 0 and 100),
  reasons       jsonb not null default '[]'::jsonb,  -- foto dos sinais no momento da abertura
  opened_at     timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references public.profiles (id) on delete set null,
  decision_note text constraint commercial_reviews_note_length check (char_length(decision_note) <= 1000)
);

create unique index commercial_reviews_one_open_idx on public.commercial_reviews (user_id) where status = 'open';
create index commercial_reviews_status_idx on public.commercial_reviews (status, opened_at desc);

create table public.commercial_appeals (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null unique references public.commercial_reviews (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  message     text not null constraint commercial_appeals_message_length check (char_length(btrim(message)) between 10 and 1000),
  status      public.appeal_status not null default 'open',
  response    text constraint commercial_appeals_response_length check (char_length(response) <= 1000),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references public.profiles (id) on delete set null
);

create index commercial_appeals_status_idx on public.commercial_appeals (status, created_at);

-- Limiar para abrir revisão e o que entra na conta.
create or replace function public.commercial_review_threshold()
returns integer language sql immutable set search_path = '' as $$ select 60; $$;

-- Risco do perfil (0–100), explicável:
--   metade do maior post + 20 por post com 40+ pontos + metade da bio.
-- Só posts pessoais dos últimos 30 dias e posteriores à última decisão (não reabre pelo mesmo conteúdo).
create or replace function public.commercial_risk_score(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with since as (
    select greatest(now() - interval '30 days',
                    coalesce((select max(decided_at) from public.commercial_reviews where user_id = p_user and status <> 'open'), '-infinity'::timestamptz)) as t
  ),
  per_post as (
    select p.id, greatest(0, least(100, sum(s.points))) as score
    from public.posts p
    join public.commercial_signals s on s.post_id = p.id
    where p.author_id = p_user and p.deleted_at is null and p.business_id is null
      and p.moderation_status <> 'removed'
      and p.created_at > (select t from since)
    group by p.id
  )
  select least(100,
    coalesce((select max(score) from per_post), 0) / 2
    + 20 * (select count(*) from per_post where score >= 40)
    + public.commercial_text_score((select bio from public.profiles where id = p_user)) / 2
  )::integer;
$$;

create or replace function public.commercial_reasons(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(r order by r ->> 'source', r ->> 'created_at' desc), '[]'::jsonb)
  from (
    select jsonb_build_object('source', 'post', 'post_id', s.post_id, 'code', s.code, 'points', s.points,
                              'excerpt', s.excerpt, 'created_at', s.created_at) as r
    from public.commercial_signals s
    join public.posts p on p.id = s.post_id and p.deleted_at is null and p.business_id is null
    where s.user_id = p_user and s.created_at > now() - interval '30 days'
    union all
    select jsonb_build_object('source', 'bio', 'code', b.code, 'points', b.points, 'excerpt', b.excerpt, 'created_at', now())
    from public.profiles pr, public.commercial_text_signals(pr.bio) b
    where pr.id = p_user
  ) x;
$$;

-- Atualiza o risco e abre revisão se passar do limiar (nunca pune: só coloca na fila).
create or replace function public.recompute_commercial_risk(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_score integer := public.commercial_risk_score(p_user);
begin
  insert into public.commercial_risk (user_id, score, updated_at) values (p_user, v_score, now())
  on conflict (user_id) do update set score = excluded.score, updated_at = now();
  if v_score >= public.commercial_review_threshold()
     and not exists (select 1 from public.commercial_reviews where user_id = p_user and status = 'open')
     and not public.has_role_for(p_user, 'moderator') then
    insert into public.commercial_reviews (user_id, score, reasons) values (p_user, v_score, public.commercial_reasons(p_user));
  elsif v_score >= public.commercial_review_threshold() then
    update public.commercial_reviews set score = v_score, reasons = public.commercial_reasons(p_user)
    where user_id = p_user and status = 'open';
  end if;
  return v_score;
end;
$$;

-- Papel de outra pessoa (has_role olha o usuário logado).
create or replace function public.has_role_for(p_user uuid, p_role public.platform_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = p_user and role >= p_role);
$$;

-- Post novo: analisado no fim da transação (create_page_post marca a página depois do insert).
create or replace function public.detect_post_commercial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  select * into v_post from public.posts where id = new.id;
  if v_post.id is null or v_post.business_id is not null or v_post.deleted_at is not null then
    return null;
  end if;
  insert into public.commercial_signals (user_id, post_id, code, points, excerpt)
  select v_post.author_id, v_post.id, s.code, s.points, s.excerpt
  from public.commercial_text_signals(v_post.caption) s
  where exists (select 1 from public.commercial_text_signals(v_post.caption) x where x.points > 0);
  if v_post.kind = 'checkin' and found then
    insert into public.commercial_signals (user_id, post_id, code, points, excerpt)
    values (v_post.author_id, v_post.id, 'checkin', -10, null);
  end if;
  if found then
    perform public.recompute_commercial_risk(v_post.author_id);
  end if;
  return null;
end;
$$;

create constraint trigger posts_detect_commercial
  after insert on public.posts
  deferrable initially deferred
  for each row execute function public.detect_post_commercial();

create or replace function public.detect_bio_commercial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.commercial_text_score(new.bio) > 0 or public.commercial_text_score(old.bio) > 0 then
    perform public.recompute_commercial_risk(new.id);
  end if;
  return null;
end;
$$;

create trigger profiles_detect_commercial
  after update of bio on public.profiles
  for each row execute function public.detect_bio_commercial();

-- Diário: o risco cai conforme os posts saem da janela de 30 dias. Revisões abertas ficam para a moderação.
create or replace function public.refresh_commercial_risk()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid;
  v_count integer := 0;
begin
  for v_user in select user_id from public.commercial_risk where score > 0 loop
    perform public.recompute_commercial_risk(v_user);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('refresh-commercial-risk', '30 3 * * *', $$select public.refresh_commercial_risk()$$);

-- ---------------------------------------------------------------------------
-- Decisões da moderação e recursos
-- ---------------------------------------------------------------------------
create or replace function public.decide_commercial_review(p_review uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rev  public.commercial_reviews;
  v_note text := nullif(btrim(p_note), '');
  v_post uuid;
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_rev from public.commercial_reviews where id = p_review for update;
  if v_rev.id is null then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
  if v_rev.status <> 'open' then
    raise exception 'review_already_decided' using errcode = '22023';
  end if;
  if v_rev.user_id = auth.uid() or public.platform_rank(v_rev.user_id) >= public.platform_rank(auth.uid()) then
    raise exception 'cannot_moderate_peer' using errcode = '42501';
  end if;
  if p_decision not in ('dismiss', 'warn', 'remove_posts') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if p_decision <> 'dismiss' and coalesce(char_length(v_note), 0) < 3 then
    raise exception 'reason_required' using errcode = '23514';
  end if;

  if p_decision = 'remove_posts' then
    for v_post in
      select distinct (r ->> 'post_id')::uuid from jsonb_array_elements(v_rev.reasons) r
      where r ->> 'source' = 'post' and (r ->> 'points')::integer > 0
    loop
      if exists (select 1 from public.posts where id = v_post and deleted_at is null and moderation_status <> 'removed') then
        perform public.moderate_content('post', v_post, true, 'Publicidade em perfil pessoal: ' || v_note);
      end if;
    end loop;
  end if;

  update public.commercial_reviews
  set status = case p_decision when 'dismiss' then 'dismissed' when 'warn' then 'warned' else 'actioned' end::public.commercial_review_status,
      decided_at = now(), decided_by = auth.uid(), decision_note = v_note
  where id = p_review;

  perform public.log_moderation('profile', v_rev.user_id,
    case when p_decision = 'dismiss' then 'dismiss_reports' else 'warn' end::public.moderation_action,
    'Publicidade em perfil pessoal' || coalesce(': ' || v_note, ''));
  if p_decision <> 'dismiss' then
    perform public.notify(v_rev.user_id, null, 'commercial_warning');
  end if;
  update public.commercial_risk set score = public.commercial_risk_score(v_rev.user_id), updated_at = now() where user_id = v_rev.user_id;
end;
$$;

-- A pessoa recorre de um aviso ou remoção (um recurso por revisão).
create or replace function public.create_commercial_appeal(p_review uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.commercial_reviews
                 where id = p_review and user_id = auth.uid() and status in ('warned', 'actioned')) then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) < 10 then
    raise exception 'message_too_short' using errcode = '23514';
  end if;
  perform public.enforce_rate_limit('appeal:' || auth.uid(), 5, interval '1 day');
  begin
    insert into public.commercial_appeals (review_id, user_id, message) values (p_review, auth.uid(), btrim(p_message))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'appeal_exists' using errcode = '23505';
  end;
  return v_id;
end;
$$;

create or replace function public.decide_commercial_appeal(p_appeal uuid, p_accept boolean, p_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appeal public.commercial_appeals;
  v_rev    public.commercial_reviews;
  v_resp   text := nullif(btrim(p_response), '');
  v_post   uuid;
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_appeal from public.commercial_appeals where id = p_appeal for update;
  if v_appeal.id is null then
    raise exception 'appeal_not_found' using errcode = 'P0002';
  end if;
  if v_appeal.status <> 'open' then
    raise exception 'appeal_already_decided' using errcode = '22023';
  end if;
  if v_appeal.user_id = auth.uid() or public.platform_rank(v_appeal.user_id) >= public.platform_rank(auth.uid()) then
    raise exception 'cannot_moderate_peer' using errcode = '42501';
  end if;
  if coalesce(char_length(v_resp), 0) < 3 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  select * into v_rev from public.commercial_reviews where id = v_appeal.review_id;

  if p_accept then
    -- Desfaz a decisão: restaura os posts removidos por esta revisão.
    if v_rev.status = 'actioned' then
      for v_post in
        select distinct (r ->> 'post_id')::uuid from jsonb_array_elements(v_rev.reasons) r
        where r ->> 'source' = 'post' and (r ->> 'points')::integer > 0
      loop
        if exists (select 1 from public.posts where id = v_post and deleted_at is null and moderation_status = 'removed') then
          perform public.moderate_content('post', v_post, false, 'Recurso aceito: ' || v_resp);
        end if;
      end loop;
    end if;
    update public.commercial_reviews set status = 'reverted' where id = v_rev.id;
  end if;

  update public.commercial_appeals
  set status = case when p_accept then 'accepted' else 'rejected' end::public.appeal_status,
      response = v_resp, decided_at = now(), decided_by = auth.uid()
  where id = p_appeal;
  perform public.log_moderation('profile', v_appeal.user_id,
    case when p_accept then 'restore_content' else 'warn' end::public.moderation_action,
    case when p_accept then 'Recurso aceito: ' else 'Recurso negado: ' end || v_resp);
  perform public.notify(v_appeal.user_id, null, 'appeal_decided');
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
alter table public.commercial_signals enable row level security;
alter table public.commercial_risk enable row level security;
alter table public.commercial_reviews enable row level security;
alter table public.commercial_appeals enable row level security;

revoke all on public.commercial_signals, public.commercial_risk, public.commercial_reviews, public.commercial_appeals from anon, authenticated;
grant select on public.commercial_signals, public.commercial_risk, public.commercial_reviews, public.commercial_appeals to authenticated;

-- Transparência: a pessoa vê os próprios sinais e as revisões decididas contra ela; a moderação vê tudo.
create policy commercial_signals_select on public.commercial_signals
  for select to authenticated using (user_id = (select auth.uid()) or public.has_role('moderator'));
create policy commercial_risk_select on public.commercial_risk
  for select to authenticated using (public.has_role('moderator'));
create policy commercial_reviews_select on public.commercial_reviews
  for select to authenticated
  using (public.has_role('moderator') or (user_id = (select auth.uid()) and status in ('warned', 'actioned', 'reverted')));
create policy commercial_appeals_select on public.commercial_appeals
  for select to authenticated using (user_id = (select auth.uid()) or public.has_role('moderator'));

revoke execute on function
  public.recompute_commercial_risk(uuid), public.refresh_commercial_risk(), public.detect_post_commercial(),
  public.detect_bio_commercial(), public.commercial_risk_score(uuid), public.commercial_reasons(uuid),
  public.has_role_for(uuid, public.platform_role)
  from public, anon, authenticated;
revoke execute on function
  public.decide_commercial_review(uuid, text, text), public.create_commercial_appeal(uuid, text),
  public.decide_commercial_appeal(uuid, boolean, text)
  from public, anon;
grant execute on function
  public.decide_commercial_review(uuid, text, text), public.create_commercial_appeal(uuid, text),
  public.decide_commercial_appeal(uuid, boolean, text)
  to authenticated;
-- As regras são públicas (explicáveis): qualquer um pode testar um texto.
grant execute on function public.commercial_text_signals(text), public.commercial_text_score(text), public.commercial_review_threshold()
  to anon, authenticated;

-- Visão geral do painel ganha a fila de publicidade (revisões e recursos), páginas e assinaturas.
create or replace function public.get_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'open_reports',     (select count(distinct (target_type, target_id)) from public.reports where status in ('open', 'in_review')),
    'priority_reports', (select count(distinct (target_type, target_id)) from public.reports
                         where status in ('open', 'in_review') and reason = 'minor_safety'),
    'under_review',     (select count(*) from public.posts where moderation_status = 'under_review' and deleted_at is null)
                      + (select count(*) from public.comments where moderation_status = 'under_review' and deleted_at is null),
    'pending_teachers', (select count(*) from public.teacher_profiles where status = 'pending'),
    'suspended_users',  (select count(*) from public.profiles where status = 'suspended'),
    'users',            (select count(*) from public.profiles where status <> 'deleted'),
    'new_users_7d',     (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'posts_24h',        (select count(*) from public.posts where created_at >= now() - interval '24 hours' and deleted_at is null),
    'academies',        (select count(*) from public.academies),
    'upcoming_events',  (select count(*) from public.events where status = 'published' and ends_at >= now()),
    'open_commercial',  (select count(*) from public.commercial_reviews where status = 'open')
                      + (select count(*) from public.commercial_appeals where status = 'open'),
    'businesses',       (select count(*) from public.businesses),
    'active_subscriptions', (select count(*) from public.subscriptions where status = 'active')
  );
end;
$$;
