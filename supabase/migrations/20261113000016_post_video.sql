-- Fase 7 · Vídeo em posts (limites aprovados: até 60 s e 25 MB). Sem transcodificação no servidor
-- (custo zero): aceitamos MP4 e WebM como enviados, com miniatura (poster) gerada no aparelho.
-- Regra: um post tem até 10 fotos OU um único vídeo.

update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg', 'video/mp4', 'video/webm'],
    file_size_limit = 26214400
where id = 'post-media';

-- A miniatura do vídeo também precisa da mesma regra de leitura do post.
drop policy post_media_objects_select on storage.objects;
create policy post_media_objects_select on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'post-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.post_media pm
        where (pm.storage_path = name or pm.thumbnail_path = name) and public.can_view_post(pm.post_id)
      )
    )
  );

alter table public.post_media
  add constraint post_media_video_fields check (
    (type = 'video' and duration_ms is not null) or (type = 'image' and duration_ms is null)
  );

grant insert (thumbnail_path, duration_ms) on public.post_media to authenticated;

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
  v_thumb   text;
  v_type    public.media_type;
  v_videos  integer;
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
  select count(*) into v_videos from jsonb_array_elements(p_media) e where e ->> 'type' = 'video';
  if v_videos > 0 and jsonb_array_length(p_media) > 1 then
    raise exception 'video_must_be_alone' using errcode = '22023';
  end if;

  insert into public.posts (id, author_id, caption, visibility, martial_art_id, location_label)
  values (p_id, v_uid, v_caption, p_visibility, p_martial_art_id, nullif(btrim(p_location_label), ''));

  -- Só arquivos que o próprio usuário enviou para a pasta deste post, com a extensão do tipo declarado.
  v_prefix := v_uid::text || '/' || p_id::text || '/';
  for v_item in select * from jsonb_array_elements(p_media) loop
    v_type := case when v_item ->> 'type' = 'video' then 'video' else 'image' end::public.media_type;
    v_path := v_item ->> 'path';
    v_thumb := nullif(v_item ->> 'thumbnail', '');
    if v_path is null or left(v_path, length(v_prefix)) <> v_prefix
       or (v_type = 'image' and v_path !~ '\.(webp|jpg)$')
       or (v_type = 'video' and v_path !~ '\.(mp4|webm)$')
       or not exists (select 1 from storage.objects o where o.bucket_id = 'post-media' and o.name = v_path) then
      raise exception 'invalid_media_path' using errcode = '22023';
    end if;
    if v_thumb is not null and (
         v_type <> 'video' or left(v_thumb, length(v_prefix)) <> v_prefix or v_thumb !~ '\.(webp|jpg)$'
         or not exists (select 1 from storage.objects o where o.bucket_id = 'post-media' and o.name = v_thumb)) then
      raise exception 'invalid_media_path' using errcode = '22023';
    end if;
    insert into public.post_media (post_id, position, type, storage_path, thumbnail_path, width, height, duration_ms, size_bytes, alt_text)
    values (p_id, v_pos, v_type, v_path, v_thumb,
            nullif(v_item ->> 'width', '')::integer, nullif(v_item ->> 'height', '')::integer,
            case when v_type = 'video' then coalesce(nullif(v_item ->> 'duration_ms', '')::integer, 0) end,
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

-- post_cards: a mídia passa a dizer o tipo, a miniatura e a duração.
create or replace view public.post_cards with (security_invoker = true) as
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
             'id', pm.id, 'type', pm.type, 'path', pm.storage_path, 'thumbnail', pm.thumbnail_path,
             'width', pm.width, 'height', pm.height, 'duration_ms', pm.duration_ms, 'alt', pm.alt_text
           ) order by pm.position)
    from public.post_media pm where pm.post_id = p.id
  ), '[]'::jsonb)            as media,
  coalesce((
    select jsonb_agg(u.username::text order by u.username)
    from public.post_mentions mn join public.profiles u on u.id = mn.user_id
    where mn.post_id = p.id and mn.status = 'approved'
  ), '[]'::jsonb)            as mentions,
  exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid()))  as viewer_has_liked,
  exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())) as viewer_has_saved,
  p.academy_id,
  ac.name                    as academy_name,
  ac.slug                    as academy_slug
from public.posts p
join public.profiles a on a.id = p.author_id
left join public.martial_arts m on m.id = p.martial_art_id
left join public.academies ac on ac.id = p.academy_id
where p.deleted_at is null;

revoke insert, update, delete, truncate, references, trigger on public.post_cards from anon, authenticated;
