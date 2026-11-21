-- Pós-evolução comercial (22/11/2026, pedido do usuário):
-- 1) seguir páginas comerciais: os posts públicos da página entram no Início de quem segue;
-- 2) foto nos itens do catálogo: a coluna já existia (migration 23), só faltava a tela (sem mudança aqui);
-- 3) análise única dos posts pessoais dos últimos 30 dias, anteriores à detecção (migration 25).

-- ---------------------------------------------------------------------------
-- Seguidores de página
-- ---------------------------------------------------------------------------
alter table public.businesses add column follower_count integer not null default 0 check (follower_count >= 0);

create table public.business_followers (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_followers_user_idx on public.business_followers (user_id);

create or replace function public.business_followers_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.businesses set follower_count = follower_count + 1 where id = new.business_id;
  else
    update public.businesses set follower_count = greatest(follower_count - 1, 0) where id = old.business_id;
  end if;
  return null;
end;
$$;

create trigger business_followers_counter
  after insert or delete on public.business_followers
  for each row execute function public.business_followers_counter();

create trigger business_followers_assert_active
  before insert on public.business_followers
  for each row execute function public.assert_active_account();

alter table public.business_followers enable row level security;
revoke all on public.business_followers from anon, authenticated;
grant select, delete on public.business_followers to authenticated;
grant insert (business_id, user_id) on public.business_followers to authenticated;

-- Cada pessoa vê e mexe só nos próprios vínculos (o total é público em businesses.follower_count).
create policy business_followers_select on public.business_followers
  for select to authenticated using (user_id = (select auth.uid()));
create policy business_followers_insert on public.business_followers
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_business_visible(business_id));
create policy business_followers_delete on public.business_followers
  for delete to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.business_followers_counter() from public, anon, authenticated;

-- Feed: igual ao da Fase 3, mais os posts das páginas seguidas.
create or replace function public.get_home_feed(
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns setof public.post_cards
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (select auth.uid() as id),
  page as (
    select p.id, p.created_at
    from public.posts p, viewer v
    where v.id is not null
      and p.deleted_at is null
      and (p_before_created_at is null or (p.created_at, p.id) < (p_before_created_at, p_before_id))
      and (
        p.author_id = v.id
        or (
          p.visibility in ('public', 'followers')
          and p.moderation_status = 'visible'
          and exists (select 1 from public.follows f
                      where f.follower_id = v.id and f.following_id = p.author_id and f.status = 'accepted')
          and exists (select 1 from public.profiles a where a.id = p.author_id and a.status = 'active')
          and not exists (select 1 from public.blocked_users b
                          where (b.blocker_id = v.id and b.blocked_id = p.author_id)
                             or (b.blocker_id = p.author_id and b.blocked_id = v.id))
        )
        -- Posts públicos de páginas comerciais que eu sigo (página ativa).
        or (
          p.business_id is not null
          and p.visibility = 'public'
          and p.moderation_status = 'visible'
          and exists (select 1 from public.business_followers bf where bf.user_id = v.id and bf.business_id = p.business_id)
          and exists (select 1 from public.businesses b where b.id = p.business_id and b.status = 'active')
          and exists (select 1 from public.profiles a where a.id = p.author_id and a.status = 'active')
          and not public.is_blocked_between(p.author_id, v.id)
        )
      )
    order by p.created_at desc, p.id desc
    limit least(greatest(p_limit, 1), 50)
  )
  select c.*
  from page join public.post_cards c on c.id = page.id
  order by page.created_at desc, page.id desc;
$$;


-- ---------------------------------------------------------------------------
-- Análise única dos posts antigos (só registra sinais e, acima do limiar, abre revisão; nunca pune)
-- ---------------------------------------------------------------------------
create or replace function public.backfill_commercial_signals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid;
  v_users integer := 0;
begin
  insert into public.commercial_signals (user_id, post_id, code, points, excerpt)
  select p.author_id, p.id, s.code, s.points, s.excerpt
  from public.posts p
  cross join lateral public.commercial_text_signals(p.caption) s
  where p.deleted_at is null and p.business_id is null
    and p.created_at > now() - interval '30 days'
    and not exists (select 1 from public.commercial_signals c where c.post_id = p.id)
    and public.commercial_text_score(p.caption) > 0;

  for v_user in
    select distinct c.user_id from public.commercial_signals c where c.created_at > now() - interval '1 minute'
  loop
    perform public.recompute_commercial_risk(v_user);
    v_users := v_users + 1;
  end loop;
  return v_users;
end;
$$;

revoke execute on function public.backfill_commercial_signals() from public, anon, authenticated;

select public.backfill_commercial_signals();
