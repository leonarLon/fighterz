-- Grade própria do professor (25/11/2026, pedido do usuário): o professor informa onde dá aula (academia já
-- cadastrada ou qualquer outro local), dia e horário, sem esperar a academia criar o perfil e montar a grade.
-- Vincular o local a uma academia cadastrada pede o vínculo de professor; a academia confirma em Gerenciar →
-- Equipe (fluxo da Fase 4). A aula mostra "confirmado pela academia" só com vínculo ativo.

-- ---------------------------------------------------------------------------
-- Locais
-- ---------------------------------------------------------------------------
create table public.teacher_places (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references public.teacher_profiles (user_id) on delete cascade,
  name            text not null constraint teacher_places_name_length check (char_length(btrim(name)) between 2 and 120),
  academy_id      uuid references public.academies (id) on delete set null,
  unit_id         uuid references public.academy_units (id) on delete set null,
  postal_code     text constraint teacher_places_postal_code check (postal_code ~ '^\d{8}$'),
  street          text constraint teacher_places_street check (char_length(street) <= 120),
  number          text constraint teacher_places_number check (char_length(number) <= 20),
  complement      text constraint teacher_places_complement check (char_length(complement) <= 80),
  neighborhood    text constraint teacher_places_neighborhood check (char_length(neighborhood) <= 80),
  city            text not null constraint teacher_places_city check (char_length(btrim(city)) between 2 and 80),
  state           char(2) not null constraint teacher_places_state check (state ~ '^[A-Z]{2}$'),
  reference_point text constraint teacher_places_reference check (char_length(reference_point) <= 160),
  latitude        double precision check (latitude between -90 and 90),
  longitude       double precision check (longitude between -180 and 180),
  location        extensions.geography(Point, 4326) generated always as (
                    case when latitude is not null and longitude is not null
                         then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
                    end) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint teacher_places_coords_pair check ((latitude is null) = (longitude is null)),
  constraint teacher_places_unit_needs_academy check (unit_id is null or academy_id is not null)
);

create index teacher_places_teacher_idx on public.teacher_places (teacher_id);
create index teacher_places_academy_idx on public.teacher_places (academy_id) where academy_id is not null;
create index teacher_places_location_idx on public.teacher_places using gist (location);

create trigger teacher_places_set_updated_at
  before update on public.teacher_places
  for each row execute function public.set_updated_at();

create trigger teacher_places_assert_active
  before insert or update on public.teacher_places
  for each row execute function public.assert_active_account();

-- Local numa academia cadastrada: endereço e coordenadas vêm da unidade (fonte única). Limite de 20 locais.
create or replace function public.teacher_places_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit public.academy_units%rowtype;
  v_academy public.academies%rowtype;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_approved_teacher(new.teacher_id) then
      raise exception 'teacher_not_approved' using errcode = '42501';
    end if;
    if (select count(*) from public.teacher_places where teacher_id = new.teacher_id) >= 20 then
      raise exception 'teacher_places_limit' using errcode = '23514';
    end if;
  else
    new.teacher_id := old.teacher_id;
  end if;

  if new.academy_id is not null then
    select * into v_academy from public.academies where id = new.academy_id and status = 'active';
    if not found then
      raise exception 'academy_not_found' using errcode = 'P0002';
    end if;
    if new.unit_id is null then
      select * into v_unit from public.academy_units where academy_id = new.academy_id and is_active order by name limit 1;
    else
      select * into v_unit from public.academy_units where id = new.unit_id and academy_id = new.academy_id;
      if not found then
        raise exception 'unit_not_in_academy' using errcode = '23514';
      end if;
    end if;
    if v_unit.id is null then
      raise exception 'academy_without_unit' using errcode = '23514';
    end if;
    new.unit_id         := v_unit.id;
    new.name            := v_academy.name || case when v_unit.name is not null then ' · ' || v_unit.name else '' end;
    new.postal_code     := v_unit.postal_code;
    new.street          := v_unit.street;
    new.number          := v_unit.number;
    new.complement      := v_unit.complement;
    new.neighborhood    := v_unit.neighborhood;
    new.city            := v_unit.city;
    new.state           := v_unit.state;
    new.reference_point := v_unit.reference_point;
    new.latitude        := v_unit.latitude;
    new.longitude       := v_unit.longitude;
  else
    new.unit_id := null;
    new.name := btrim(new.name);
    new.city := btrim(new.city);
  end if;
  return new;
end;
$$;

create trigger teacher_places_before_write
  before insert or update on public.teacher_places
  for each row execute function public.teacher_places_before_write();

-- Vincular a uma academia cadastrada pede o vínculo de professor (a academia confirma).
create or replace function public.teacher_places_request_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.academy_id is not null and auth.uid() = new.teacher_id
     and (tg_op = 'INSERT' or new.academy_id is distinct from old.academy_id)
     and not exists (select 1 from public.academy_memberships
                     where academy_id = new.academy_id and user_id = new.teacher_id and role = 'teacher'
                       and status in ('active', 'pending')) then
    perform public.request_membership(new.academy_id, 'teacher');
  end if;
  return null;
end;
$$;

create trigger teacher_places_request_membership
  after insert or update of academy_id on public.teacher_places
  for each row execute function public.teacher_places_request_membership();

-- ---------------------------------------------------------------------------
-- Aulas
-- ---------------------------------------------------------------------------
create table public.teacher_classes (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid not null references public.teacher_profiles (user_id) on delete cascade,
  place_id       uuid not null references public.teacher_places (id) on delete cascade,
  martial_art_id uuid not null references public.martial_arts (id),
  level          public.class_level not null default 'all',
  weekday        smallint not null check (weekday between 0 and 6),  -- 0 = domingo
  starts_at      time not null,
  ends_at        time not null,
  accepts_trial  boolean not null default false,
  notes          text constraint teacher_classes_notes_length check (char_length(notes) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint teacher_classes_time_order check (ends_at > starts_at)
);

create index teacher_classes_teacher_idx on public.teacher_classes (teacher_id, weekday, starts_at);
create index teacher_classes_place_idx on public.teacher_classes (place_id);
create index teacher_classes_art_idx on public.teacher_classes (martial_art_id, weekday, starts_at);

create trigger teacher_classes_set_updated_at
  before update on public.teacher_classes
  for each row execute function public.set_updated_at();

create trigger teacher_classes_assert_active
  before insert or update on public.teacher_classes
  for each row execute function public.assert_active_account();

-- O local precisa ser do próprio professor. Limite de 80 aulas na semana.
create or replace function public.teacher_classes_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.teacher_id := old.teacher_id;
  elsif auth.uid() is not null and not public.is_approved_teacher(new.teacher_id) then
    raise exception 'teacher_not_approved' using errcode = '42501';
  end if;
  if not exists (select 1 from public.teacher_places where id = new.place_id and teacher_id = new.teacher_id) then
    raise exception 'place_not_found' using errcode = 'P0002';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.teacher_classes where teacher_id = new.teacher_id) >= 80 then
    raise exception 'teacher_classes_limit' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger teacher_classes_before_write
  before insert or update on public.teacher_classes
  for each row execute function public.teacher_classes_before_write();

-- ---------------------------------------------------------------------------
-- Permissões: público vê os de professores aprovados; só o dono escreve
-- ---------------------------------------------------------------------------
alter table public.teacher_places  enable row level security;
alter table public.teacher_classes enable row level security;
revoke all on public.teacher_places, public.teacher_classes from anon, authenticated;
grant select on public.teacher_places, public.teacher_classes to anon, authenticated;
grant insert (teacher_id, name, academy_id, unit_id, postal_code, street, number, complement, neighborhood, city, state,
              reference_point, latitude, longitude),
      update (name, academy_id, unit_id, postal_code, street, number, complement, neighborhood, city, state,
              reference_point, latitude, longitude),
      delete
  on public.teacher_places to authenticated;
grant insert (teacher_id, place_id, martial_art_id, level, weekday, starts_at, ends_at, accepts_trial, notes),
      update (place_id, martial_art_id, level, weekday, starts_at, ends_at, accepts_trial, notes),
      delete
  on public.teacher_classes to authenticated;

create policy teacher_places_select on public.teacher_places
  for select to anon, authenticated
  using (teacher_id = (select auth.uid())
         or (public.is_approved_teacher(teacher_id) and not public.has_blocked_me(teacher_id)
             and exists (select 1 from public.profiles p where p.id = teacher_id and p.status = 'active')));
create policy teacher_places_insert on public.teacher_places
  for insert to authenticated with check (teacher_id = (select auth.uid()));
create policy teacher_places_update on public.teacher_places
  for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy teacher_places_delete on public.teacher_places
  for delete to authenticated using (teacher_id = (select auth.uid()));

create policy teacher_classes_select on public.teacher_classes
  for select to anon, authenticated
  using (teacher_id = (select auth.uid())
         or (public.is_approved_teacher(teacher_id) and not public.has_blocked_me(teacher_id)
             and exists (select 1 from public.profiles p where p.id = teacher_id and p.status = 'active')));
create policy teacher_classes_insert on public.teacher_classes
  for insert to authenticated with check (teacher_id = (select auth.uid()));
create policy teacher_classes_update on public.teacher_classes
  for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy teacher_classes_delete on public.teacher_classes
  for delete to authenticated using (teacher_id = (select auth.uid()));

revoke execute on function
  public.teacher_places_before_write(), public.teacher_places_request_membership(), public.teacher_classes_before_write()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leitura pronta para a interface
-- ---------------------------------------------------------------------------
create view public.teacher_class_cards with (security_invoker = true) as
select
  c.id,
  c.teacher_id,
  t.username::text      as teacher_username,
  coalesce((select tc.professional_name from public.teacher_cards tc where tc.user_id = c.teacher_id), t.display_name)
                        as teacher_name,
  t.avatar_path         as teacher_avatar_path,
  c.place_id,
  pl.name               as place_name,
  pl.academy_id,
  a.slug                as academy_slug,
  -- Confirmado só quando a academia aceitou o professor (vínculo ativo, público desde a Fase 4).
  (pl.academy_id is not null and exists (
     select 1 from public.academy_memberships m
     where m.academy_id = pl.academy_id and m.user_id = c.teacher_id and m.role = 'teacher' and m.status = 'active'))
                        as academy_confirmed,
  pl.street, pl.number, pl.complement, pl.neighborhood, pl.city, pl.state, pl.postal_code, pl.reference_point,
  pl.latitude, pl.longitude,
  c.martial_art_id,
  m.name                as martial_art_name,
  c.level,
  c.weekday,
  c.starts_at,
  c.ends_at,
  c.accepts_trial,
  c.notes
from public.teacher_classes c
join public.teacher_places pl on pl.id = c.place_id
join public.profiles t on t.id = c.teacher_id
join public.martial_arts m on m.id = c.martial_art_id
left join public.academies a on a.id = pl.academy_id and a.status = 'active';

revoke all on public.teacher_class_cards from anon, authenticated;
grant select on public.teacher_class_cards to anon, authenticated;

-- Busca de aulas dos professores: mesmos filtros de search_classes.
create or replace function public.search_teacher_classes(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default 10,
  p_martial_art uuid default null,
  p_level public.class_level default null,
  p_weekday smallint default null,
  p_period text default null,
  p_trial_only boolean default false,
  p_city text default null,
  p_neighborhood text default null,
  p_limit integer default 50
)
returns table (class public.teacher_class_cards, distance_km double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  with origin as (
    select case when p_lat is not null and p_lng is not null
                then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end as g
  )
  select c, round((extensions.st_distance(pl.location, o.g) / 1000)::numeric, 1)::double precision
  from public.teacher_class_cards c
  join public.teacher_places pl on pl.id = c.place_id
  cross join origin o
  where (p_martial_art is null or c.martial_art_id = p_martial_art)
    and (p_level is null or c.level = p_level or (c.level = 'all' and p_level <> 'kids'))
    and (p_weekday is null or c.weekday = p_weekday)
    and (p_period is null
         or (p_period = 'morning'   and c.starts_at < time '12:00')
         or (p_period = 'afternoon' and c.starts_at >= time '12:00' and c.starts_at < time '18:00')
         or (p_period = 'evening'   and c.starts_at >= time '18:00'))
    and (not p_trial_only or c.accepts_trial)
    and (p_city is null or public.search_normalize(c.city) = public.search_normalize(btrim(p_city)))
    and (p_neighborhood is null or public.search_normalize(c.neighborhood) like '%' || public.search_normalize(btrim(p_neighborhood)) || '%')
    and (o.g is null or (pl.location is not null
                         and extensions.st_dwithin(pl.location, o.g, least(greatest(p_radius_km, 0.5), 100) * 1000)))
  order by (case when o.g is not null then extensions.st_distance(pl.location, o.g) end) nulls last,
           c.weekday, c.starts_at
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.search_teacher_classes(double precision, double precision, double precision, uuid,
  public.class_level, smallint, text, boolean, text, text, integer) to anon, authenticated;
