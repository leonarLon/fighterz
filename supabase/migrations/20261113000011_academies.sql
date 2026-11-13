-- Fase 4 · Academias, unidades, vínculos (aceite mútuo), seguidores e grade de aulas.

create type public.academy_status        as enum ('active', 'hidden', 'suspended');
create type public.coords_source         as enum ('manual', 'nominatim');
create type public.membership_role       as enum ('owner', 'admin', 'teacher', 'student');
create type public.membership_status     as enum ('pending', 'active', 'rejected', 'left');
create type public.membership_requester  as enum ('user', 'academy');
create type public.class_level           as enum ('all', 'beginner', 'intermediate', 'advanced', 'kids', 'competition');
create type public.class_status          as enum ('active', 'paused', 'cancelled');

-- "Academia Raiz & Cia." -> "academia-raiz-cia"
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(public.immutable_unaccent(p_text)), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Academias
-- ---------------------------------------------------------------------------
create table public.academies (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique constraint academies_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  name           text not null constraint academies_name_length check (char_length(btrim(name)) between 2 and 80),
  description    text constraint academies_description_length check (char_length(description) <= 3000),
  logo_path      text,
  cover_path     text,
  website        text constraint academies_website check (website ~ '^https://[^\s<>"]{3,}$' and char_length(website) <= 300),
  instagram      text constraint academies_instagram check (instagram ~ '^[A-Za-z0-9_.]{1,30}$'),
  contact_email  text constraint academies_contact_email check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contact_email) <= 254),
  contact_phone  text constraint academies_contact_phone check (contact_phone ~ '^\+?[0-9 ()-]{8,20}$'),
  external_links jsonb not null default '[]'::jsonb
                   constraint academies_external_links check (public.is_https_url_list(external_links, 10)),
  status         public.academy_status not null default 'active',
  is_verified    boolean not null default false,
  created_by     uuid references public.profiles (id) on delete set null,
  follower_count integer not null default 0 check (follower_count >= 0),
  search_vector  tsvector generated always as (
                   setweight(to_tsvector('simple'::regconfig, public.immutable_unaccent(name)), 'A') ||
                   setweight(to_tsvector('portuguese'::regconfig, public.immutable_unaccent(coalesce(description, ''))), 'C')
                 ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index academies_search_vector_idx on public.academies using gin (search_vector);
create index academies_name_trgm_idx on public.academies using gin (public.search_normalize(name) extensions.gin_trgm_ops);

create trigger academies_set_updated_at
  before update on public.academies
  for each row execute function public.set_updated_at();

create table public.academy_martial_arts (
  academy_id     uuid not null references public.academies (id) on delete cascade,
  martial_art_id uuid not null references public.martial_arts (id) on delete cascade,
  primary key (academy_id, martial_art_id)
);

-- ---------------------------------------------------------------------------
-- Vínculos
-- ---------------------------------------------------------------------------
create table public.academy_memberships (
  academy_id   uuid not null references public.academies (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         public.membership_role not null,
  status       public.membership_status not null default 'pending',
  requested_by public.membership_requester not null,
  approved_by  uuid references public.profiles (id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (academy_id, user_id, role)
);

create index academy_memberships_user_idx on public.academy_memberships (user_id, status);
create index academy_memberships_academy_idx on public.academy_memberships (academy_id, role, status);

create trigger academy_memberships_set_updated_at
  before update on public.academy_memberships
  for each row execute function public.set_updated_at();

-- Owner/admin ativo da academia (ou admin da plataforma).
create or replace function public.is_academy_manager(p_academy uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin') or exists (
    select 1 from public.academy_memberships
    where academy_id = p_academy and user_id = (select auth.uid())
      and role in ('owner', 'admin') and status = 'active'
  );
$$;

create or replace function public.is_academy_owner(p_academy uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.academy_memberships
    where academy_id = p_academy and user_id = (select auth.uid()) and role = 'owner' and status = 'active'
  );
$$;

create or replace function public.is_academy_visible(p_academy uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academies where id = p_academy and status = 'active')
      or public.is_academy_manager(p_academy)
      or public.has_role('moderator');
$$;

create or replace function public.academies_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text := left(public.slugify(new.name), 80);
  v_slug text;
  i      integer := 1;
begin
  if auth.uid() is not null then
    perform public.enforce_rate_limit('academy:' || auth.uid(), 5, interval '1 day');
    new.status := 'active';
    new.is_verified := false;
  end if;
  new.follower_count := 0;
  if v_base = '' then v_base := 'academia'; end if;
  v_slug := coalesce(nullif(new.slug, ''), v_base);
  while exists (select 1 from public.academies where slug = v_slug) loop
    i := i + 1;
    v_slug := v_base || '-' || i;
  end loop;
  new.slug := v_slug;
  return new;
end;
$$;

create trigger academies_before_insert
  before insert on public.academies
  for each row execute function public.academies_before_insert();

-- Quem cria a academia vira owner (DATA_MODEL.md §4.3).
create or replace function public.academies_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.academy_memberships (academy_id, user_id, role, status, requested_by, approved_by, approved_at)
    values (new.id, new.created_by, 'owner', 'active', 'user', new.created_by, now());
  end if;
  return null;
end;
$$;

create trigger academies_after_insert
  after insert on public.academies
  for each row execute function public.academies_after_insert();

-- ---------------------------------------------------------------------------
-- Unidades
-- ---------------------------------------------------------------------------
create table public.academy_units (
  id                  uuid primary key default gen_random_uuid(),
  academy_id          uuid not null references public.academies (id) on delete cascade,
  name                text not null constraint academy_units_name_length check (char_length(btrim(name)) between 1 and 80),
  postal_code         text constraint academy_units_postal_code check (postal_code ~ '^\d{8}$'),
  street              text constraint academy_units_street_length check (char_length(street) <= 120),
  number              text constraint academy_units_number_length check (char_length(number) <= 20),
  complement          text constraint academy_units_complement_length check (char_length(complement) <= 80),
  neighborhood        text constraint academy_units_neighborhood_length check (char_length(neighborhood) <= 80),
  city                text not null constraint academy_units_city_length check (char_length(btrim(city)) between 2 and 80),
  state               char(2) not null constraint academy_units_state check (state ~ '^[A-Z]{2}$'),
  reference_point     text constraint academy_units_reference_length check (char_length(reference_point) <= 160),
  latitude            double precision check (latitude between -90 and 90),
  longitude           double precision check (longitude between -180 and 180),
  location            extensions.geography(Point, 4326) generated always as (
                        case when latitude is not null and longitude is not null
                             then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
                        end
                      ) stored,
  coords_source       public.coords_source,
  coords_confirmed_at timestamptz,
  timezone            text not null default 'America/Sao_Paulo',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint academy_units_coords_pair check ((latitude is null) = (longitude is null))
);

create index academy_units_location_idx on public.academy_units using gist (location);
create index academy_units_place_idx on public.academy_units
  (public.search_normalize(state), public.search_normalize(city), public.search_normalize(neighborhood));
create index academy_units_academy_idx on public.academy_units (academy_id);

create trigger academy_units_set_updated_at
  before update on public.academy_units
  for each row execute function public.set_updated_at();

-- Coordenadas confirmadas pelo usuário ganham carimbo de horário do servidor.
create or replace function public.academy_units_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.latitude is null then
    new.coords_source := null;
    new.coords_confirmed_at := null;
  elsif tg_op = 'INSERT' or new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude then
    new.coords_source := coalesce(new.coords_source, 'manual');
    new.coords_confirmed_at := now();
  end if;
  return new;
end;
$$;

create trigger academy_units_before_write
  before insert or update on public.academy_units
  for each row execute function public.academy_units_before_write();

-- ---------------------------------------------------------------------------
-- Seguidores de academia
-- ---------------------------------------------------------------------------
create table public.academy_followers (
  academy_id uuid not null references public.academies (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (academy_id, user_id)
);
create index academy_followers_user_idx on public.academy_followers (user_id);

create or replace function public.academy_followers_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.academies set follower_count = follower_count + 1 where id = new.academy_id;
  else
    update public.academies set follower_count = greatest(follower_count - 1, 0) where id = old.academy_id;
  end if;
  return null;
end;
$$;

create trigger academy_followers_counter
  after insert or delete on public.academy_followers
  for each row execute function public.academy_followers_counter();

-- ---------------------------------------------------------------------------
-- Grade de aulas
-- ---------------------------------------------------------------------------
create table public.class_schedules (
  id             uuid primary key default gen_random_uuid(),
  academy_id     uuid not null references public.academies (id) on delete cascade,
  unit_id        uuid not null references public.academy_units (id) on delete cascade,
  teacher_id     uuid references public.profiles (id) on delete set null,
  martial_art_id uuid not null references public.martial_arts (id),
  name           text not null constraint class_schedules_name_length check (char_length(btrim(name)) between 2 and 80),
  level          public.class_level not null default 'all',
  weekday        smallint not null check (weekday between 0 and 6),  -- 0 = domingo
  starts_at      time not null,
  ends_at        time not null,
  accepts_trial  boolean not null default false,
  notes          text constraint class_schedules_notes_length check (char_length(notes) <= 500),
  status         public.class_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint class_schedules_time_order check (ends_at > starts_at)
);

create index class_schedules_unit_idx on public.class_schedules (unit_id, weekday, starts_at);
create index class_schedules_art_idx on public.class_schedules (martial_art_id, weekday, starts_at);
create index class_schedules_teacher_idx on public.class_schedules (teacher_id);

create trigger class_schedules_set_updated_at
  before update on public.class_schedules
  for each row execute function public.set_updated_at();

-- A unidade pertence à academia e o professor tem vínculo ativo de professor nela.
create or replace function public.class_schedules_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.academy_units where id = new.unit_id and academy_id = new.academy_id) then
    raise exception 'unit_not_in_academy' using errcode = '23514';
  end if;
  if new.teacher_id is not null and not exists (
    select 1 from public.academy_memberships
    where academy_id = new.academy_id and user_id = new.teacher_id and role = 'teacher' and status = 'active'
  ) then
    raise exception 'teacher_not_active_in_academy' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger class_schedules_before_write
  before insert or update on public.class_schedules
  for each row execute function public.class_schedules_before_write();

-- Fim do vínculo de professor: as aulas dele na academia ficam sem professor.
create or replace function public.academy_memberships_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.academy_memberships := case when tg_op = 'DELETE' then old else new end;
begin
  if v_row.role = 'teacher' and (tg_op = 'DELETE' or (old.status = 'active' and new.status <> 'active')) then
    update public.class_schedules set teacher_id = null
    where academy_id = v_row.academy_id and teacher_id = v_row.user_id;
  end if;
  return null;
end;
$$;

create trigger academy_memberships_after_change
  after update or delete on public.academy_memberships
  for each row execute function public.academy_memberships_after_change();

-- Professor revogado ou recusado perde os vínculos de professor.
create or replace function public.teacher_profiles_after_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'approved' and new.status <> 'approved' then
    update public.academy_memberships set status = 'left'
    where user_id = new.user_id and role = 'teacher' and status in ('active', 'pending');
  end if;
  return null;
end;
$$;

create trigger teacher_profiles_after_status
  after update of status on public.teacher_profiles
  for each row execute function public.teacher_profiles_after_status();

-- ---------------------------------------------------------------------------
-- Cache de geocodificação (COST_ZERO_POLICY.md: Nominatim e ViaCEP só pelo servidor, com cache)
-- ---------------------------------------------------------------------------
create table public.geocode_cache (
  query_hash text primary key,
  provider   text not null check (provider in ('nominatim', 'viacep')),
  query      text not null,
  response   jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;
revoke all on public.geocode_cache from anon, authenticated;

create or replace function public.geocode_cache_get(p_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select response from public.geocode_cache
  where query_hash = p_hash and created_at > now() - interval '90 days';
$$;

create or replace function public.geocode_cache_put(p_hash text, p_provider text, p_query text, p_response jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.geocode_cache (query_hash, provider, query, response)
  values (p_hash, p_provider, left(p_query, 500), p_response)
  on conflict (query_hash) do update set response = excluded.response, created_at = now();
$$;

-- Cota: 10 geocodificações/h por usuário e 1 req/s para o Nominatim no app inteiro.
-- Retorna 'ok', 'user_limit' ou 'busy' (o servidor espera e tenta de novo).
create or replace function public.geocode_take_quota(p_provider text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.check_rate_limit('geocode:' || p_provider || ':' || auth.uid(), case when p_provider = 'viacep' then 30 else 10 end, interval '1 hour') then
    return 'user_limit';
  end if;
  if p_provider = 'nominatim' and not public.check_rate_limit('nominatim:global', 1, interval '1 second') then
    return 'busy';
  end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
revoke all on public.academies, public.academy_martial_arts, public.academy_memberships,
              public.academy_units, public.academy_followers, public.class_schedules from anon, authenticated;

grant select on public.academies, public.academy_martial_arts, public.academy_units,
                public.academy_followers, public.class_schedules, public.academy_memberships to anon, authenticated;

grant insert (name, description, website, instagram, contact_email, contact_phone, external_links, created_by)
  on public.academies to authenticated;
grant update (name, description, website, instagram, contact_email, contact_phone, external_links, status)
  on public.academies to authenticated;
grant delete on public.academies to authenticated;

grant insert, delete on public.academy_martial_arts to authenticated;

grant insert (academy_id, name, postal_code, street, number, complement, neighborhood, city, state,
              reference_point, latitude, longitude, coords_source, is_active)
  on public.academy_units to authenticated;
grant update (name, postal_code, street, number, complement, neighborhood, city, state,
              reference_point, latitude, longitude, coords_source, is_active)
  on public.academy_units to authenticated;
grant delete on public.academy_units to authenticated;

grant insert (academy_id, user_id), delete on public.academy_followers to authenticated;

grant insert (academy_id, unit_id, teacher_id, martial_art_id, name, level, weekday, starts_at, ends_at,
              accepts_trial, notes, status)
  on public.class_schedules to authenticated;
grant update (unit_id, teacher_id, martial_art_id, name, level, weekday, starts_at, ends_at,
              accepts_trial, notes, status)
  on public.class_schedules to authenticated;
grant delete on public.class_schedules to authenticated;
-- academy_memberships: escrita só pelas funções de vínculo (Fase 4, migration 12).

revoke execute on function public.academies_before_insert(), public.academies_after_insert(),
  public.academy_followers_counter(), public.class_schedules_before_write(),
  public.academy_memberships_after_change(), public.teacher_profiles_after_status()
  from public, anon, authenticated;
revoke execute on function public.geocode_cache_get(text), public.geocode_cache_put(text, text, text, jsonb),
  public.geocode_take_quota(text) from public, anon;
grant execute on function public.geocode_cache_get(text), public.geocode_cache_put(text, text, text, jsonb),
  public.geocode_take_quota(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.academies           enable row level security;
alter table public.academy_martial_arts enable row level security;
alter table public.academy_memberships enable row level security;
alter table public.academy_units       enable row level security;
alter table public.academy_followers   enable row level security;
alter table public.class_schedules     enable row level security;

create policy academies_select on public.academies
  for select to anon, authenticated
  using (status = 'active' or public.is_academy_manager(id) or (select public.has_role('moderator')));
create policy academies_insert on public.academies
  for insert to authenticated with check (created_by = (select auth.uid()));
-- Owner/admin editam; "suspended" só a moderação aplica (Fase 6).
create policy academies_update on public.academies
  for update to authenticated
  using (public.is_academy_manager(id))
  with check (public.is_academy_manager(id) and (status <> 'suspended' or (select public.has_role('moderator'))));
create policy academies_delete on public.academies
  for delete to authenticated using (public.is_academy_owner(id));

create policy academy_martial_arts_select on public.academy_martial_arts
  for select to anon, authenticated using (public.is_academy_visible(academy_id));
create policy academy_martial_arts_write on public.academy_martial_arts
  for all to authenticated using (public.is_academy_manager(academy_id)) with check (public.is_academy_manager(academy_id));

create policy academy_units_select on public.academy_units
  for select to anon, authenticated
  using ((is_active and public.is_academy_visible(academy_id)) or public.is_academy_manager(academy_id));
create policy academy_units_write on public.academy_units
  for all to authenticated using (public.is_academy_manager(academy_id)) with check (public.is_academy_manager(academy_id));

-- Professores e gestores ativos são públicos; alunos e pedidos, só o próprio usuário e a gestão.
create policy academy_memberships_select on public.academy_memberships
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or public.is_academy_manager(academy_id)
    or (status = 'active' and role in ('owner', 'admin', 'teacher') and public.is_academy_visible(academy_id))
  );

create policy academy_followers_select on public.academy_followers
  for select to anon, authenticated using (true);
create policy academy_followers_insert on public.academy_followers
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_academy_visible(academy_id));
create policy academy_followers_delete on public.academy_followers
  for delete to authenticated using (user_id = (select auth.uid()));

-- Visível sem login quando a academia está ativa (DATA_MODEL.md §4.3). Canceladas, só a gestão vê.
create policy class_schedules_select on public.class_schedules
  for select to anon, authenticated
  using (
    public.is_academy_manager(academy_id)
    or (status <> 'cancelled' and public.is_academy_visible(academy_id)
        and exists (select 1 from public.academy_units u where u.id = unit_id and u.is_active))
  );
create policy class_schedules_write on public.class_schedules
  for all to authenticated using (public.is_academy_manager(academy_id)) with check (public.is_academy_manager(academy_id));
