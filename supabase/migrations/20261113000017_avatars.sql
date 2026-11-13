-- Fase 7 · Foto de perfil (pendência da Fase 3). Bucket público de leitura (avatar é dado público do perfil),
-- escrita só na pasta do próprio usuário. Limite de 2 MB, WebP/JPEG (a foto é recortada e reencodada no aparelho).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_objects_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_objects_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_objects_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Listar/ler pela API exige política de SELECT; a URL pública do bucket não.
create policy avatars_objects_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- avatar_path aponta só para a pasta do próprio perfil, com nome gerado pelo app.
alter table public.profiles
  add constraint profiles_avatar_path_format check (avatar_path ~ '^[0-9a-f-]{36}/avatar-[a-z0-9]{6,16}\.(webp|jpg)$');

create or replace function public.profiles_check_avatar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.avatar_path is distinct from old.avatar_path and new.avatar_path is not null
     and left(new.avatar_path, 37) <> new.id::text || '/' then
    raise exception 'avatar_not_own' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_check_avatar
  before update of avatar_path on public.profiles
  for each row execute function public.profiles_check_avatar();
