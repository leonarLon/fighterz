-- Fase 3 · Grafo social: bloqueios, seguir (com perfil privado e solicitações) e contadores.

-- ---------------------------------------------------------------------------
-- Bloqueios
-- ---------------------------------------------------------------------------
create table public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);

create index blocked_users_blocked_idx on public.blocked_users (blocked_id);

-- Bloqueio em qualquer sentido entre a e b. security definer: a RLS de blocked_users
-- só mostra os bloqueios feitos pelo próprio usuário.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocked_users
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- O dono do perfil `other` bloqueou o usuário atual?
create or replace function public.has_blocked_me(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocked_users where blocker_id = other and blocked_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Seguir
-- ---------------------------------------------------------------------------
create type public.follow_status as enum ('pending', 'accepted');

create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  status       public.follow_status not null default 'pending',
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index follows_following_status_idx on public.follows (following_id, status);
create index follows_follower_status_idx on public.follows (follower_id, status);

create or replace function public.is_following(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.follows
    where follower_id = (select auth.uid()) and following_id = target and status = 'accepted'
  );
$$;

-- Pode ver o conteúdo (posts, listas) do perfil `owner`?
create or replace function public.can_view_profile_content(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when owner = (select auth.uid()) then true
    when public.has_role('moderator') then true
    else exists (
      select 1 from public.profiles p
      where p.id = owner
        and p.status = 'active'
        and not public.is_blocked_between(owner, (select auth.uid()))
        and (not p.is_private or public.is_following(owner))
    )
  end;
$$;

-- Antes de inserir: decide o status (privado = solicitação), barra bloqueio e aplica rate limit.
create or replace function public.follows_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_private boolean;
begin
  if public.is_blocked_between(new.follower_id, new.following_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  select is_private into v_private from public.profiles where id = new.following_id and status = 'active';
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if auth.uid() is not null then
    perform public.enforce_rate_limit('follow:' || new.follower_id, 200, interval '1 day');
  end if;

  new.status := case when v_private then 'pending' else 'accepted' end;
  new.accepted_at := case when v_private then null else now() end;
  return new;
end;
$$;

create trigger follows_before_insert
  before insert on public.follows
  for each row execute function public.follows_before_insert();

-- Só a transição pending -> accepted é permitida.
create or replace function public.follows_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'accepted' or new.status <> 'accepted' then
    raise exception 'invalid_follow_transition' using errcode = '23514';
  end if;
  new.accepted_at := now();
  return new;
end;
$$;

create trigger follows_before_update
  before update on public.follows
  for each row execute function public.follows_before_update();

-- Contadores mantidos pelo banco (só follows aceitos contam).
create or replace function public.follows_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'accepted'
     and (tg_op = 'INSERT' or old.status <> 'accepted') then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set follower_count  = follower_count  + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' and old.status = 'accepted' then
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.profiles set follower_count  = greatest(follower_count  - 1, 0) where id = old.following_id;
  end if;
  return null;
end;
$$;

create trigger follows_counters
  after insert or update or delete on public.follows
  for each row execute function public.follows_counters();

-- Bloquear desfaz os follows nos dois sentidos (SECURITY.md §5).
create or replace function public.blocked_users_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end;
$$;

create trigger blocked_users_after_insert
  after insert on public.blocked_users
  for each row execute function public.blocked_users_after_insert();

-- Perfil que deixa de ser privado aceita as solicitações pendentes.
create or replace function public.profiles_after_privacy_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.follows set status = 'accepted' where following_id = new.id and status = 'pending';
  return null;
end;
$$;

create trigger profiles_after_privacy_change
  after update of is_private on public.profiles
  for each row when (old.is_private and not new.is_private)
  execute function public.profiles_after_privacy_change();

-- ---------------------------------------------------------------------------
-- Privilégios e RLS
-- ---------------------------------------------------------------------------
revoke all on public.blocked_users, public.follows from anon, authenticated;
grant select, insert, delete on public.blocked_users to authenticated;
grant select on public.follows to anon, authenticated;
grant insert (follower_id, following_id), delete on public.follows to authenticated;
grant update (status) on public.follows to authenticated;

revoke execute on function public.follows_before_insert() from public, anon, authenticated;
revoke execute on function public.follows_counters() from public, anon, authenticated;
revoke execute on function public.blocked_users_after_insert() from public, anon, authenticated;
revoke execute on function public.profiles_after_privacy_change() from public, anon, authenticated;

alter table public.blocked_users enable row level security;
alter table public.follows enable row level security;

create policy blocked_users_select_own on public.blocked_users
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy blocked_users_insert_own on public.blocked_users
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy blocked_users_delete_own on public.blocked_users
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- Aceitos são públicos (respeitando bloqueio). Pendentes, só para as duas partes.
create policy follows_select on public.follows
  for select to anon, authenticated
  using (
    follower_id = (select auth.uid())
    or following_id = (select auth.uid())
    or (status = 'accepted'
        and not public.has_blocked_me(follower_id)
        and not public.has_blocked_me(following_id))
  );

create policy follows_insert_own on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));

-- Só quem é seguido aprova a solicitação.
create policy follows_accept on public.follows
  for update to authenticated
  using (following_id = (select auth.uid()))
  with check (following_id = (select auth.uid()));

-- Qualquer das partes desfaz (deixar de seguir, remover seguidor, recusar solicitação).
create policy follows_delete on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));

-- profiles: quem me bloqueou some para mim (DATA_MODEL.md §5).
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to anon, authenticated
  using (
    id = (select auth.uid())
    or (select public.has_role('moderator'))
    or (status = 'active' and not public.has_blocked_me(id))
  );
