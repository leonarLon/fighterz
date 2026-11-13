-- Fase 5 · Jornada esportiva: modalidades do atleta, graduações (com confirmação do professor),
-- conquistas e registros de treino (check-in), com post opcional no feed.

alter type public.notification_type add value if not exists 'promotion_request';

create type public.verification_status as enum ('self_reported', 'teacher_confirmed');
create type public.achievement_type   as enum ('competition_result', 'milestone', 'certification', 'other');
create type public.medal              as enum ('gold', 'silver', 'bronze');

-- Quem vê cada parte da jornada: o dono sempre; os demais conforme user_settings
-- (show_ranks, show_achievements, show_checkins) e a privacidade do perfil.
create or replace function public.can_view_journey(p_owner uuid, p_section text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_owner = (select auth.uid()) then true
    when public.has_role('moderator') then true
    when not public.can_view_profile_content(p_owner) then false
    else coalesce((
      select case
               when v = 'public' then true
               when v = 'followers' then public.is_following(p_owner)
               else false
             end
      from (
        select case p_section
                 when 'ranks'        then s.show_ranks
                 when 'achievements' then s.show_achievements
                 when 'checkins'     then s.show_checkins
               end as v
        from public.user_settings s where s.user_id = p_owner
      ) x
    ), false)
  end;
$$;

-- ---------------------------------------------------------------------------
-- Modalidades do atleta e histórico de graduações
-- ---------------------------------------------------------------------------
create table public.user_martial_arts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  martial_art_id  uuid not null references public.martial_arts (id) on delete cascade,
  -- Graduação atual: derivada da promoção mais recente (trigger), nunca escrita pelo usuário.
  current_rank_id uuid references public.martial_art_ranks (id) on delete set null,
  current_degree  smallint not null default 0,
  started_on      date check (started_on between date '1900-01-01' and date '2100-01-01'),
  federation      text constraint user_martial_arts_federation_length check (char_length(federation) <= 80),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, martial_art_id)
);

create trigger user_martial_arts_set_updated_at
  before update on public.user_martial_arts
  for each row execute function public.set_updated_at();

create or replace function public.user_martial_arts_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.started_on > current_date then
    raise exception 'started_on_in_future' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger user_martial_arts_before_write
  before insert or update on public.user_martial_arts
  for each row execute function public.user_martial_arts_before_write();

create table public.rank_promotions (
  id                 uuid primary key default gen_random_uuid(),
  user_martial_art_id uuid not null references public.user_martial_arts (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,  -- copiado da modalidade (trigger)
  rank_id            uuid not null references public.martial_art_ranks (id) on delete cascade,
  degree             smallint not null default 0 check (degree between 0 and 10),
  promoted_on        date not null check (promoted_on >= date '1900-01-01'),
  academy_id         uuid references public.academies (id) on delete set null,
  teacher_id         uuid references public.profiles (id) on delete set null,
  verification       public.verification_status not null default 'self_reported',
  confirmed_at       timestamptz,
  notes              text constraint rank_promotions_notes_length check (char_length(notes) <= 500),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index rank_promotions_uma_idx on public.rank_promotions (user_martial_art_id, promoted_on desc);
create index rank_promotions_teacher_pending_idx on public.rank_promotions (teacher_id, created_at)
  where verification = 'self_reported' and teacher_id is not null;

create trigger rank_promotions_set_updated_at
  before update on public.rank_promotions
  for each row execute function public.set_updated_at();

-- Valida graduação e graus (ex.: BJJ faixa azul aceita 0 a 4 graus; coral não tem graus).
create or replace function public.rank_promotions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uma public.user_martial_arts%rowtype;
  v_max smallint;
begin
  select * into v_uma from public.user_martial_arts where id = new.user_martial_art_id;
  if not found then
    raise exception 'user_martial_art_not_found' using errcode = 'P0002';
  end if;
  new.user_id := v_uma.user_id;

  select max_degrees into v_max
  from public.martial_art_ranks where id = new.rank_id and martial_art_id = v_uma.martial_art_id;
  if not found then
    raise exception 'rank_not_in_martial_art' using errcode = '23514';
  end if;
  if new.degree > v_max then
    raise exception 'degree_exceeds_max' using errcode = '23514', detail = format('max_degrees=%s', v_max);
  end if;
  if new.promoted_on > current_date then
    raise exception 'promoted_on_in_future' using errcode = '23514';
  end if;
  if new.teacher_id is not null and (new.teacher_id = new.user_id or not public.is_approved_teacher(new.teacher_id)) then
    raise exception 'teacher_not_approved' using errcode = '23514';
  end if;

  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.verification := 'self_reported';
      new.confirmed_at := null;
    elsif new.rank_id is distinct from old.rank_id or new.degree is distinct from old.degree
       or new.promoted_on is distinct from old.promoted_on or new.teacher_id is distinct from old.teacher_id then
      -- Mudou o que foi confirmado: volta a ser autodeclarado.
      new.verification := 'self_reported';
      new.confirmed_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger rank_promotions_before_write
  before insert or update on public.rank_promotions
  for each row execute function public.rank_promotions_before_write();

-- Graduação atual = promoção mais recente (data, depois ordem da faixa e grau).
create or replace function public.refresh_current_rank(p_uma uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_martial_arts u
  set current_rank_id = latest.rank_id, current_degree = coalesce(latest.degree, 0)
  from (select null::int as k) dummy
  left join lateral (
    select rp.rank_id, rp.degree
    from public.rank_promotions rp
    join public.martial_art_ranks r on r.id = rp.rank_id
    where rp.user_martial_art_id = p_uma
    order by rp.promoted_on desc, r.ordinal desc, rp.degree desc
    limit 1
  ) latest on true
  where u.id = p_uma;
$$;

create or replace function public.rank_promotions_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_current_rank(old.user_martial_art_id);
    return old;
  end if;
  perform public.refresh_current_rank(new.user_martial_art_id);
  -- Professor indicado recebe o pedido de confirmação.
  if new.teacher_id is not null and new.verification = 'self_reported'
     and (tg_op = 'INSERT' or new.teacher_id is distinct from old.teacher_id
          or (old.verification = 'teacher_confirmed')) then
    perform public.notify(new.teacher_id, new.user_id, 'promotion_request');
  end if;
  return new;
end;
$$;

create trigger rank_promotions_after_write
  after insert or update or delete on public.rank_promotions
  for each row execute function public.rank_promotions_after_write();

-- Só o professor indicado confirma (ou recusa, o que desfaz a indicação).
create or replace function public.confirm_promotion(p_promotion uuid, p_confirm boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.rank_promotions%rowtype;
begin
  select * into v_row from public.rank_promotions where id = p_promotion for update;
  if not found or v_row.teacher_id is distinct from v_uid then
    raise exception 'not_the_teacher' using errcode = '42501';
  end if;
  if not public.is_approved_teacher(v_uid) then
    raise exception 'teacher_not_approved' using errcode = '42501';
  end if;
  if v_row.verification = 'teacher_confirmed' then
    return;
  end if;

  if p_confirm then
    update public.rank_promotions
    set verification = 'teacher_confirmed', confirmed_at = now()
    where id = p_promotion;
    perform public.notify(v_row.user_id, v_uid, 'promotion_confirmed');
  else
    update public.rank_promotions set teacher_id = null where id = p_promotion;
  end if;
end;
$$;

-- Leitura pronta para a interface (jornada, perfil e fila do professor).
create view public.promotion_cards with (security_invoker = true) as
select
  rp.id,
  rp.user_martial_art_id,
  rp.user_id,
  o.username::text     as user_username,
  o.display_name       as user_display_name,
  uma.martial_art_id,
  m.name               as martial_art_name,
  rp.rank_id,
  r.name               as rank_name,
  r.color_hex          as rank_color,
  r.secondary_color_hex as rank_secondary_color,
  r.max_degrees,
  r.ordinal            as rank_ordinal,
  rp.degree,
  rp.promoted_on,
  rp.academy_id,
  a.name               as academy_name,
  a.slug               as academy_slug,
  rp.teacher_id,
  t.username::text     as teacher_username,
  t.display_name       as teacher_display_name,
  rp.verification,
  rp.confirmed_at,
  rp.notes,
  rp.created_at
from public.rank_promotions rp
join public.user_martial_arts uma on uma.id = rp.user_martial_art_id
join public.martial_arts m on m.id = uma.martial_art_id
join public.martial_art_ranks r on r.id = rp.rank_id
join public.profiles o on o.id = rp.user_id
left join public.academies a on a.id = rp.academy_id
left join public.profiles t on t.id = rp.teacher_id;

create view public.journey_cards with (security_invoker = true) as
select
  uma.id,
  uma.user_id,
  uma.martial_art_id,
  m.name                as martial_art_name,
  m.slug                as martial_art_slug,
  m.has_ranks,
  m.sort_order,
  uma.current_rank_id,
  r.name                as rank_name,
  r.color_hex           as rank_color,
  r.secondary_color_hex as rank_secondary_color,
  r.max_degrees,
  uma.current_degree,
  uma.started_on,
  uma.federation,
  exists (select 1 from public.rank_promotions rp
          where rp.user_martial_art_id = uma.id and rp.rank_id = uma.current_rank_id
            and rp.degree = uma.current_degree and rp.verification = 'teacher_confirmed') as current_confirmed
from public.user_martial_arts uma
join public.martial_arts m on m.id = uma.martial_art_id
left join public.martial_art_ranks r on r.id = uma.current_rank_id;

-- ---------------------------------------------------------------------------
-- Conquistas
-- ---------------------------------------------------------------------------
create table public.athlete_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  martial_art_id uuid references public.martial_arts (id) on delete set null,
  type           public.achievement_type not null default 'competition_result',
  title          text not null constraint athlete_achievements_title_length check (char_length(btrim(title)) between 2 and 120),
  event_name     text constraint athlete_achievements_event_name_length check (char_length(event_name) <= 120),
  placement      smallint check (placement between 1 and 1000),
  medal          public.medal,
  division       text constraint athlete_achievements_division_length check (char_length(division) <= 80),
  achieved_on    date not null check (achieved_on >= date '1900-01-01'),
  evidence_url   text constraint athlete_achievements_evidence_url check (evidence_url ~ '^https://[^\s<>"]{3,}$' and char_length(evidence_url) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index athlete_achievements_user_idx on public.athlete_achievements (user_id, achieved_on desc);

create trigger athlete_achievements_set_updated_at
  before update on public.athlete_achievements
  for each row execute function public.set_updated_at();

create or replace function public.athlete_achievements_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.achieved_on > current_date then
    raise exception 'achieved_on_in_future' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and auth.uid() is not null then
    perform public.enforce_rate_limit('achievement:' || new.user_id, 30, interval '1 day');
  end if;
  return new;
end;
$$;

create trigger athlete_achievements_before_write
  before insert or update on public.athlete_achievements
  for each row execute function public.athlete_achievements_before_write();

-- ---------------------------------------------------------------------------
-- Registros de treino. A interface diz "registrou um treino em X", nunca "esteve em X".
-- ---------------------------------------------------------------------------
alter table public.posts add column academy_id uuid references public.academies (id) on delete set null;

create table public.training_checkins (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  martial_art_id    uuid not null references public.martial_arts (id),
  academy_id        uuid references public.academies (id) on delete set null,
  class_schedule_id uuid references public.class_schedules (id) on delete set null,
  trained_at        timestamptz not null,
  duration_min      smallint check (duration_min between 5 and 600),
  notes             text constraint training_checkins_notes_length check (char_length(notes) <= 500),
  post_id           uuid references public.posts (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index training_checkins_user_idx on public.training_checkins (user_id, trained_at desc);

create or replace function public.training_checkins_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.trained_at > now() + interval '1 hour' then
    raise exception 'trained_at_in_future' using errcode = '23514';
  end if;
  if new.trained_at < now() - interval '5 years' then
    raise exception 'trained_at_too_old' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and auth.uid() is not null then
    perform public.enforce_rate_limit('checkin:' || new.user_id, 5, interval '1 day');
  end if;
  return new;
end;
$$;

create trigger training_checkins_before_write
  before insert or update on public.training_checkins
  for each row execute function public.training_checkins_before_write();

-- Registra o treino e, se pedido, publica um post "registrou um treino" na mesma transação.
-- security definer: grava colunas que o usuário não escreve direto (posts.kind, posts.academy_id).
create or replace function public.create_checkin(
  p_trained_at        timestamptz,
  p_martial_art_id    uuid default null,
  p_duration_min      integer default null,
  p_notes             text default null,
  p_academy_id        uuid default null,
  p_class_schedule_id uuid default null,
  p_share             boolean default false,
  p_visibility        public.visibility default 'followers'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_art     uuid := p_martial_art_id;
  v_academy uuid := p_academy_id;
  v_notes   text := nullif(btrim(p_notes), '');
  v_post    uuid;
  v_id      uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and status = 'active') then
    raise exception 'account_inactive' using errcode = '42501';
  end if;

  if p_class_schedule_id is not null then
    select c.academy_id, coalesce(v_art, c.martial_art_id) into v_academy, v_art
    from public.class_schedules c
    where c.id = p_class_schedule_id and (v_academy is null or c.academy_id = v_academy);
    if not found then
      raise exception 'class_not_in_academy' using errcode = '23514';
    end if;
  end if;
  if v_academy is not null and not exists (select 1 from public.academies where id = v_academy and status = 'active') then
    raise exception 'academy_not_found' using errcode = 'P0002';
  end if;
  if v_art is null or not exists (select 1 from public.martial_arts where id = v_art and is_active) then
    raise exception 'martial_art_not_found' using errcode = 'P0002';
  end if;

  if p_share then
    insert into public.posts (author_id, kind, caption, visibility, martial_art_id, academy_id)
    values (v_uid, 'checkin', coalesce(v_notes, ''), p_visibility, v_art, v_academy)
    returning id into v_post;
  end if;

  insert into public.training_checkins (user_id, martial_art_id, academy_id, class_schedule_id, trained_at, duration_min, notes, post_id)
  values (v_uid, v_art, v_academy, p_class_schedule_id, p_trained_at, p_duration_min, v_notes, v_post)
  returning id into v_id;

  return v_id;
end;
$$;

-- post_cards ganha a academia (posts de treino). Colunas novas sempre no fim.
create or replace view public.post_cards with (security_invoker = true) as
select
  p.id,
  p.author_id,
  a.username::text           as author_username,
  a.display_name             as author_display_name,
  a.avatar_path              as author_avatar_path,
  p.kind,
  p.caption,
  p.visibility,
  p.location_label,
  p.martial_art_id,
  m.name                     as martial_art_name,
  p.like_count,
  p.comment_count,
  p.save_count,
  p.moderation_status,
  p.created_at,
  coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', pm.id, 'path', pm.storage_path, 'width', pm.width, 'height', pm.height, 'alt', pm.alt_text
           ) order by pm.position)
    from public.post_media pm where pm.post_id = p.id
  ), '[]'::jsonb)            as media,
  coalesce((
    select jsonb_agg(u.username::text order by u.username)
    from public.post_mentions mn join public.profiles u on u.id = mn.user_id
    where mn.post_id = p.id and mn.status = 'approved'
  ), '[]'::jsonb)            as mentions,
  exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid()))  as viewer_has_liked,
  exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())) as viewer_has_saved,
  p.academy_id,
  ac.name                    as academy_name,
  ac.slug                    as academy_slug
from public.posts p
join public.profiles a on a.id = p.author_id
left join public.martial_arts m on m.id = p.martial_art_id
left join public.academies ac on ac.id = p.academy_id
where p.deleted_at is null;

create view public.checkin_cards with (security_invoker = true) as
select
  c.id,
  c.user_id,
  c.martial_art_id,
  m.name     as martial_art_name,
  c.academy_id,
  a.name     as academy_name,
  a.slug     as academy_slug,
  c.class_schedule_id,
  cs.name    as class_name,
  c.trained_at,
  c.duration_min,
  c.notes,
  c.post_id,
  c.created_at
from public.training_checkins c
join public.martial_arts m on m.id = c.martial_art_id
left join public.academies a on a.id = c.academy_id
left join public.class_schedules cs on cs.id = c.class_schedule_id;

-- Resumo para o perfil: treinos nos últimos 30 dias e no ano, respeitando show_checkins.
create or replace function public.get_training_summary(p_user uuid)
returns table (last_30_days integer, this_year integer, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where trained_at >= now() - interval '30 days')::integer,
    count(*) filter (where trained_at >= date_trunc('year', now()))::integer,
    count(*)::integer
  from public.training_checkins
  where user_id = p_user and public.can_view_journey(p_user, 'checkins');
$$;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
revoke all on public.user_martial_arts, public.rank_promotions, public.athlete_achievements, public.training_checkins
  from anon, authenticated;

grant select on public.user_martial_arts, public.rank_promotions, public.athlete_achievements, public.training_checkins
  to anon, authenticated;
grant insert (user_id, martial_art_id, started_on, federation), update (started_on, federation), delete
  on public.user_martial_arts to authenticated;
-- user_id é sobrescrito pelo trigger (vem da modalidade); a RLS confere que é o próprio usuário.
grant insert (user_martial_art_id, user_id, rank_id, degree, promoted_on, academy_id, teacher_id, notes),
      update (rank_id, degree, promoted_on, academy_id, teacher_id, notes), delete
  on public.rank_promotions to authenticated;
grant insert (martial_art_id, type, title, event_name, placement, medal, division, achieved_on, evidence_url),
      update (martial_art_id, type, title, event_name, placement, medal, division, achieved_on, evidence_url), delete
  on public.athlete_achievements to authenticated;
-- Check-in só nasce por create_checkin. O dono corrige duração e notas, ou apaga.
grant update (duration_min, notes), delete on public.training_checkins to authenticated;

grant select on public.promotion_cards, public.journey_cards, public.checkin_cards to anon, authenticated;

revoke execute on function public.refresh_current_rank(uuid) from public, anon, authenticated;
revoke execute on function public.confirm_promotion(uuid, boolean) from public, anon;
grant execute on function public.confirm_promotion(uuid, boolean) to authenticated;
revoke execute on function public.create_checkin(timestamptz, uuid, integer, text, uuid, uuid, boolean, public.visibility) from public, anon;
grant execute on function public.create_checkin(timestamptz, uuid, integer, text, uuid, uuid, boolean, public.visibility) to authenticated;
grant execute on function public.get_training_summary(uuid) to anon, authenticated;
grant execute on function public.can_view_journey(uuid, text) to anon, authenticated;

alter table public.user_martial_arts    enable row level security;
alter table public.rank_promotions      enable row level security;
alter table public.athlete_achievements enable row level security;
alter table public.training_checkins    enable row level security;

create policy user_martial_arts_select on public.user_martial_arts
  for select to anon, authenticated using (public.can_view_journey(user_id, 'ranks'));
create policy user_martial_arts_insert_own on public.user_martial_arts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy user_martial_arts_update_own on public.user_martial_arts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_martial_arts_delete_own on public.user_martial_arts
  for delete to authenticated using (user_id = (select auth.uid()));

-- O professor indicado vê a promoção que precisa confirmar.
create policy rank_promotions_select on public.rank_promotions
  for select to anon, authenticated
  using (public.can_view_journey(user_id, 'ranks') or teacher_id = (select auth.uid()));
create policy rank_promotions_insert_own on public.rank_promotions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy rank_promotions_update_own on public.rank_promotions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy rank_promotions_delete_own on public.rank_promotions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy athlete_achievements_select on public.athlete_achievements
  for select to anon, authenticated using (public.can_view_journey(user_id, 'achievements'));
create policy athlete_achievements_insert_own on public.athlete_achievements
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy athlete_achievements_update_own on public.athlete_achievements
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy athlete_achievements_delete_own on public.athlete_achievements
  for delete to authenticated using (user_id = (select auth.uid()));

create policy training_checkins_select on public.training_checkins
  for select to anon, authenticated using (public.can_view_journey(user_id, 'checkins'));
create policy training_checkins_update_own on public.training_checkins
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy training_checkins_delete_own on public.training_checkins
  for delete to authenticated using (user_id = (select auth.uid()));
