-- Fase 5 · Eventos (campeonatos, seminários, open mats...) com interesse e salvar.
-- Organizador: professor aprovado (evento pessoal) ou gestor de academia (evento da academia).

create type public.event_type   as enum ('championship', 'seminar', 'open_mat', 'graduation', 'workshop', 'special_training', 'other');
create type public.event_status as enum ('draft', 'published', 'cancelled');
create type public.event_interest_kind as enum ('interested', 'saved');

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  created_by      uuid not null references public.profiles (id) on delete cascade,
  academy_id      uuid references public.academies (id) on delete cascade,  -- organizadora (opcional)
  type            public.event_type not null default 'other',
  martial_art_id  uuid references public.martial_arts (id) on delete set null,  -- nulo = várias modalidades
  title           text not null constraint events_title_length check (char_length(btrim(title)) between 3 and 120),
  description     text constraint events_description_length check (char_length(description) <= 5000),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  -- Local: uma unidade da academia organizadora OU endereço próprio. Cidade/UF/coordenadas
  -- são copiadas da unidade (trigger) para filtrar sem join.
  unit_id         uuid references public.academy_units (id) on delete set null,
  venue_name      text constraint events_venue_length check (char_length(venue_name) <= 120),
  street          text constraint events_street_length check (char_length(street) <= 120),
  number          text constraint events_number_length check (char_length(number) <= 20),
  neighborhood    text constraint events_neighborhood_length check (char_length(neighborhood) <= 80),
  postal_code     text constraint events_postal_code check (postal_code ~ '^\d{8}$'),
  city            text not null constraint events_city_length check (char_length(btrim(city)) between 2 and 80),
  state           char(2) not null constraint events_state check (state ~ '^[A-Z]{2}$'),
  latitude        double precision check (latitude between -90 and 90),
  longitude       double precision check (longitude between -180 and 180),
  location        extensions.geography(Point, 4326) generated always as (
                    case when latitude is not null and longitude is not null
                         then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
                    end
                  ) stored,
  external_url    text constraint events_external_url check (external_url ~ '^https://[^\s<>"]{3,}$' and char_length(external_url) <= 300),
  status          public.event_status not null default 'draft',
  interest_count  integer not null default 0 check (interest_count >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint events_time_order check (ends_at >= starts_at and ends_at <= starts_at + interval '31 days'),
  constraint events_coords_pair check ((latitude is null) = (longitude is null))
);

create index events_published_starts_idx on public.events (starts_at) where status in ('published', 'cancelled');
create index events_state_starts_idx on public.events (state, starts_at) where status in ('published', 'cancelled');
create index events_academy_idx on public.events (academy_id, starts_at);
create index events_created_by_idx on public.events (created_by, starts_at);
create index events_location_idx on public.events using gist (location);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create or replace function public.can_view_event(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    join public.profiles p on p.id = e.created_by
    where e.id = p_event
      and (
        e.created_by = (select auth.uid())
        or (e.academy_id is not null and public.is_academy_manager(e.academy_id))
        or public.has_role('moderator')
        or (e.status in ('published', 'cancelled')
            and p.status = 'active'
            and not public.has_blocked_me(e.created_by)
            and (e.academy_id is null or public.is_academy_visible(e.academy_id)))
      )
  );
$$;

-- Organizador ativo, sem bloqueio, e academia (se houver) visível.
create or replace function public.event_owner_visible(p_created_by uuid, p_academy uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = p_created_by and p.status = 'active')
     and not public.has_blocked_me(p_created_by)
     and (p_academy is null or public.is_academy_visible(p_academy));
$$;

create or replace function public.events_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit public.academy_units%rowtype;
begin
  if tg_op = 'INSERT' then
    new.interest_count := 0;
    if auth.uid() is not null then
      perform public.enforce_rate_limit('event:' || new.created_by, 10, interval '1 day');
      if new.starts_at < now() - interval '1 day' then
        raise exception 'event_in_past' using errcode = '23514';
      end if;
    end if;
  else
    new.created_by := old.created_by;
    new.academy_id := old.academy_id;
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      raise exception 'event_cancelled' using errcode = '23514';
    end if;
  end if;

  -- Quem organiza: gestor da academia indicada, ou professor aprovado (evento pessoal).
  if auth.uid() is not null and tg_op = 'INSERT' then
    if new.academy_id is not null then
      if not public.is_academy_manager(new.academy_id) then
        raise exception 'not_academy_manager' using errcode = '42501';
      end if;
    elsif not public.is_approved_teacher(new.created_by) then
      raise exception 'not_approved_teacher' using errcode = '42501';
    end if;
  end if;

  if new.unit_id is not null then
    select * into v_unit from public.academy_units where id = new.unit_id;
    if not found or new.academy_id is null or v_unit.academy_id <> new.academy_id then
      raise exception 'unit_not_in_academy' using errcode = '23514';
    end if;
    new.venue_name   := coalesce(nullif(btrim(new.venue_name), ''), v_unit.name);
    new.street       := v_unit.street;
    new.number       := v_unit.number;
    new.neighborhood := v_unit.neighborhood;
    new.postal_code  := v_unit.postal_code;
    new.city         := v_unit.city;
    new.state        := v_unit.state;
    new.latitude     := v_unit.latitude;
    new.longitude    := v_unit.longitude;
  end if;
  return new;
end;
$$;

create trigger events_before_write
  before insert or update on public.events
  for each row execute function public.events_before_write();

create table public.event_interests (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.event_interest_kind not null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id, kind)
);

create index event_interests_user_idx on public.event_interests (user_id, kind, created_at desc);

create or replace function public.event_interests_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.kind = 'interested' then
    update public.events set interest_count = interest_count + 1 where id = new.event_id;
  elsif tg_op = 'DELETE' and old.kind = 'interested' then
    update public.events set interest_count = greatest(interest_count - 1, 0) where id = old.event_id;
  end if;
  return null;
end;
$$;

create trigger event_interests_counter
  after insert or delete on public.event_interests
  for each row execute function public.event_interests_counter();

-- Conquistas podem apontar para um evento da plataforma.
alter table public.athlete_achievements add column event_id uuid references public.events (id) on delete set null;
grant insert (event_id), update (event_id) on public.athlete_achievements to authenticated;

-- ---------------------------------------------------------------------------
-- Aviso aos interessados quando o evento é cancelado ou muda de data
-- ---------------------------------------------------------------------------
alter table public.notifications add column event_id uuid references public.events (id) on delete cascade;

create or replace function public.events_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'published'
     and (new.status = 'cancelled' or new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at) then
    insert into public.notifications (recipient_id, actor_id, type, event_id)
    select distinct i.user_id, new.created_by, 'event_update'::public.notification_type, new.id
    from public.event_interests i
    where i.event_id = new.id
      and i.user_id <> new.created_by
      and not public.is_blocked_between(i.user_id, new.created_by);
  end if;
  return null;
end;
$$;

create trigger events_after_update
  after update of status, starts_at, ends_at on public.events
  for each row execute function public.events_after_update();

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
  ac.name             as academy_name,
  n.event_id,
  ev.title            as event_title,
  ev.status           as event_status
from public.notifications n
left join public.profiles a on a.id = n.actor_id
left join public.posts p on p.id = n.post_id
left join public.academies ac on ac.id = n.academy_id
left join public.events ev on ev.id = n.event_id;

grant select on public.notification_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Leitura pronta para a interface
-- ---------------------------------------------------------------------------
create view public.event_cards with (security_invoker = true) as
select
  e.id,
  e.created_by,
  o.username::text   as organizer_username,
  o.display_name     as organizer_display_name,
  e.academy_id,
  ac.name            as academy_name,
  ac.slug            as academy_slug,
  e.type,
  e.martial_art_id,
  m.name             as martial_art_name,
  e.title,
  e.description,
  e.starts_at,
  e.ends_at,
  e.unit_id,
  e.venue_name,
  e.street,
  e.number,
  e.neighborhood,
  e.postal_code,
  e.city,
  e.state,
  e.latitude,
  e.longitude,
  e.external_url,
  e.status,
  e.interest_count,
  e.created_at,
  exists (select 1 from public.event_interests i
          where i.event_id = e.id and i.user_id = (select auth.uid()) and i.kind = 'interested') as viewer_interested,
  exists (select 1 from public.event_interests i
          where i.event_id = e.id and i.user_id = (select auth.uid()) and i.kind = 'saved') as viewer_saved
from public.events e
join public.profiles o on o.id = e.created_by
left join public.academies ac on ac.id = e.academy_id
left join public.martial_arts m on m.id = e.martial_art_id;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
revoke all on public.events, public.event_interests from anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert (created_by, academy_id, type, martial_art_id, title, description, starts_at, ends_at, unit_id,
              venue_name, street, number, neighborhood, postal_code, city, state, latitude, longitude,
              external_url, status)
  on public.events to authenticated;
grant update (type, martial_art_id, title, description, starts_at, ends_at, unit_id,
              venue_name, street, number, neighborhood, postal_code, city, state, latitude, longitude,
              external_url, status)
  on public.events to authenticated;
grant delete on public.events to authenticated;
grant select on public.event_interests to anon, authenticated;
grant insert (event_id, user_id, kind), delete on public.event_interests to authenticated;
grant select on public.event_cards to anon, authenticated;
grant execute on function public.can_view_event(uuid) to anon, authenticated;
grant execute on function public.event_owner_visible(uuid, uuid) to anon, authenticated;

alter table public.events          enable row level security;
alter table public.event_interests enable row level security;

-- Usa as colunas da própria linha (e não can_view_event(id)): no INSERT ... RETURNING a linha
-- nova ainda não é visível para uma função que consulta a tabela.
create policy events_select on public.events
  for select to anon, authenticated
  using (
    created_by = (select auth.uid())
    or (academy_id is not null and public.is_academy_manager(academy_id))
    or (select public.has_role('moderator'))
    or (status in ('published', 'cancelled') and public.event_owner_visible(created_by, academy_id))
  );
create policy events_insert on public.events
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy events_update on public.events
  for update to authenticated
  using (created_by = (select auth.uid()) or (academy_id is not null and public.is_academy_manager(academy_id)))
  with check (created_by = (select auth.uid()) or (academy_id is not null and public.is_academy_manager(academy_id)));
-- Excluir só rascunho. Publicado se cancela (os interessados são avisados).
create policy events_delete on public.events
  for delete to authenticated
  using (status = 'draft'
         and (created_by = (select auth.uid()) or (academy_id is not null and public.is_academy_manager(academy_id))));

-- Interesse e salvos são privados: cada um vê só os seus (a contagem é pública).
create policy event_interests_select_own on public.event_interests
  for select to authenticated using (user_id = (select auth.uid()));
create policy event_interests_insert on public.event_interests
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
              and public.can_view_event(event_id));
create policy event_interests_delete_own on public.event_interests
  for delete to authenticated using (user_id = (select auth.uid()));
