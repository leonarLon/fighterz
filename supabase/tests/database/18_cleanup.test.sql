begin;
\ir _helpers.psql

select plan(8);

select tests.create_user('limpeza') as uid \gset
select tests.create_post(:'uid', 'apagado há muito tempo') as old_post \gset
select tests.create_post(:'uid', 'apagado ontem') as new_post \gset
select tests.create_post(:'uid', 'removido pela moderação') as removed_post \gset

insert into storage.objects (bucket_id, name, owner_id, created_at) values
  ('post-media', :'uid' || '/' || :'old_post' || '/0-a.webp', :'uid', now() - interval '40 days'),
  ('post-media', :'uid' || '/abandonado/0-x.webp', :'uid', now() - interval '2 days'),
  ('post-media', :'uid' || '/recente/0-y.webp', :'uid', now() - interval '1 hour'),
  ('avatars', :'uid' || '/avatar-velhofoto1.webp', :'uid', now() - interval '3 days');
insert into public.post_media (post_id, position, storage_path) values (:'old_post', 0, :'uid' || '/' || :'old_post' || '/0-a.webp');

update public.posts set deleted_at = now() where id in (:'old_post', :'new_post');
-- deleted_at é sempre o horário do servidor (trigger); o teste envelhece a linha direto, sem o trigger.
-- A detecção comercial (Fase 7) roda em trigger diferido: dispara agora para liberar o ALTER TABLE.
set constraints all immediate;
alter table public.posts disable trigger posts_before_update;
update public.posts set deleted_at = now() - interval '31 days' where id = :'old_post';
alter table public.posts enable trigger posts_before_update;
update public.posts set moderation_status = 'removed' where id = :'removed_post';

select is((public.purge_deleted_content() ->> 'posts')::int, 1, 'só o post apagado há mais de 30 dias é removido');
select is((select count(*)::int from public.posts where id = :'old_post'), 0, 'linha do post antigo removida');
select is((select count(*)::int from public.posts where id = :'new_post'), 1, 'apagado recente fica (prazo de 30 dias)');
select is((select count(*)::int from public.posts where id = :'removed_post'), 1, 'removido pela moderação é mantido');
select ok(exists (select 1 from public.storage_cleanup_queue where reason = 'deleted_post' and object_name like '%/0-a.webp'),
  'arquivo do post apagado vai para a fila');
select ok(exists (select 1 from public.storage_cleanup_queue where reason = 'orphan_upload' and object_name like '%/abandonado/%'),
  'upload abandonado há mais de 24 h vai para a fila');
select ok(not exists (select 1 from public.storage_cleanup_queue where object_name like '%/recente/%'),
  'upload recente não é tocado (publicação pode estar em andamento)');

select tests.authenticate_as(:'uid');
select throws_ok($$ select public.purge_deleted_content() $$, '42501', null, 'usuário não dispara a purga');

select * from finish();
rollback;
