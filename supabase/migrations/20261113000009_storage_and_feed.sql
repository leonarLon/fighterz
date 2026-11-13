-- Fase 3 · Storage de mídia e funções de leitura (feed, perfil, explorar, salvos, comentários, notificações).

-- ---------------------------------------------------------------------------
-- Storage: bucket privado. As imagens são servidas por URL assinada gerada no servidor,
-- depois que a RLS confirma que o usuário pode ver o post (inclusive perfis privados).
-- Vídeo fica fora do MVP: só imagens otimizadas no navegador (WebP/JPEG).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', false, 26214400, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy post_media_objects_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy post_media_objects_select on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'post-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.post_media pm where pm.storage_path = name and public.can_view_post(pm.post_id))
    )
  );

create policy post_media_objects_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- post_cards: o post pronto para exibir (autor, mídias, marcações aprovadas, estado do leitor).
-- security_invoker: a RLS de cada tabela vale para quem consulta.
-- ---------------------------------------------------------------------------
create view public.post_cards with (security_invoker = true) as
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
  exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())) as viewer_has_saved
from public.posts p
join public.profiles a on a.id = p.author_id
left join public.martial_arts m on m.id = p.martial_art_id
where p.deleted_at is null;

grant select on public.post_cards to anon, authenticated;
-- A view consulta saved_posts para "viewer_has_saved". Sem política para anon, o visitante enxerga zero linhas.
grant select on public.saved_posts to anon;

-- Feed: posts de quem eu sigo + os meus, cronológico, paginação por cursor (sem OFFSET).
-- security definer com filtro explícito e equivalente à RLS de posts: filtra primeiro (barato, por índice)
-- e só monta os cards da página. Com a RLS linha a linha, a página do meio passava de 300 ms.
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
      )
    order by p.created_at desc, p.id desc
    limit least(greatest(p_limit, 1), 50)
  )
  select c.*
  from page join public.post_cards c on c.id = page.id
  order by page.created_at desc, page.id desc;
$$;

create or replace function public.get_profile_posts(
  p_author_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns setof public.post_cards
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.post_cards c
  where c.author_id = p_author_id
    and (p_before_created_at is null or (c.created_at, c.id) < (p_before_created_at, p_before_id))
  order by c.created_at desc, c.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.get_saved_posts(
  p_before_saved_at timestamptz default null,
  p_limit integer default 20
)
returns table (saved_at timestamptz, post public.post_cards)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.created_at, c
  from public.saved_posts s
  join public.post_cards c on c.id = s.post_id
  where s.user_id = (select auth.uid())
    and (p_before_saved_at is null or s.created_at < p_before_saved_at)
  order by s.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Explorar: popularidade dos últimos 7 dias (ARCHITECTURE.md §5). Só posts públicos de perfis
-- públicos e ativos, sem bloqueio com o leitor. Mesmo padrão do feed: ranqueia na tabela e monta só a página.
-- Paginação por página (lista curta e ranqueada). Se pesar, vira tabela materializada.
create or replace function public.get_explore(p_page integer default 0, p_limit integer default 18)
returns setof public.post_cards
language sql
stable
security definer
set search_path = ''
as $$
  with lim as (select least(greatest(p_limit, 1), 50) as n),
  page as (
    select p.id,
           (p.like_count + 2 * p.comment_count + 3 * p.save_count)
             / power(extract(epoch from (now() - p.created_at)) / 3600 + 2, 1.5) as score,
           p.created_at
    from public.posts p
    join public.profiles a on a.id = p.author_id and a.status = 'active' and not a.is_private
    where p.deleted_at is null
      and p.visibility = 'public'
      and p.moderation_status = 'visible'
      and p.created_at > now() - interval '7 days'
      and not public.is_blocked_between(p.author_id, auth.uid())
    order by score desc, p.created_at desc, p.id desc
    limit (select n from lim) offset greatest(p_page, 0) * (select n from lim)
  )
  select c.*
  from page join public.post_cards c on c.id = page.id
  order by page.score desc, page.created_at desc, page.id desc;
$$;

create or replace function public.search_profiles(p_query text, p_limit integer default 20)
returns table (id uuid, username text, display_name text, avatar_path text, city text, state text, is_private boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select public.search_normalize(btrim(p_query)) as term)
  select p.id, p.username::text, p.display_name, p.avatar_path, p.city, p.state, p.is_private
  from public.profiles p, q
  where char_length(q.term) >= 2
    and p.status = 'active'
    and (
      p.search_vector @@ plainto_tsquery('simple', q.term)
      or public.search_normalize(p.display_name) operator(extensions.%) q.term
      or p.username::text like replace(replace(q.term, '%', ''), '_', '\_') || '%'
    )
  order by (p.username::text = q.term) desc,
           extensions.similarity(public.search_normalize(p.display_name), q.term) desc,
           p.follower_count desc
  limit least(greatest(p_limit, 1), 50);
$$;

create view public.comment_cards with (security_invoker = true) as
select
  c.id,
  c.post_id,
  c.parent_id,
  c.author_id,
  a.username::text as author_username,
  a.display_name   as author_display_name,
  a.avatar_path    as author_avatar_path,
  c.body,
  c.like_count,
  c.moderation_status,
  c.created_at,
  exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = (select auth.uid())) as viewer_has_liked
from public.comments c
join public.profiles a on a.id = c.author_id;

grant select on public.comment_cards to anon, authenticated;

create view public.notification_cards with (security_invoker = true) as
select
  n.id,
  n.type,
  n.read_at,
  n.created_at,
  n.post_id,
  n.comment_id,
  n.actor_id,
  a.username::text as actor_username,
  a.display_name   as actor_display_name,
  a.avatar_path    as actor_avatar_path,
  left(p.caption, 80) as post_excerpt
from public.notifications n
left join public.profiles a on a.id = n.actor_id
left join public.posts p on p.id = n.post_id;

grant select on public.notification_cards to authenticated;

revoke execute on function public.get_home_feed(timestamptz, uuid, integer) from public, anon;
revoke execute on function public.get_saved_posts(timestamptz, integer) from public, anon;
grant execute on function public.get_home_feed(timestamptz, uuid, integer) to authenticated;
grant execute on function public.get_saved_posts(timestamptz, integer) to authenticated;
grant execute on function public.get_profile_posts(uuid, timestamptz, uuid, integer) to anon, authenticated;
grant execute on function public.get_explore(integer, integer) to anon, authenticated;
grant execute on function public.search_profiles(text, integer) to anon, authenticated;
