-- Evolução comercial · Fase 5a: logo, banner e galeria da academia (bucket público `covers`).
-- Caminhos: '<tipo>/<id da entidade>/<slot>-<aleatório>.(webp|jpg)', tipo = 'academy' (e 'business' na migration 23).
-- Imagens processadas no aparelho (sem EXIF/GPS), como as fotos de perfil. Limite de 3 MB por arquivo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 3145728, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Quem pode escrever num caminho do bucket covers: a gestão da entidade dona da pasta.
create or replace function public.can_manage_cover_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := storage.foldername(p_name);
begin
  if coalesce(array_length(v_parts, 1), 0) <> 2
     or v_parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  if v_parts[1] = 'academy' then
    return public.is_academy_manager(v_parts[2]::uuid);
  end if;
  return false;
end;
$$;

revoke execute on function public.can_manage_cover_path(text) from public, anon;
grant execute on function public.can_manage_cover_path(text) to authenticated;

create policy covers_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and public.can_manage_cover_path(name));
create policy covers_objects_update on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and public.can_manage_cover_path(name));
create policy covers_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and public.can_manage_cover_path(name));
create policy covers_objects_select on storage.objects
  for select to authenticated
  using (bucket_id = 'covers' and public.can_manage_cover_path(name));

-- O arquivo precisa existir no bucket (enviado antes pela própria gestão).
create or replace function public.cover_object_exists(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from storage.objects o where o.bucket_id = 'covers' and o.name = p_path);
$$;

revoke execute on function public.cover_object_exists(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Logo e banner da academia (colunas já existiam, sem upload)
-- ---------------------------------------------------------------------------
alter table public.academies
  add constraint academies_logo_path_format
    check (logo_path ~ ('^academy/' || id::text || '/logo-[a-z0-9]{6,16}\.(webp|jpg)$')),
  add constraint academies_cover_path_format
    check (cover_path ~ ('^academy/' || id::text || '/banner-[a-z0-9]{6,16}\.(webp|jpg)$'));

create or replace function public.academies_check_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.logo_path is distinct from old.logo_path and new.logo_path is not null
     and not public.cover_object_exists(new.logo_path) then
    raise exception 'cover_not_uploaded' using errcode = '22023';
  end if;
  if new.cover_path is distinct from old.cover_path and new.cover_path is not null
     and not public.cover_object_exists(new.cover_path) then
    raise exception 'cover_not_uploaded' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke execute on function public.academies_check_media() from public, anon, authenticated;

create trigger academies_check_media
  before update of logo_path, cover_path on public.academies
  for each row execute function public.academies_check_media();

grant update (logo_path, cover_path) on public.academies to authenticated;

-- ---------------------------------------------------------------------------
-- Galeria da academia
-- ---------------------------------------------------------------------------
create table public.academy_photos (
  id          uuid primary key default gen_random_uuid(),
  academy_id  uuid not null references public.academies (id) on delete cascade,
  path        text not null unique,
  caption     text constraint academy_photos_caption_length check (char_length(caption) <= 200),
  width       integer check (width between 1 and 4000),
  height      integer check (height between 1 and 4000),
  position    integer not null default 0 check (position between 0 and 1000),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint academy_photos_path_format
    check (path ~ ('^academy/' || academy_id::text || '/gallery-[a-z0-9]{6,16}\.(webp|jpg)$'))
);

create index academy_photos_academy_idx on public.academy_photos (academy_id, position, created_at);

-- Limite da galeria. Fase 6 (planos) passa a ler o benefício do plano; sem plano vale o padrão.
create or replace function public.academy_gallery_limit(p_academy uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select 12;
$$;

create or replace function public.academy_photos_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serializa inserções da mesma academia para o limite valer também em envios simultâneos.
  perform pg_advisory_xact_lock(hashtextextended('academy_photos:' || new.academy_id::text, 0));
  if (select count(*) from public.academy_photos where academy_id = new.academy_id)
     >= public.academy_gallery_limit(new.academy_id) then
    raise exception 'gallery_limit' using errcode = '23514';
  end if;
  if not public.cover_object_exists(new.path) then
    raise exception 'cover_not_uploaded' using errcode = '22023';
  end if;
  new.caption := nullif(btrim(new.caption), '');
  new.created_by := coalesce(auth.uid(), new.created_by);
  new.created_at := now();
  return new;
end;
$$;

revoke execute on function public.academy_photos_before_insert() from public, anon, authenticated;

create trigger academy_photos_before_insert
  before insert on public.academy_photos
  for each row execute function public.academy_photos_before_insert();

create trigger academy_photos_assert_active
  before insert or update on public.academy_photos
  for each row execute function public.assert_active_account();

alter table public.academy_photos enable row level security;

revoke all on public.academy_photos from anon, authenticated;
grant select on public.academy_photos to anon, authenticated;
grant insert (academy_id, path, caption, width, height, position),
      update (caption, position),
      delete
  on public.academy_photos to authenticated;

create policy academy_photos_select on public.academy_photos
  for select to anon, authenticated using (public.is_academy_visible(academy_id));
create policy academy_photos_insert on public.academy_photos
  for insert to authenticated with check (public.is_academy_manager(academy_id));
create policy academy_photos_update on public.academy_photos
  for update to authenticated using (public.is_academy_manager(academy_id)) with check (public.is_academy_manager(academy_id));
create policy academy_photos_delete on public.academy_photos
  for delete to authenticated using (public.is_academy_manager(academy_id));

grant execute on function public.academy_gallery_limit(uuid) to anon, authenticated;
