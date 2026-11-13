-- Fase 2 · Perfis, configurações, papéis de plataforma e auditoria administrativa.
-- Regras: RLS em todas as tabelas, privilégios por coluna para impedir escalada (SECURITY.md §4).

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.account_status   as enum ('active', 'suspended', 'deleted');
create type public.theme_preference as enum ('light', 'dark', 'system');
create type public.visibility       as enum ('public', 'followers', 'private');
-- A ordem importa: has_role() usa comparação de enum (superadmin >= admin >= moderator).
create type public.platform_role    as enum ('moderator', 'admin', 'superadmin');

-- ---------------------------------------------------------------------------
-- profiles: dados públicos do perfil. Nada sensível aqui (a data de nascimento fica em user_settings).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        extensions.citext not null unique
                    constraint profiles_username_format check (username::text ~ '^[a-z0-9_.]{3,30}$'),
  display_name    text not null
                    constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 60),
  bio             text constraint profiles_bio_length check (char_length(bio) <= 500),
  avatar_path     text,
  cover_path      text,
  city            text constraint profiles_city_length check (char_length(city) <= 80),
  state           text constraint profiles_state_format check (state ~ '^[A-Z]{2}$'),
  is_private      boolean not null default false,
  status          public.account_status not null default 'active',
  follower_count  integer not null default 0 check (follower_count >= 0),
  following_count integer not null default 0 check (following_count >= 0),
  post_count      integer not null default 0 check (post_count >= 0),
  search_vector   tsvector generated always as (
                    setweight(to_tsvector('simple'::regconfig, public.immutable_unaccent(coalesce(username::text, ''))), 'A') ||
                    setweight(to_tsvector('simple'::regconfig, public.immutable_unaccent(coalesce(display_name, ''))), 'A') ||
                    setweight(to_tsvector('portuguese'::regconfig, public.immutable_unaccent(coalesce(bio, ''))), 'C')
                  ) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_search_vector_idx on public.profiles using gin (search_vector);
create index profiles_display_name_trgm_idx on public.profiles
  using gin (public.search_normalize(display_name) extensions.gin_trgm_ops);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_settings: 1:1 com o perfil, visível só para o dono.
-- ---------------------------------------------------------------------------
create table public.user_settings (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  birth_date          date not null,
  theme               public.theme_preference not null default 'system',
  locale              text not null default 'pt-BR' check (locale in ('pt-BR')),
  show_ranks          public.visibility not null default 'public',
  show_achievements   public.visibility not null default 'public',
  show_checkins       public.visibility not null default 'followers',
  show_academies      public.visibility not null default 'public',
  notify_likes        boolean not null default true,
  notify_comments     boolean not null default true,
  notify_follows      boolean not null default true,
  notify_mentions     boolean not null default true,
  notify_events       boolean not null default true,
  terms_accepted_at   timestamptz not null,
  privacy_accepted_at timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_roles: só papéis de plataforma. Professor e admin de academia vêm de outras tabelas.
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.platform_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Verdadeiro se o usuário atual tem o papel pedido ou um superior.
-- security definer: as políticas de user_roles chamam esta função, então ela não pode depender da própria RLS.
create or replace function public.has_role(p_role public.platform_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles r
    join public.profiles p on p.id = r.user_id
    where r.user_id = (select auth.uid())
      and r.role >= p_role
      and p.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- admin_audit_log: append-only. Só triggers escrevem.
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text not null,
  target_type text not null,
  target_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'user_id'),
    jsonb_build_object(
      'old', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
      'new', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
    )
  );
  return null;
end;
$$;

create trigger user_roles_audit
  after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Cadastro: cria perfil + configurações a partir dos metadados do signUp.
-- Bloqueia menores de 18 anos e cadastro sem aceite dos termos (SECURITY.md §6 e §7).
-- O frontend valida antes; isto é a garantia final.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta         jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username     text  := lower(btrim(v_meta ->> 'username'));
  v_display_name text  := btrim(v_meta ->> 'display_name');
  v_birth_date   date;
begin
  begin
    v_birth_date := (v_meta ->> 'birth_date')::date;
  exception when others then
    raise exception 'invalid_birth_date' using errcode = '22007';
  end;

  if v_birth_date is null or v_birth_date > (current_date - interval '18 years')::date then
    raise exception 'age_requirement_not_met' using errcode = '23514';
  end if;

  if v_birth_date < date '1900-01-01' then
    raise exception 'invalid_birth_date' using errcode = '22007';
  end if;

  if coalesce((v_meta ->> 'accepted_terms')::boolean, false) is not true then
    raise exception 'terms_not_accepted' using errcode = '23514';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, coalesce(nullif(v_display_name, ''), v_username));

  insert into public.user_settings (user_id, birth_date, terms_accepted_at, privacy_accepted_at)
  values (new.id, v_birth_date, now(), now());

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Checagem de disponibilidade no formulário de cadastro. Usernames já são públicos.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(p_username)) ~ '^[a-z0-9_.]{3,30}$'
     and not exists (select 1 from public.profiles where username = lower(btrim(p_username))::extensions.citext);
$$;

-- Exclusão de conta (LGPD). A reautenticação acontece no servidor antes desta chamada.
-- A remoção de arquivos do Storage é feita pelo servidor (os buckets chegam na Fase 3).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilégios (negar por padrão, liberar só o necessário)
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.user_settings, public.user_roles, public.admin_audit_log
  from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update (username, display_name, bio, avatar_path, cover_path, city, state, is_private)
  on public.profiles to authenticated;

grant select on public.user_settings to authenticated;
grant update (theme, show_ranks, show_achievements, show_checkins, show_academies,
              notify_likes, notify_comments, notify_follows, notify_mentions, notify_events)
  on public.user_settings to authenticated;

grant select, insert, delete on public.user_roles to authenticated;
grant select on public.admin_audit_log to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.is_username_available(text) to anon, authenticated;
grant execute on function public.has_role(public.platform_role) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.user_settings   enable row level security;
alter table public.user_roles      enable row level security;
alter table public.admin_audit_log enable row level security;

-- profiles: perfis ativos são públicos. O dono e a moderação também veem suspensos.
-- Bloqueios entram na Fase 3, junto com blocked_users.
create policy profiles_select on public.profiles
  for select to anon, authenticated
  using (status = 'active' or id = (select auth.uid()) or (select public.has_role('moderator')));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy user_settings_select_own on public.user_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('admin')));

create policy user_roles_insert on public.user_roles
  for insert to authenticated
  with check ((select public.has_role('superadmin')) and granted_by = (select auth.uid()));

create policy user_roles_delete on public.user_roles
  for delete to authenticated
  using ((select public.has_role('superadmin')));

create policy admin_audit_log_select on public.admin_audit_log
  for select to authenticated
  using ((select public.has_role('admin')));
