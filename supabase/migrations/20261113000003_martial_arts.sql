-- Fase 2 · Catálogo de modalidades e graduações (editável pelo admin).

create type public.rank_track as enum ('adult', 'kids');

create table public.martial_arts (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique constraint martial_arts_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null unique constraint martial_arts_name_length check (char_length(btrim(name)) between 2 and 60),
  description text constraint martial_arts_description_length check (char_length(description) <= 1000),
  has_ranks   boolean not null default true,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index martial_arts_active_sort_idx on public.martial_arts (sort_order, name) where is_active;

create table public.martial_art_ranks (
  id                  uuid primary key default gen_random_uuid(),
  martial_art_id      uuid not null references public.martial_arts (id) on delete cascade,
  track               public.rank_track not null default 'adult',
  ordinal             integer not null check (ordinal > 0),
  name                text not null constraint martial_art_ranks_name_length check (char_length(btrim(name)) between 1 and 60),
  -- Faixas são dados, não marca (DESIGN_SYSTEM.md §2.6). A cor secundária cobre faixas bicolores (ex.: coral).
  color_hex           text constraint martial_art_ranks_color check (color_hex ~ '^#[0-9A-F]{6}$'),
  secondary_color_hex text constraint martial_art_ranks_secondary_color check (secondary_color_hex ~ '^#[0-9A-F]{6}$'),
  max_degrees         smallint not null default 0 check (max_degrees between 0 and 10),
  min_age             smallint check (min_age between 0 and 100),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (martial_art_id, track, ordinal)
);

create trigger martial_arts_set_updated_at
  before update on public.martial_arts
  for each row execute function public.set_updated_at();

create trigger martial_art_ranks_set_updated_at
  before update on public.martial_art_ranks
  for each row execute function public.set_updated_at();

create trigger martial_arts_audit
  after insert or update or delete on public.martial_arts
  for each row execute function public.audit_row_change();

create trigger martial_art_ranks_audit
  after insert or update or delete on public.martial_art_ranks
  for each row execute function public.audit_row_change();

revoke all on public.martial_arts, public.martial_art_ranks from anon, authenticated;
grant select on public.martial_arts, public.martial_art_ranks to anon, authenticated;
grant insert, update, delete on public.martial_arts, public.martial_art_ranks to authenticated;

alter table public.martial_arts      enable row level security;
alter table public.martial_art_ranks enable row level security;

create policy martial_arts_select on public.martial_arts
  for select to anon, authenticated
  using (is_active or (select public.has_role('admin')));

create policy martial_arts_admin_insert on public.martial_arts
  for insert to authenticated with check ((select public.has_role('admin')));
create policy martial_arts_admin_update on public.martial_arts
  for update to authenticated using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy martial_arts_admin_delete on public.martial_arts
  for delete to authenticated using ((select public.has_role('admin')));

create policy martial_art_ranks_select on public.martial_art_ranks
  for select to anon, authenticated
  using (exists (
    select 1 from public.martial_arts m
    where m.id = martial_art_id and (m.is_active or (select public.has_role('admin')))
  ));

create policy martial_art_ranks_admin_insert on public.martial_art_ranks
  for insert to authenticated with check ((select public.has_role('admin')));
create policy martial_art_ranks_admin_update on public.martial_art_ranks
  for update to authenticated using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy martial_art_ranks_admin_delete on public.martial_art_ranks
  for delete to authenticated using ((select public.has_role('admin')));
