begin;
\ir _helpers.psql

select plan(20);

-- Grade própria do professor: locais (academia cadastrada ou outro lugar), aulas e confirmação pela academia.
select tests.create_user('tg_prof') as prof \gset
select tests.create_user('tg_aluno') as aluno \gset
select tests.create_user('tg_dono') as dono \gset
select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset
select id as preta from public.martial_art_ranks where martial_art_id = :'bjj' and track = 'adult' and name = 'Faixa Preta' \gset

-- Academia cadastrada com uma unidade.
select tests.authenticate_as(:'dono');
select public.create_academy('Academia Grade Teste') as slug \gset
select id as aid from public.academies where slug = :'slug' \gset
insert into public.academy_units (academy_id, name, street, number, neighborhood, city, state, latitude, longitude)
values (:'aid', 'Sede', 'Rua das Flores', '100', 'Centro', 'Curitiba', 'PR', -25.43, -49.27);

-- Quem não é professor não cadastra local.
select tests.authenticate_as(:'aluno');
select throws_ok($$ insert into public.teacher_places (teacher_id, name, city, state) values (auth.uid(), 'Praça', 'Curitiba', 'PR') $$,
  '42501', 'teacher_not_approved', 'sem perfil de professor não cadastra local');

-- Professor ativo (faixa preta).
select tests.authenticate_as(:'prof');
insert into public.teacher_profiles (user_id, professional_name) values (auth.uid(), 'Mestre Grade');
insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values (auth.uid(), :'bjj', :'preta');

-- Local livre (parque) e local numa academia cadastrada.
select lives_ok($$ insert into public.teacher_places (teacher_id, name, city, state, latitude, longitude) values (auth.uid(), '  Parque Barigui  ', 'Curitiba', 'PR', -25.42, -49.31) $$,
  'professor cadastra um local livre');
select is((select name from public.teacher_places where teacher_id = :'prof' and academy_id is null), 'Parque Barigui', 'nome é aparado');
select lives_ok(format($$ insert into public.teacher_places (teacher_id, name, academy_id, city, state) values (auth.uid(), 'qualquer', %L, 'X', 'SP') $$, :'aid'),
  'professor vincula um local a uma academia cadastrada');
select results_eq(format($$ select name, city, state::text, street from public.teacher_places where academy_id = %L $$, :'aid'),
  $$ values ('Academia Grade Teste · Sede'::text, 'Curitiba'::text, 'PR'::text, 'Rua das Flores'::text) $$,
  'endereço vem da unidade da academia');
select is((select status::text from public.academy_memberships where academy_id = :'aid' and user_id = :'prof' and role = 'teacher'),
  'pending', 'vincular pede o vínculo de professor à academia');

select id as parque from public.teacher_places where teacher_id = :'prof' and academy_id is null \gset
select id as noacad from public.teacher_places where teacher_id = :'prof' and academy_id is not null \gset

-- Aulas.
select lives_ok(format($$ insert into public.teacher_classes (teacher_id, place_id, martial_art_id, weekday, starts_at, ends_at, accepts_trial)
  values (auth.uid(), %L, %L, 6, '09:00', '10:30', true) $$, :'parque', :'bjj'), 'aula no parque');
select lives_ok(format($$ insert into public.teacher_classes (teacher_id, place_id, martial_art_id, weekday, starts_at, ends_at)
  values (auth.uid(), %L, %L, 2, '19:00', '20:30') $$, :'noacad', :'bjj'), 'aula na academia');
select throws_ok(format($$ insert into public.teacher_classes (teacher_id, place_id, martial_art_id, weekday, starts_at, ends_at)
  values (auth.uid(), %L, %L, 2, '20:00', '19:00') $$, :'parque', :'bjj'), '23514', null, 'fim depois do início');

-- Público vê; aula na academia aguarda confirmação.
select tests.as_anon();
select is((select count(*)::int from public.teacher_class_cards where teacher_id = :'prof'), 2, 'visitante vê a grade do professor');
select is((select academy_confirmed from public.teacher_class_cards where teacher_id = :'prof' and academy_id = :'aid'), false, 'sem confirmação da academia');
select is((select count(*)::int from public.search_teacher_classes(p_city => 'curitiba') s where (s.class).teacher_id = :'prof'), 2, 'aparece na busca por cidade');
select is((select count(*)::int from public.search_teacher_classes(p_lat => -25.42, p_lng => -49.31, p_radius_km => 2) s where (s.class).teacher_id = :'prof'), 1, 'busca por distância usa o pino do local');

-- Academia confirma o professor.
select tests.authenticate_as(:'dono');
select public.respond_membership(:'aid', :'prof', 'teacher', true);
select tests.as_anon();
select is((select academy_confirmed from public.teacher_class_cards where teacher_id = :'prof' and academy_id = :'aid'), true, 'confirmado depois do aceite da academia');

-- Ninguém mexe na grade alheia.
select tests.authenticate_as(:'aluno');
select throws_ok(format($$ insert into public.teacher_classes (teacher_id, place_id, martial_art_id, weekday, starts_at, ends_at)
  values (%L, %L, %L, 1, '07:00', '08:00') $$, :'prof', :'parque', :'bjj'), '42501', null, 'não cria aula em nome do professor');
with u as (update public.teacher_classes set notes = 'x' where teacher_id = :'prof' returning 1)
select is((select count(*)::int from u), 0, 'não edita aula alheia');
with d as (delete from public.teacher_places where teacher_id = :'prof' returning 1)
select is((select count(*)::int from d), 0, 'não apaga local alheio');

-- Local de outro professor não serve.
select tests.authenticate_as(:'prof');
select lives_ok(format($$ delete from public.teacher_places where id = %L $$, :'parque'), 'professor apaga o próprio local');
select is((select count(*)::int from public.teacher_classes where place_id = :'parque'), 0, 'aulas do local saem junto');

-- Professor revogado some do público.
select tests.as_postgres();
update public.teacher_profiles set status = 'revoked' where user_id = :'prof';
select tests.as_anon();
select is((select count(*)::int from public.teacher_class_cards where teacher_id = :'prof'), 0, 'revogado não aparece');

select * from finish();
rollback;
