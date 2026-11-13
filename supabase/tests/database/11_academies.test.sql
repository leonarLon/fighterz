begin;
\ir _helpers.psql

select plan(32);

select tests.create_user('dono') as dono \gset
select tests.create_user('prof') as prof \gset
select tests.create_user('aluna') as aluna \gset
select tests.create_user('intruso') as intruso \gset
insert into public.teacher_profiles (user_id, professional_name) values (:'prof', 'Prof Teste');
update public.teacher_profiles set status = 'approved' where user_id = :'prof';
select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset

-- Criar academia: quem cria vira owner; slug único
select tests.authenticate_as(:'dono');
select is(public.create_academy('Tatame Teste', 'Descrição', array[:'bjj']::uuid[]), 'tatame-teste', 'slug gerado do nome');
select is(public.create_academy('Tatame Teste'), 'tatame-teste-2', 'slug repetido ganha sufixo');
select id as acad from public.academies where slug = 'tatame-teste' \gset
select is((select role::text || ':' || status::text from public.academy_memberships where academy_id = :'acad' and user_id = :'dono'),
  'owner:active', 'criador vira owner ativo');
select throws_ok(format($$ update public.academies set is_verified = true where id = %L $$, :'acad'), '42501', null,
  'owner não se verifica');

-- Unidade e aula pela gestão
select lives_ok(format($$ insert into public.academy_units (academy_id, name, postal_code, street, number, neighborhood, city, state, latitude, longitude)
                         values (%L, 'Sede', '80010000', 'Rua XV', '100', 'Centro', 'Curitiba', 'PR', -25.4284, -49.2733) $$, :'acad'),
  'owner cria unidade');
select id as unit from public.academy_units where academy_id = :'acad' \gset
select ok((select coords_confirmed_at is not null and location is not null from public.academy_units where id = :'unit'),
  'coordenadas confirmadas e ponto geográfico gerado');
select lives_ok(format($$ insert into public.class_schedules (academy_id, unit_id, martial_art_id, name, weekday, starts_at, ends_at, accepts_trial)
                         values (%L, %L, %L, 'Jiu-Jitsu Iniciante', 1, '19:00', '20:30', true) $$, :'acad', :'unit', :'bjj'),
  'owner cria aula');
select throws_ok(format($$ insert into public.class_schedules (academy_id, unit_id, martial_art_id, name, weekday, starts_at, ends_at)
                          values (%L, %L, %L, 'Invertida', 1, '20:00', '19:00') $$, :'acad', :'unit', :'bjj'),
  '23514', null, 'fim antes do início é recusado');
select throws_ok(format($$ insert into public.class_schedules (academy_id, unit_id, teacher_id, martial_art_id, name, weekday, starts_at, ends_at)
                          values (%L, %L, %L, %L, 'Sem vínculo', 2, '07:00', '08:00') $$, :'acad', :'unit', :'prof', :'bjj'),
  '23514', 'teacher_not_active_in_academy', 'professor sem vínculo ativo não entra na grade');

-- Intruso não altera nada
select tests.authenticate_as(:'intruso');
update public.academies set name = 'Invadida' where id = :'acad';
delete from public.class_schedules where academy_id = :'acad';
select throws_ok(format($$ insert into public.academy_units (academy_id, name, city, state) values (%L, 'Falsa', 'X', 'SP') $$, :'acad'),
  '42501', null, 'intruso não cria unidade');
select throws_ok(format($$ insert into public.academy_memberships (academy_id, user_id, role, status, requested_by)
                          values (%L, %L, 'admin', 'active', 'user') $$, :'acad', :'intruso'),
  '42501', null, 'vínculo não é inserido direto');
select tests.as_postgres();
select is((select name from public.academies where id = :'acad'), 'Tatame Teste', 'intruso não edita academia');
select is((select count(*)::int from public.class_schedules where academy_id = :'acad'), 1, 'intruso não apaga aulas');

-- Visitante vê grade, unidade e mapa
select tests.as_anon();
select is((select count(*)::int from public.class_cards where academy_id = :'acad'), 1, 'visitante vê a grade');
select ok((select latitude is not null from public.academy_units where id = :'unit'), 'visitante vê as coordenadas da unidade');

-- Aluna pede vínculo; gestão aprova; lista de alunos é privada
select tests.authenticate_as(:'aluna');
select is(public.request_membership(:'acad', 'student')::text, 'pending', 'aluna pede vínculo');
select throws_ok(format($$ select public.request_membership(%L, 'teacher') $$, :'acad'), '42501', 'teacher_not_approved',
  'só professor aprovado pede vínculo de professor');
select throws_ok(format($$ select public.respond_membership(%L, %L, 'student', true) $$, :'acad', :'aluna'), '42501', 'forbidden',
  'quem pediu não aprova o próprio pedido');
select tests.authenticate_as(:'dono');
select is((select count(*)::int from public.notifications where type = 'membership_request' and academy_id = :'acad'), 1,
  'gestão é notificada do pedido');
select lives_ok(format($$ select public.respond_membership(%L, %L, 'student', true) $$, :'acad', :'aluna'), 'owner aprova aluna');
select tests.authenticate_as(:'intruso');
select is((select count(*)::int from public.academy_memberships where academy_id = :'acad' and role = 'student'), 0,
  'lista de alunos não é pública');

-- Convite de professor: o professor aceita
select tests.authenticate_as(:'dono');
select is(public.invite_member(:'acad', 'prof', 'teacher')::text, 'pending', 'owner convida professor');
select throws_ok(format($$ select public.invite_member(%L, 'aluna', 'teacher') $$, :'acad'), '23514', 'teacher_not_approved',
  'não convida como professor quem não é professor aprovado');
select tests.authenticate_as(:'intruso');
select throws_ok(format($$ select public.respond_membership(%L, %L, 'teacher', true) $$, :'acad', :'prof'), '42501', 'forbidden',
  'terceiro não responde convite alheio');
select tests.authenticate_as(:'prof');
select lives_ok(format($$ select public.respond_membership(%L, %L, 'teacher', true) $$, :'acad', :'prof'), 'professor aceita');
select tests.as_anon();
select is((select count(*)::int from public.academy_memberships where academy_id = :'acad' and role = 'teacher'), 1,
  'professor ativo é público');

-- Professor na grade; ao sair, a aula fica sem professor
select tests.authenticate_as(:'dono');
update public.class_schedules set teacher_id = :'prof' where academy_id = :'acad';
select tests.authenticate_as(:'prof');
select lives_ok(format($$ select public.leave_membership(%L, 'teacher') $$, :'acad'), 'professor sai');
select tests.as_postgres();
select is((select teacher_id from public.class_schedules where academy_id = :'acad'), null, 'aula fica sem professor');

-- Último owner não sai; owner não é removido por terceiros
select tests.authenticate_as(:'dono');
select throws_ok(format($$ select public.leave_membership(%L, 'owner') $$, :'acad'), '23514', 'last_owner', 'último owner não sai');
select throws_ok(format($$ select public.remove_member(%L, %L, 'owner') $$, :'acad', :'dono'), '23514', 'cannot_remove_owner',
  'owner não é removido');

-- Academia oculta some para o público
update public.academies set status = 'hidden' where id = :'acad';
select tests.as_anon();
select is((select count(*)::int from public.class_cards where academy_id = :'acad'), 0, 'academia oculta: grade some');

-- Seguir academia
select tests.as_postgres();
update public.academies set status = 'active' where id = :'acad';
select tests.authenticate_as(:'aluna');
insert into public.academy_followers (academy_id, user_id) values (:'acad', :'aluna');
select tests.as_postgres();
select is((select follower_count from public.academies where id = :'acad'), 1, 'follower_count da academia');

select * from finish();
rollback;
