-- Fase 4 · Fluxo de vínculos com aceite mútuo, notificações de academia e busca de aulas.

-- ---------------------------------------------------------------------------
-- Notificações ganham referência à academia
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column academy_id uuid references public.academies (id) on delete cascade;

drop function public.notify(uuid, uuid, public.notification_type, uuid, uuid);

create or replace function public.notify(
  p_recipient uuid, p_actor uuid, p_type public.notification_type,
  p_post uuid default null, p_comment uuid default null, p_academy uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
begin
  if p_recipient is null or p_recipient = p_actor or public.is_blocked_between(p_recipient, p_actor) then
    return;
  end if;

  select case p_type
           when 'like'    then s.notify_likes
           when 'comment' then s.notify_comments
           when 'reply'   then s.notify_comments
           when 'follow'  then s.notify_follows
           else true  -- solicitações, marcações, vínculos e moderação pedem resposta: sempre avisa
         end
  into v_enabled
  from public.user_settings s where s.user_id = p_recipient;

  if coalesce(v_enabled, false) then
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id, academy_id)
    values (p_recipient, p_actor, p_type, p_post, p_comment, p_academy)
    on conflict do nothing;
  end if;
end;
$$;

revoke execute on function public.notify(uuid, uuid, public.notification_type, uuid, uuid, uuid) from public, anon, authenticated;

drop view public.notification_cards;
create view public.notification_cards with (security_invoker = true) as
select
  n.id,
  n.type,
  n.read_at,
  n.created_at,
  n.post_id,
  n.comment_id,
  n.academy_id,
  n.actor_id,
  a.username::text    as actor_username,
  a.display_name      as actor_display_name,
  a.avatar_path       as actor_avatar_path,
  left(p.caption, 80) as post_excerpt,
  ac.slug             as academy_slug,
  ac.name             as academy_name
from public.notifications n
left join public.profiles a on a.id = n.actor_id
left join public.posts p on p.id = n.post_id
left join public.academies ac on ac.id = n.academy_id;

grant select on public.notification_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Vínculos: a outra parte sempre aprova (DATA_MODEL.md §4.3)
-- ---------------------------------------------------------------------------
create or replace function public.notify_academy_managers(p_academy uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manager uuid;
begin
  for v_manager in
    select user_id from public.academy_memberships
    where academy_id = p_academy and role in ('owner', 'admin') and status = 'active'
  loop
    perform public.notify(v_manager, p_actor, 'membership_request', null, null, p_academy);
  end loop;
end;
$$;

-- Usuário pede vínculo de aluno ou professor. Se a academia já tinha convidado, ativa na hora.
create or replace function public.request_membership(p_academy uuid, p_role public.membership_role)
returns public.membership_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_existing public.academy_memberships;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_role not in ('student', 'teacher') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if not exists (select 1 from public.academies where id = p_academy and status = 'active') then
    raise exception 'academy_not_found' using errcode = 'P0002';
  end if;
  if p_role = 'teacher' and not public.is_approved_teacher(v_uid) then
    raise exception 'teacher_not_approved' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('membership:' || v_uid, 30, interval '1 day');

  select * into v_existing from public.academy_memberships
  where academy_id = p_academy and user_id = v_uid and role = p_role;

  if found and v_existing.status = 'active' then
    return 'active';
  elsif found and v_existing.status = 'pending' and v_existing.requested_by = 'academy' then
    update public.academy_memberships
    set status = 'active', approved_by = v_uid, approved_at = now()
    where academy_id = p_academy and user_id = v_uid and role = p_role;
    return 'active';
  end if;

  insert into public.academy_memberships (academy_id, user_id, role, status, requested_by)
  values (p_academy, v_uid, p_role, 'pending', 'user')
  on conflict (academy_id, user_id, role) do update
    set status = 'pending', requested_by = 'user', approved_by = null, approved_at = null;

  perform public.notify_academy_managers(p_academy, v_uid);
  return 'pending';
end;
$$;

-- Gestão convida professor ou admin pelo @usuario. Se a pessoa já tinha pedido, ativa na hora.
create or replace function public.invite_member(p_academy uuid, p_username text, p_role public.membership_role)
returns public.membership_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_target   uuid;
  v_existing public.academy_memberships;
begin
  if not public.is_academy_manager(p_academy) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('teacher', 'admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  select id into v_target from public.profiles
  where username = lower(btrim(p_username))::extensions.citext and status = 'active';
  if v_target is null or public.is_blocked_between(v_target, v_uid) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if p_role = 'teacher' and not public.is_approved_teacher(v_target) then
    raise exception 'teacher_not_approved' using errcode = '23514';
  end if;
  perform public.enforce_rate_limit('invite:' || v_uid, 50, interval '1 day');

  select * into v_existing from public.academy_memberships
  where academy_id = p_academy and user_id = v_target and role = p_role;

  if found and v_existing.status = 'active' then
    return 'active';
  elsif found and v_existing.status = 'pending' and v_existing.requested_by = 'user' then
    update public.academy_memberships
    set status = 'active', approved_by = v_uid, approved_at = now()
    where academy_id = p_academy and user_id = v_target and role = p_role;
    return 'active';
  end if;

  insert into public.academy_memberships (academy_id, user_id, role, status, requested_by)
  values (p_academy, v_target, p_role, 'pending', 'academy')
  on conflict (academy_id, user_id, role) do update
    set status = 'pending', requested_by = 'academy', approved_by = null, approved_at = null;

  perform public.notify(v_target, v_uid, 'membership_request', null, null, p_academy);
  return 'pending';
end;
$$;

-- Responder: quem não iniciou o pedido decide.
create or replace function public.respond_membership(
  p_academy uuid, p_user uuid, p_role public.membership_role, p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.academy_memberships;
begin
  select * into v_row from public.academy_memberships
  where academy_id = p_academy and user_id = p_user and role = p_role and status = 'pending';
  if not found then
    raise exception 'membership_not_found' using errcode = 'P0002';
  end if;

  if (v_row.requested_by = 'user' and not public.is_academy_manager(p_academy))
     or (v_row.requested_by = 'academy' and p_user <> v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.academy_memberships
  set status = case when p_accept then 'active' else 'rejected' end::public.membership_status,
      approved_by = case when p_accept then v_uid end,
      approved_at = case when p_accept then now() end
  where academy_id = p_academy and user_id = p_user and role = p_role;
end;
$$;

-- Sair de um vínculo. O último owner não pode sair (a academia ficaria sem gestão).
create or replace function public.leave_membership(p_academy uuid, p_role public.membership_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_role = 'owner' and (
    select count(*) from public.academy_memberships
    where academy_id = p_academy and role = 'owner' and status = 'active'
  ) <= 1 then
    raise exception 'last_owner' using errcode = '23514';
  end if;
  update public.academy_memberships set status = 'left'
  where academy_id = p_academy and user_id = auth.uid() and role = p_role and status in ('active', 'pending');
  if not found then
    raise exception 'membership_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Gestão remove alguém. Owners só saem por conta própria.
create or replace function public.remove_member(p_academy uuid, p_user uuid, p_role public.membership_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_academy_manager(p_academy) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'cannot_remove_owner' using errcode = '23514';
  end if;
  delete from public.academy_memberships where academy_id = p_academy and user_id = p_user and role = p_role;
end;
$$;

-- Cria a academia e as modalidades numa transação. Quem cria vira owner (trigger).
create or replace function public.create_academy(
  p_name text, p_description text default null, p_martial_art_ids uuid[] default '{}'
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id   uuid;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  insert into public.academies (name, description, created_by)
  values (btrim(p_name), nullif(btrim(p_description), ''), auth.uid())
  returning id, slug into v_id, v_slug;

  insert into public.academy_martial_arts (academy_id, martial_art_id)
  select v_id, unnest(p_martial_art_ids) on conflict do nothing;
  return v_slug;
end;
$$;

revoke execute on function public.notify_academy_managers(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.request_membership(uuid, public.membership_role),
  public.invite_member(uuid, text, public.membership_role),
  public.respond_membership(uuid, uuid, public.membership_role, boolean),
  public.leave_membership(uuid, public.membership_role),
  public.remove_member(uuid, uuid, public.membership_role),
  public.create_academy(text, text, uuid[]) from public, anon;
grant execute on function public.request_membership(uuid, public.membership_role),
  public.invite_member(uuid, text, public.membership_role),
  public.respond_membership(uuid, uuid, public.membership_role, boolean),
  public.leave_membership(uuid, public.membership_role),
  public.remove_member(uuid, uuid, public.membership_role),
  public.create_academy(text, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Leitura: aulas com academia, unidade e professor
-- ---------------------------------------------------------------------------
create view public.class_cards with (security_invoker = true) as
select
  c.id,
  c.academy_id,
  a.slug             as academy_slug,
  a.name             as academy_name,
  a.is_verified      as academy_verified,
  c.unit_id,
  u.name             as unit_name,
  u.street, u.number, u.complement, u.neighborhood, u.city, u.state, u.postal_code, u.reference_point,
  u.latitude, u.longitude,
  c.teacher_id,
  t.username::text   as teacher_username,
  t.display_name     as teacher_display_name,
  c.martial_art_id,
  m.name             as martial_art_name,
  c.name,
  c.level,
  c.weekday,
  c.starts_at,
  c.ends_at,
  c.accepts_trial,
  c.notes,
  c.status
from public.class_schedules c
join public.academies a on a.id = c.academy_id
join public.academy_units u on u.id = c.unit_id
join public.martial_arts m on m.id = c.martial_art_id
left join public.profiles t on t.id = c.teacher_id;

grant select on public.class_cards to anon, authenticated;

-- Grade unificada do professor em todas as academias com vínculo ativo (aceite da Fase 4).
create or replace function public.get_teacher_schedule(p_teacher uuid)
returns setof public.class_cards
language sql
stable
security invoker
set search_path = ''
as $$
  select c.* from public.class_cards c
  where c.teacher_id = p_teacher
    and c.status <> 'cancelled'
    and exists (select 1 from public.academy_memberships m
                where m.academy_id = c.academy_id and m.user_id = p_teacher and m.role = 'teacher' and m.status = 'active')
  order by c.weekday, c.starts_at, c.academy_name;
$$;

-- Busca de aulas: modalidade, nível, dia, período, aula experimental, cidade/bairro e distância.
-- A localização do usuário só entra na consulta e nunca é gravada (SECURITY.md §7).
create or replace function public.search_classes(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default 10,
  p_martial_art uuid default null,
  p_level public.class_level default null,
  p_weekday smallint default null,
  p_period text default null,          -- 'morning' | 'afternoon' | 'evening'
  p_trial_only boolean default false,
  p_city text default null,
  p_neighborhood text default null,
  p_limit integer default 50
)
returns table (class public.class_cards, distance_km double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  with origin as (
    select case when p_lat is not null and p_lng is not null
                then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end as g
  )
  select c, round((extensions.st_distance(u.location, o.g) / 1000)::numeric, 1)::double precision
  from public.class_cards c
  join public.academy_units u on u.id = c.unit_id
  cross join origin o
  where c.status = 'active'
    and (p_martial_art is null or c.martial_art_id = p_martial_art)
    and (p_level is null or c.level = p_level or (c.level = 'all' and p_level <> 'kids'))
    and (p_weekday is null or c.weekday = p_weekday)
    and (p_period is null
         or (p_period = 'morning'   and c.starts_at < time '12:00')
         or (p_period = 'afternoon' and c.starts_at >= time '12:00' and c.starts_at < time '18:00')
         or (p_period = 'evening'   and c.starts_at >= time '18:00'))
    and (not p_trial_only or c.accepts_trial)
    and (p_city is null or public.search_normalize(u.city) = public.search_normalize(btrim(p_city)))
    and (p_neighborhood is null or public.search_normalize(u.neighborhood) like '%' || public.search_normalize(btrim(p_neighborhood)) || '%')
    and (o.g is null or extensions.st_dwithin(u.location, o.g, least(greatest(p_radius_km, 0.5), 100) * 1000))
  order by (case when o.g is not null then extensions.st_distance(u.location, o.g) end) nulls last,
           c.weekday, c.starts_at
  limit least(greatest(p_limit, 1), 100);
$$;

-- Lista de academias (busca por nome/cidade), com cidades das unidades e modalidades.
create or replace function public.search_academies(
  p_query text default null, p_city text default null, p_martial_art uuid default null, p_limit integer default 30
)
returns table (
  id uuid, slug text, name text, is_verified boolean, follower_count integer,
  cities text[], martial_arts text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id, a.slug, a.name, a.is_verified, a.follower_count,
         array(select distinct u.city || '/' || u.state from public.academy_units u where u.academy_id = a.id and u.is_active order by 1),
         array(select m.name from public.academy_martial_arts am join public.martial_arts m on m.id = am.martial_art_id
               where am.academy_id = a.id order by m.sort_order)
  from public.academies a
  where a.status = 'active'
    and (p_query is null or btrim(p_query) = ''
         or a.search_vector @@ plainto_tsquery('simple', public.search_normalize(p_query))
         or public.search_normalize(a.name) operator(extensions.%) public.search_normalize(p_query))
    and (p_city is null or btrim(p_city) = '' or exists (
          select 1 from public.academy_units u
          where u.academy_id = a.id and u.is_active and public.search_normalize(u.city) = public.search_normalize(btrim(p_city))))
    and (p_martial_art is null or exists (
          select 1 from public.academy_martial_arts am where am.academy_id = a.id and am.martial_art_id = p_martial_art))
  order by a.is_verified desc, a.follower_count desc, a.name
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.get_teacher_schedule(uuid) to anon, authenticated;
grant execute on function public.search_classes(double precision, double precision, double precision, uuid,
  public.class_level, smallint, text, boolean, text, text, integer) to anon, authenticated;
grant execute on function public.search_academies(text, text, uuid, integer) to anon, authenticated;
