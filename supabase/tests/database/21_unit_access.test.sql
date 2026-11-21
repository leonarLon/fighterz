begin;
\ir _helpers.psql

select plan(31);

-- Fase 4 da evolução comercial: TotalPass, Wellhub e diária por unidade.
select tests.create_user('ua_dono') as dono \gset
select tests.create_user('ua_admin') as adm \gset
select tests.create_user('ua_prof') as prof \gset
select tests.create_user('ua_aluno') as aluno \gset
select tests.create_user('ua_outro') as outro \gset
select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset

select tests.authenticate_as(:'dono');
select public.create_academy('Academia Acesso') as slug_a \gset
select id as acad from public.academies where slug = :'slug_a' \gset
insert into public.academy_units (academy_id, name, city, state) values (:'acad', 'Centro', 'Curitiba', 'PR') returning id as u1 \gset
insert into public.academy_units (academy_id, name, city, state) values (:'acad', 'Bairro', 'Curitiba', 'PR') returning id as u2 \gset

select tests.authenticate_as(:'outro');
select public.create_academy('Academia Alheia') as slug_b \gset
select id as acad_b from public.academies where slug = :'slug_b' \gset
insert into public.academy_units (academy_id, name, city, state) values (:'acad_b', 'Sede', 'Curitiba', 'PR') returning id as ub \gset

select tests.as_postgres();
insert into public.academy_memberships (academy_id, user_id, role, status, requested_by) values
  (:'acad', :'adm', 'admin', 'active', 'academy'),
  (:'acad', :'prof', 'teacher', 'active', 'academy'),
  (:'acad', :'aluno', 'student', 'active', 'user');

-- ---------------------------------------------------------------- dono e admin escrevem
select tests.authenticate_as(:'dono');
select lives_ok(
  format($$ insert into public.academy_unit_access (unit_id, kind, accepted, plans, martial_art_ids, access_hours, restrictions)
            values (%L, 'totalpass', true, array[' Silver ', 'Gold'], array[%L]::uuid[], 'Seg a sex, 6h às 22h', 'Só aulas abertas') $$, :'u1', :'bjj'),
  'dono cadastra TotalPass na unidade Centro');
select is((select plans from public.academy_unit_access where unit_id = :'u1' and kind = 'totalpass'), array['Silver', 'Gold'],
  'planos são normalizados (espaços removidos)');
select is((select academy_id from public.academy_unit_access where unit_id = :'u1' and kind = 'totalpass'), :'acad'::uuid,
  'academia vem da unidade');
select is((select updated_by from public.academy_unit_access where unit_id = :'u1' and kind = 'totalpass'), :'dono'::uuid,
  'última atualização registra quem salvou');

select tests.authenticate_as(:'adm');
select lives_ok(
  format($$ insert into public.academy_unit_access (unit_id, kind, accepted, price_status, price_cents) values (%L, 'day_pass', true, 'paid', 4000) $$, :'u1'),
  'admin da academia cadastra diária paga');
select lives_ok(
  format($$ insert into public.academy_unit_access (unit_id, kind, accepted, price_status) values (%L, 'day_pass', true, 'free') $$, :'u2'),
  'outra unidade: diária gratuita (cada unidade tem a sua)');
select lives_ok(
  format($$ insert into public.academy_unit_access (unit_id, kind, accepted) values (%L, 'wellhub', false) $$, :'u2'),
  'unidade Bairro informa que não aceita Wellhub');
select is((select count(*)::int from public.academy_unit_access where academy_id = :'acad' and kind = 'day_pass'), 2,
  'diárias diferentes por unidade');

-- ---------------------------------------------------------------- regras de preço (nada inventado)
select throws_ok(format($$ update public.academy_unit_access set price_cents = null where unit_id = %L and kind = 'day_pass' $$, :'u1'),
  '23514', null, 'diária paga sem valor é recusada');
select throws_ok(format($$ update public.academy_unit_access set price_status = 'undisclosed' where unit_id = %L and kind = 'day_pass' $$, :'u1'),
  '23514', null, 'valor com status "não divulgado" é recusado');
select lives_ok(format($$ update public.academy_unit_access set price_status = 'undisclosed', price_cents = null where unit_id = %L and kind = 'day_pass' $$, :'u1'),
  'diária com valor não divulgado');
select throws_ok(format($$ update public.academy_unit_access set price_status = 'free' where unit_id = %L and kind = 'totalpass' $$, :'u1'),
  '23514', null, 'TotalPass não tem preço');
select throws_ok(format($$ insert into public.academy_unit_access (unit_id, kind, accepted) values (%L, 'day_pass', true) $$, :'ub'),
  '42501', null, 'gestor de uma academia não escreve em unidade de outra');
select lives_ok(format($$ insert into public.academy_unit_access (unit_id, academy_id, kind, accepted) values (%L, %L, 'wellhub', false) $$, :'u1', :'acad_b'),
  'academy_id enviado por engano é trocado pelo da unidade');
select is((select academy_id from public.academy_unit_access where unit_id = :'u1' and kind = 'wellhub'), :'acad'::uuid,
  'linha fica na academia da unidade, não na informada');
select lives_ok(format($$ update public.academy_unit_access set accepted = true, plans = array['Básico'] where unit_id = %L and kind = 'wellhub' $$, :'u2'),
  'admin passa a aceitar Wellhub na unidade Bairro');
select lives_ok(format($$ update public.academy_unit_access set accepted = false where unit_id = %L and kind = 'day_pass' $$, :'u2'),
  'deixar de oferecer diária');
select is((select price_status::text from public.academy_unit_access where unit_id = :'u2' and kind = 'day_pass'), null,
  'sem diária, o status de preço é limpo');
select throws_ok(format($$ insert into public.academy_unit_access (unit_id, kind, accepted, plans) values (%L, 'totalpass', true, array['A','a']) $$, :'u2'),
  '23514', null, 'planos repetidos são recusados');
select throws_ok(format($$ insert into public.academy_unit_access (unit_id, kind, accepted, martial_art_ids) values (%L, 'totalpass', true, array[gen_random_uuid()]) $$, :'u2'),
  '23503', 'martial_art_not_found', 'modalidade inexistente é recusada');

-- ---------------------------------------------------------------- quem não pode
select tests.authenticate_as(:'prof');
select is_empty(format($$ update public.academy_unit_access set accepted = false where unit_id = %L returning id $$, :'u1'),
  'professor da academia não edita (precisa ser promovido a admin pelo dono)');
select tests.authenticate_as(:'aluno');
select throws_ok(format($$ insert into public.academy_unit_access (unit_id, kind, accepted) values (%L, 'totalpass', true) $$, :'u2'),
  '42501', null, 'aluno não cadastra');
select tests.authenticate_as(:'outro');
select is_empty(format($$ delete from public.academy_unit_access where academy_id = %L returning id $$, :'acad'),
  'outra pessoa não apaga');

-- ---------------------------------------------------------------- leitura pública
select tests.as_anon();
select is((select count(*)::int from public.academy_unit_access where academy_id = :'acad'), 5, 'visitante vê as informações');
select tests.as_postgres();
update public.academies set status = 'hidden' where id = :'acad';
select tests.as_anon();
select is((select count(*)::int from public.academy_unit_access where academy_id = :'acad'), 0, 'academia oculta não expõe as informações');

-- ---------------------------------------------------------------- conta suspensa
select tests.as_postgres();
update public.academies set status = 'active' where id = :'acad';
update public.profiles set status = 'suspended' where id = :'dono';
select tests.authenticate_as(:'dono');
select throws_ok(format($$ update public.academy_unit_access set notes = 'x' where unit_id = %L and kind = 'totalpass' $$, :'u1'),
  '42501', 'account_suspended', 'conta suspensa não altera');

-- ---------------------------------------------------------------- professor cita planos aceitos onde dá aula
select tests.as_postgres();
update public.profiles set status = 'active' where id = :'dono';
select tests.authenticate_as(:'prof');
select lives_ok(
  $$ insert into public.teacher_profiles (user_id, professional_name, access_plans)
     values (auth.uid(), 'Prof Acesso', 'Academia Acesso: TotalPass Silver e Wellhub Gold') $$,
  'professor informa os planos aceitos onde dá aula');
select throws_ok($$ update public.teacher_profiles set access_plans = repeat('x', 501) where user_id = auth.uid() $$,
  '23514', null, 'planos aceitos têm limite de 500 caracteres');
select tests.authenticate_as(:'outro');
select is_empty($$ update public.teacher_profiles set access_plans = 'invadido' where professional_name = 'Prof Acesso' returning user_id $$,
  'outra pessoa não altera os planos do professor');
select tests.as_anon();
select is((select count(*)::int from public.teacher_cards where professional_name = 'Prof Acesso'), 0,
  'professor pendente não aparece');
select tests.as_postgres();
update public.teacher_profiles set status = 'approved' where user_id = :'prof';
select tests.as_anon();
select is((select access_plans from public.teacher_cards where user_id = :'prof'), 'Academia Acesso: TotalPass Silver e Wellhub Gold',
  'visitante vê os planos no perfil público do professor aprovado');

select * from finish();
rollback;
