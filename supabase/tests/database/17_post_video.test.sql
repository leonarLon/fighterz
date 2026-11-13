begin;
\ir _helpers.psql

select plan(7);

select tests.create_user('cinegrafista') as uid \gset
select tests.create_user('vizinho') as other \gset
select gen_random_uuid() as p1 \gset
select gen_random_uuid() as p2 \gset
select gen_random_uuid() as p3 \gset

-- Arquivos "enviados" (as linhas do Storage bastam para a validação de caminho).
insert into storage.objects (bucket_id, name, owner_id) values
  ('post-media', :'uid' || '/' || :'p1' || '/0-a.webm', :'uid'),
  ('post-media', :'uid' || '/' || :'p1' || '/0-a-poster.webp', :'uid'),
  ('post-media', :'uid' || '/' || :'p2' || '/0-b.mp4', :'uid'),
  ('post-media', :'uid' || '/' || :'p2' || '/1-b.webp', :'uid'),
  ('post-media', :'uid' || '/' || :'p3' || '/0-c.webp', :'uid'),
  ('post-media', :'other' || '/x/0-alheio.webp', :'other');

select tests.authenticate_as(:'uid');

select lives_ok(
  format($$ select public.create_post(%L, 'vídeo', 'public', null, null,
    jsonb_build_array(jsonb_build_object('type', 'video', 'path', %L, 'thumbnail', %L, 'duration_ms', 4000, 'width', 640, 'height', 360))) $$,
    :'p1', :'uid' || '/' || :'p1' || '/0-a.webm', :'uid' || '/' || :'p1' || '/0-a-poster.webp'),
  'post com um vídeo e miniatura'
);
select results_eq(
  format($$ select type::text, duration_ms, thumbnail_path is not null from public.post_media where post_id = %L $$, :'p1'),
  $$ values ('video'::text, 4000, true) $$,
  'mídia gravada como vídeo, com duração e miniatura'
);
select is(
  (select media -> 0 ->> 'type' from public.post_cards where id = :'p1'),
  'video', 'post_cards informa o tipo da mídia'
);

select throws_ok(
  format($$ select public.create_post(%L, 'misto', 'public', null, null,
    jsonb_build_array(jsonb_build_object('type', 'video', 'path', %L, 'duration_ms', 1000),
                      jsonb_build_object('type', 'image', 'path', %L))) $$,
    :'p2', :'uid' || '/' || :'p2' || '/0-b.mp4', :'uid' || '/' || :'p2' || '/1-b.webp'),
  '22023', 'video_must_be_alone', 'vídeo não divide o post com fotos'
);
select throws_ok(
  format($$ select public.create_post(%L, 'disfarce', 'public', null, null,
    jsonb_build_array(jsonb_build_object('type', 'video', 'path', %L, 'duration_ms', 1000))) $$,
    :'p3', :'uid' || '/' || :'p3' || '/0-c.webp'),
  '22023', 'invalid_media_path', 'extensão precisa bater com o tipo'
);
select throws_ok(
  format($$ select public.create_post(%L, 'miniatura alheia', 'public', null, null,
    jsonb_build_array(jsonb_build_object('type', 'video', 'path', %L, 'thumbnail', %L, 'duration_ms', 1000))) $$,
    :'p2', :'uid' || '/' || :'p2' || '/0-b.mp4', :'other' || '/x/0-alheio.webp'),
  '22023', 'invalid_media_path', 'miniatura precisa estar na pasta do próprio post'
);
select throws_ok(
  format($$ insert into public.post_media (post_id, position, type, storage_path) values (%L, 5, 'video', 'x/y.webm') $$, :'p1'),
  '23514', null, 'vídeo sem duração é recusado'
);

select * from finish();
rollback;
