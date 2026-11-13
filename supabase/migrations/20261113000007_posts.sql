-- Fase 3 · Posts, mídia, marcações, curtidas, comentários e salvos.
-- academy_id, unit_id e event_id entram nas Fases 4 e 5, junto com as tabelas de destino.

create type public.post_kind         as enum ('standard', 'checkin', 'achievement', 'event_share');
create type public.moderation_status as enum ('visible', 'under_review', 'removed');
create type public.media_type        as enum ('image', 'video');
create type public.media_status      as enum ('uploading', 'processing', 'ready', 'failed');
create type public.mention_status    as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
create table public.posts (
  id                 uuid primary key default gen_random_uuid(),
  author_id          uuid not null references public.profiles (id) on delete cascade,
  kind               public.post_kind not null default 'standard',
  caption            text not null default '' constraint posts_caption_length check (char_length(caption) <= 2200),
  martial_art_id     uuid references public.martial_arts (id) on delete set null,
  location_label     text constraint posts_location_label_length check (char_length(location_label) <= 80),
  visibility         public.visibility not null default 'public',
  external_video_url text constraint posts_external_video_url check (
                       external_video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/[^\s]+$'
                     ),
  like_count         integer not null default 0 check (like_count >= 0),
  comment_count      integer not null default 0 check (comment_count >= 0),
  save_count         integer not null default 0 check (save_count >= 0),
  moderation_status  public.moderation_status not null default 'visible',
  deleted_at         timestamptz,
  search_vector      tsvector generated always as (
                       to_tsvector('portuguese'::regconfig, public.immutable_unaccent(caption))
                     ) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index posts_author_created_idx on public.posts (author_id, created_at desc, id desc) where deleted_at is null;
create index posts_created_idx on public.posts (created_at desc, id desc) where deleted_at is null;
create index posts_public_created_idx on public.posts (created_at desc, id desc)
  where deleted_at is null and moderation_status = 'visible' and visibility = 'public';
create index posts_search_vector_idx on public.posts using gin (search_vector);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Quem pode ver o post? Usado pelas políticas de posts e de todas as tabelas filhas.
create or replace function public.can_view_post_row(
  p_author uuid, p_visibility public.visibility, p_moderation public.moderation_status, p_deleted_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_deleted_at is null and (
    p_author = (select auth.uid())
    or public.has_role('moderator')
    or (
      p_moderation = 'visible'
      and case p_visibility
            when 'public'    then public.can_view_profile_content(p_author)
            when 'followers' then public.is_following(p_author)
                                  and not public.is_blocked_between(p_author, (select auth.uid()))
            else false
          end
    )
  );
$$;

create or replace function public.can_view_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.can_view_post_row(p.author_id, p.visibility, p.moderation_status, p.deleted_at)
    from public.posts p where p.id = p_post_id
  ), false);
$$;

-- Autor do post pode interagir com o usuário atual? (post visível e sem bloqueio)
create or replace function public.can_interact_with_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_view_post(p_post_id) and not exists (
    select 1 from public.posts p
    where p.id = p_post_id and public.is_blocked_between(p.author_id, (select auth.uid()))
  );
$$;

create or replace function public.posts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Requisições de usuário (com JWT): rate limit e horário do servidor. Seeds/rotinas internas não passam por aqui.
  if auth.uid() is not null then
    perform public.enforce_rate_limit('post:' || new.author_id, 20, interval '1 hour');
    new.created_at := now();
  end if;
  new.like_count := 0;
  new.comment_count := 0;
  new.save_count := 0;
  new.moderation_status := 'visible';
  new.deleted_at := null;
  return new;
end;
$$;

create trigger posts_before_insert
  before insert on public.posts
  for each row execute function public.posts_before_insert();

-- Exclusão é soft delete e só vai de "ativo" para "apagado" (o horário é sempre o do servidor).
create or replace function public.posts_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    if old.deleted_at is not null then
      raise exception 'post_already_deleted' using errcode = '23514';
    end if;
    new.deleted_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_before_update
  before update on public.posts
  for each row execute function public.posts_before_update();

create or replace function public.posts_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set post_count = post_count + 1 where id = new.author_id;
  elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then
    update public.profiles set post_count = greatest(post_count - 1, 0) where id = new.author_id;
  end if;
  return null;
end;
$$;

create trigger posts_counters
  after insert or update of deleted_at on public.posts
  for each row execute function public.posts_counters();

-- ---------------------------------------------------------------------------
-- post_media
-- ---------------------------------------------------------------------------
create table public.post_media (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references public.posts (id) on delete cascade,
  position       smallint not null check (position between 0 and 9),
  type           public.media_type not null default 'image',
  storage_path   text not null unique,
  thumbnail_path text,
  width          integer check (width > 0),
  height         integer check (height > 0),
  duration_ms    integer check (duration_ms between 0 and 60000),
  size_bytes     integer check (size_bytes > 0),
  alt_text       text constraint post_media_alt_length check (char_length(alt_text) <= 500),
  status         public.media_status not null default 'ready',
  created_at     timestamptz not null default now(),
  unique (post_id, position)
);

-- ---------------------------------------------------------------------------
-- post_mentions: marcação com aprovação de quem foi marcado
-- ---------------------------------------------------------------------------
create table public.post_mentions (
  post_id      uuid not null references public.posts (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  status       public.mention_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  primary key (post_id, user_id)
);

create index post_mentions_user_idx on public.post_mentions (user_id, status);

create or replace function public.post_mentions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (
      select 1 from public.posts p
      where p.id = new.post_id and (p.author_id = new.user_id or public.is_blocked_between(p.author_id, new.user_id))
    ) then
      raise exception 'invalid_mention' using errcode = '23514';
    end if;
    new.status := 'pending';
    new.responded_at := null;
  else
    if old.status <> 'pending' and new.status = 'pending' then
      raise exception 'invalid_mention_transition' using errcode = '23514';
    end if;
    new.responded_at := now();
  end if;
  return new;
end;
$$;

create trigger post_mentions_before_write
  before insert or update on public.post_mentions
  for each row execute function public.post_mentions_before_write();

-- ---------------------------------------------------------------------------
-- Curtidas e salvos: PK composta torna duplicidade impossível
-- ---------------------------------------------------------------------------
create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

create table public.saved_posts (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index saved_posts_user_created_idx on public.saved_posts (user_id, created_at desc, post_id);

-- ---------------------------------------------------------------------------
-- Comentários (1 nível de resposta)
-- ---------------------------------------------------------------------------
create table public.comments (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references public.posts (id) on delete cascade,
  author_id         uuid not null references public.profiles (id) on delete cascade,
  parent_id         uuid references public.comments (id) on delete cascade,
  body              text not null constraint comments_body_length check (char_length(btrim(body)) between 1 and 1000),
  like_count        integer not null default 0 check (like_count >= 0),
  moderation_status public.moderation_status not null default 'visible',
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index comments_post_created_idx on public.comments (post_id, created_at, id);
create index comments_parent_idx on public.comments (parent_id) where parent_id is not null;

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create table public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create or replace function public.comments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.comments;
begin
  if auth.uid() is not null then
    perform public.enforce_rate_limit('comment:' || new.author_id, 60, interval '1 hour');
    new.created_at := now();
  end if;
  if new.parent_id is not null then
    select * into v_parent from public.comments where id = new.parent_id;
    if not found or v_parent.post_id <> new.post_id or v_parent.parent_id is not null or v_parent.deleted_at is not null then
      raise exception 'invalid_parent_comment' using errcode = '23514';
    end if;
  end if;
  new.body := btrim(new.body);
  new.like_count := 0;
  new.moderation_status := 'visible';
  new.deleted_at := null;
  return new;
end;
$$;

create trigger comments_before_insert
  before insert on public.comments
  for each row execute function public.comments_before_insert();

create or replace function public.comments_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    if old.deleted_at is not null then
      raise exception 'comment_already_deleted' using errcode = '23514';
    end if;
    new.deleted_at := now();
  end if;
  new.body := btrim(new.body);
  return new;
end;
$$;

create trigger comments_before_update
  before update on public.comments
  for each row execute function public.comments_before_update();

-- Apagar comentário: o autor ou o dono do post (DATA_MODEL.md §5).
create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.comments c set deleted_at = now()
  where c.id = p_comment_id
    and c.deleted_at is null
    and (c.author_id = (select auth.uid())
         or exists (select 1 from public.posts p where p.id = c.post_id and p.author_id = (select auth.uid())));
  if not found then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Apagar post (soft delete). Função dedicada porque um UPDATE direto deixaria a linha
-- invisível pela própria política de SELECT, e o Postgres recusa.
create or replace function public.delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts set deleted_at = now()
  where id = p_post_id and author_id = (select auth.uid()) and deleted_at is null;
  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Contadores de interação
-- ---------------------------------------------------------------------------
create or replace function public.interaction_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  v_row   record  := case when tg_op = 'INSERT' then new else old end;
begin
  case tg_table_name
    when 'post_likes' then
      update public.posts set like_count = greatest(like_count + v_delta, 0) where id = v_row.post_id;
    when 'saved_posts' then
      update public.posts set save_count = greatest(save_count + v_delta, 0) where id = v_row.post_id;
    when 'comment_likes' then
      update public.comments set like_count = greatest(like_count + v_delta, 0) where id = v_row.comment_id;
  end case;
  return null;
end;
$$;

create trigger post_likes_counters after insert or delete on public.post_likes
  for each row execute function public.interaction_counters();
create trigger saved_posts_counters after insert or delete on public.saved_posts
  for each row execute function public.interaction_counters();
create trigger comment_likes_counters after insert or delete on public.comment_likes
  for each row execute function public.interaction_counters();

create or replace function public.comments_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif old.deleted_at is null and new.deleted_at is not null then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
  end if;
  return null;
end;
$$;

create trigger comments_counters
  after insert or update of deleted_at on public.comments
  for each row execute function public.comments_counters();

-- ---------------------------------------------------------------------------
-- create_post: post + mídias + marcações numa transação
-- ---------------------------------------------------------------------------
create or replace function public.create_post(
  p_id             uuid,
  p_caption        text,
  p_visibility     public.visibility default 'public',
  p_martial_art_id uuid default null,
  p_location_label text default null,
  p_media          jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_caption text := btrim(coalesce(p_caption, ''));
  v_prefix  text;
  v_item    jsonb;
  v_pos     integer := 0;
  v_path    text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_media) <> 'array' or jsonb_array_length(p_media) > 10 then
    raise exception 'invalid_media' using errcode = '22023';
  end if;
  if v_caption = '' and jsonb_array_length(p_media) = 0 then
    raise exception 'empty_post' using errcode = '23514';
  end if;

  insert into public.posts (id, author_id, caption, visibility, martial_art_id, location_label)
  values (p_id, v_uid, v_caption, p_visibility, p_martial_art_id, nullif(btrim(p_location_label), ''));

  -- Só arquivos que o próprio usuário enviou para a pasta deste post.
  v_prefix := v_uid::text || '/' || p_id::text || '/';
  for v_item in select * from jsonb_array_elements(p_media) loop
    v_path := v_item ->> 'path';
    if v_path is null or left(v_path, length(v_prefix)) <> v_prefix
       or not exists (select 1 from storage.objects o where o.bucket_id = 'post-media' and o.name = v_path) then
      raise exception 'invalid_media_path' using errcode = '22023';
    end if;
    insert into public.post_media (post_id, position, type, storage_path, width, height, size_bytes, alt_text)
    values (p_id, v_pos, 'image', v_path,
            nullif(v_item ->> 'width', '')::integer, nullif(v_item ->> 'height', '')::integer,
            nullif(v_item ->> 'size', '')::integer, nullif(btrim(v_item ->> 'alt'), ''));
    v_pos := v_pos + 1;
  end loop;

  -- Marcações: @usuario existente, ativo, sem bloqueio. Ficam pendentes até o marcado aprovar.
  insert into public.post_mentions (post_id, user_id)
  select p_id, pr.id
  from (select distinct lower(m[1]) as username
        from regexp_matches(v_caption, '(?:^|[^a-z0-9_.])@([a-z0-9_.]{3,30})', 'gi') as m
        limit 20) found
  join public.profiles pr on pr.username = found.username::extensions.citext and pr.status = 'active'
  where pr.id <> v_uid and not public.is_blocked_between(pr.id, v_uid);

  return p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
revoke all on public.posts, public.post_media, public.post_mentions, public.post_likes,
              public.saved_posts, public.comments, public.comment_likes from anon, authenticated;

grant select on public.posts, public.post_media, public.post_mentions, public.post_likes,
                public.comments, public.comment_likes to anon, authenticated;
grant insert (id, author_id, caption, visibility, martial_art_id, location_label) on public.posts to authenticated;
grant update (caption, visibility, martial_art_id, location_label) on public.posts to authenticated;
grant insert (post_id, position, type, storage_path, width, height, size_bytes, alt_text) on public.post_media to authenticated;
grant update (alt_text) on public.post_media to authenticated;
grant insert (post_id, user_id) on public.post_mentions to authenticated;
grant update (status) on public.post_mentions to authenticated;
grant delete on public.post_mentions to authenticated;
grant insert (post_id, user_id), delete on public.post_likes to authenticated;
grant select, insert (user_id, post_id), delete on public.saved_posts to authenticated;
grant insert (post_id, author_id, parent_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant insert (comment_id, user_id), delete on public.comment_likes to authenticated;

revoke execute on function public.posts_before_insert(), public.posts_counters(), public.post_mentions_before_write(),
  public.comments_before_insert(), public.interaction_counters(), public.comments_counters()
  from public, anon, authenticated;
revoke execute on function public.delete_comment(uuid) from public, anon;
revoke execute on function public.delete_post(uuid) from public, anon;
grant execute on function public.delete_post(uuid) to authenticated;
revoke execute on function public.create_post(uuid, text, public.visibility, uuid, text, jsonb) from public, anon;
grant execute on function public.delete_comment(uuid) to authenticated;
grant execute on function public.create_post(uuid, text, public.visibility, uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.posts         enable row level security;
alter table public.post_media    enable row level security;
alter table public.post_mentions enable row level security;
alter table public.post_likes    enable row level security;
alter table public.saved_posts   enable row level security;
alter table public.comments      enable row level security;
alter table public.comment_likes enable row level security;

create policy posts_select on public.posts
  for select to anon, authenticated
  using (public.can_view_post_row(author_id, visibility, moderation_status, deleted_at));
create policy posts_insert_own on public.posts
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy posts_update_own on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()));

create policy post_media_select on public.post_media
  for select to anon, authenticated using (public.can_view_post(post_id));
create policy post_media_insert_own on public.post_media
  for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));
create policy post_media_update_own on public.post_media
  for update to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

-- Marcação: aprovada é pública (se o post for visível); pendente/recusada, só autor e marcado.
create policy post_mentions_select on public.post_mentions
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
    or (status = 'approved' and public.can_view_post(post_id))
  );
create policy post_mentions_insert_author on public.post_mentions
  for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));
create policy post_mentions_respond on public.post_mentions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status in ('approved', 'rejected'));
create policy post_mentions_delete on public.post_mentions
  for delete to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

create policy post_likes_select on public.post_likes
  for select to anon, authenticated using (public.can_view_post(post_id));
create policy post_likes_insert on public.post_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_interact_with_post(post_id));
create policy post_likes_delete_own on public.post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy saved_posts_select_own on public.saved_posts
  for select to authenticated using (user_id = (select auth.uid()));
create policy saved_posts_insert on public.saved_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_post(post_id));
create policy saved_posts_delete_own on public.saved_posts
  for delete to authenticated using (user_id = (select auth.uid()));

create policy comments_select on public.comments
  for select to anon, authenticated
  using (
    deleted_at is null
    and public.can_view_post(post_id)
    and (moderation_status = 'visible' or author_id = (select auth.uid()) or (select public.has_role('moderator')))
    and not public.has_blocked_me(author_id)
  );
create policy comments_insert on public.comments
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_interact_with_post(post_id));
create policy comments_update_own on public.comments
  for update to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()));

create policy comment_likes_select on public.comment_likes
  for select to anon, authenticated
  using (exists (select 1 from public.comments c where c.id = comment_id and public.can_view_post(c.post_id)));
create policy comment_likes_insert on public.comment_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.comments c
                where c.id = comment_id and c.deleted_at is null
                  and public.can_interact_with_post(c.post_id)
                  and not public.is_blocked_between(c.author_id, (select auth.uid())))
  );
create policy comment_likes_delete_own on public.comment_likes
  for delete to authenticated using (user_id = (select auth.uid()));
