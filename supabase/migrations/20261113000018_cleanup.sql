-- Fase 7 · Pendências da Fase 3: remoção física de conteúdo apagado após 30 dias e limpeza de uploads órfãos.
-- O Storage não aceita DELETE direto por SQL (trigger storage.protect_objects_delete): o banco enfileira os
-- arquivos e o servidor os apaga pela API do Storage (Admin → Configurações → "Limpar arquivos").

create table public.storage_cleanup_queue (
  bucket_id   text not null,
  object_name text not null,
  reason      text not null check (reason in ('deleted_post', 'orphan_upload', 'orphan_avatar')),
  queued_at   timestamptz not null default now(),
  primary key (bucket_id, object_name)
);

-- Uso interno: RLS ativa e nenhuma política (só funções definer e a service_role no servidor).
alter table public.storage_cleanup_queue enable row level security;
revoke all on public.storage_cleanup_queue from anon, authenticated;

create or replace function public.purge_deleted_content(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_posts integer;
  v_comments integer;
  v_orphans integer;
  v_avatars integer;
begin
  -- 1. Arquivos de posts apagados há mais de N dias entram na fila; depois as linhas somem (cascata).
  insert into public.storage_cleanup_queue (bucket_id, object_name, reason)
  select 'post-media', f.path, 'deleted_post'
  from public.posts p
  join public.post_media pm on pm.post_id = p.id
  cross join lateral (values (pm.storage_path), (pm.thumbnail_path)) as f(path)
  where p.deleted_at < now() - make_interval(days => p_days) and f.path is not null
  on conflict do nothing;

  delete from public.posts where deleted_at < now() - make_interval(days => p_days);
  get diagnostics v_posts = row_count;

  delete from public.comments where deleted_at < now() - make_interval(days => p_days);
  get diagnostics v_comments = row_count;

  -- 2. Uploads que nunca viraram post (publicação abandonada) depois de 24 h.
  insert into public.storage_cleanup_queue (bucket_id, object_name, reason)
  select o.bucket_id, o.name, 'orphan_upload'
  from storage.objects o
  where o.bucket_id = 'post-media'
    and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.post_media pm where pm.storage_path = o.name or pm.thumbnail_path = o.name)
  on conflict do nothing;
  get diagnostics v_orphans = row_count;

  -- 3. Fotos de perfil substituídas que ficaram para trás.
  insert into public.storage_cleanup_queue (bucket_id, object_name, reason)
  select o.bucket_id, o.name, 'orphan_avatar'
  from storage.objects o
  where o.bucket_id = 'avatars'
    and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.profiles p where p.avatar_path = o.name)
  on conflict do nothing;
  get diagnostics v_avatars = row_count;

  return jsonb_build_object('posts', v_posts, 'comments', v_comments, 'orphan_uploads', v_orphans, 'orphan_avatars', v_avatars);
end;
$$;

-- Quantos arquivos aguardam limpeza (painel admin).
create or replace function public.get_cleanup_queue_count()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select count(*)::integer from public.storage_cleanup_queue);
end;
$$;

revoke execute on function public.purge_deleted_content(integer) from public, anon, authenticated;
revoke execute on function public.get_cleanup_queue_count() from public, anon;
grant execute on function public.get_cleanup_queue_count() to authenticated;

-- Todo dia às 3h (UTC).
select cron.schedule('purge-deleted-content', '0 3 * * *', $$select public.purge_deleted_content()$$);
