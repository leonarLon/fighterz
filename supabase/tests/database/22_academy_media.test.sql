begin;
\ir _helpers.psql

select plan(19);

-- Fase 5a da evolução comercial: bucket covers, logo, banner e galeria da academia.
select tests.create_user('am_dono') as dono \gset
select tests.create_user('am_prof') as prof \gset
select tests.create_user('am_outro') as outro \gset

select tests.authenticate_as(:'dono');
select public.create_academy('Academia Mídia') as slug_a \gset
select id as acad from public.academies where slug = :'slug_a' \gset
select tests.authenticate_as(:'outro');
select public.create_academy('Academia Vizinha') as slug_b \gset
select id as acad_b from public.academies where slug = :'slug_b' \gset

select tests.as_postgres();
insert into public.academy_memberships (academy_id, user_id, role, status, requested_by) values
  (:'acad', :'prof', 'teacher', 'active', 'academy');

-- ---------------------------------------------------------------- Storage
select tests.authenticate_as(:'dono');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', 'academy/%s/logo-abc123.webp', %L) $$, :'acad', :'dono'),
  'gestão envia arquivo para a pasta da própria academia');
select tests.authenticate_as(:'outro');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', 'academy/%s/logo-zzz999.webp', %L) $$, :'acad', :'outro'),
  '42501', null, 'gestão de outra academia não envia para esta pasta');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', 'academy/nao-e-uuid/logo-zzz999.webp', %L) $$, :'outro'),
  '42501', null, 'caminho fora do formato é recusado');
select tests.authenticate_as(:'prof');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', 'academy/%s/logo-prof11.webp', %L) $$, :'acad', :'prof'),
  '42501', null, 'professor (sem ser admin) não envia');
select tests.as_anon();
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('covers', 'academy/%s/logo-anon11.webp') $$, :'acad'),
  '42501', null, 'visitante não envia');

-- ---------------------------------------------------------------- logo e banner
select tests.authenticate_as(:'dono');
select lives_ok(format($$ update public.academies set logo_path = 'academy/%s/logo-abc123.webp' where id = %L $$, :'acad', :'acad'),
  'dono define o logo enviado');
select throws_ok(format($$ update public.academies set logo_path = 'academy/%s/logo-abc123.webp' where id = %L $$, :'acad_b', :'acad'),
  '22023', null, 'logo apontando para a pasta de outra academia é recusado');
select throws_ok(format($$ update public.academies set cover_path = 'academy/%s/banner-naoenv1.webp' where id = %L $$, :'acad', :'acad'),
  '22023', 'cover_not_uploaded', 'banner que não foi enviado é recusado');
select tests.authenticate_as(:'outro');
select is_empty(format($$ update public.academies set logo_path = null where id = %L returning id $$, :'acad'),
  'outra pessoa não altera o logo');

-- ---------------------------------------------------------------- galeria
select tests.as_postgres();
insert into storage.objects (bucket_id, name, owner_id)
select 'covers', format('academy/%s/gallery-foto%s.webp', :'acad', lpad(i::text, 2, '0')), :'dono'::uuid from generate_series(1, 13) i;

select tests.authenticate_as(:'dono');
select lives_ok(
  format($$ insert into public.academy_photos (academy_id, path, caption) values (%L, 'academy/%s/gallery-foto01.webp', '  Treino de sábado  ') $$, :'acad', :'acad'),
  'dono adiciona foto à galeria');
select is((select caption from public.academy_photos where academy_id = :'acad'), 'Treino de sábado', 'legenda sem espaços sobrando');
select tests.authenticate_as(:'prof');
select throws_ok(
  format($$ insert into public.academy_photos (academy_id, path) values (%L, 'academy/%s/gallery-foto02.webp') $$, :'acad', :'acad'),
  '42501', null, 'professor não adiciona foto');
select tests.authenticate_as(:'dono');
select throws_ok(
  format($$ insert into public.academy_photos (academy_id, path) values (%L, 'academy/%s/gallery-foto02.webp') $$, :'acad', :'acad_b'),
  '22023', null, 'foto com caminho de outra academia é recusada');

select tests.as_postgres();
insert into public.academy_photos (academy_id, path)
select :'acad', format('academy/%s/gallery-foto%s.webp', :'acad', lpad(i::text, 2, '0')) from generate_series(2, 12) i;
select tests.authenticate_as(:'dono');
select throws_ok(
  format($$ insert into public.academy_photos (academy_id, path) values (%L, 'academy/%s/gallery-foto13.webp') $$, :'acad', :'acad'),
  '23514', 'gallery_limit', 'a 13ª foto passa do limite da galeria');

select tests.as_anon();
select is((select count(*)::int from public.academy_photos where academy_id = :'acad'), 12, 'visitante vê a galeria');
select tests.authenticate_as(:'outro');
select is_empty(format($$ delete from public.academy_photos where academy_id = %L returning id $$, :'acad'),
  'outra pessoa não apaga fotos');
select tests.authenticate_as(:'dono');
select is((select count(*)::int from (select 1 from public.academy_photos where academy_id = :'acad' limit 1) x), 1, 'dono lê a galeria');
select lives_ok(format($$ delete from public.academy_photos where path = 'academy/%s/gallery-foto12.webp' $$, :'acad'), 'dono apaga foto');

select tests.as_postgres();
update public.academies set status = 'hidden' where id = :'acad';
select tests.as_anon();
select is((select count(*)::int from public.academy_photos where academy_id = :'acad'), 0, 'academia oculta não expõe a galeria');

select * from finish();
rollback;
