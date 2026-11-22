begin;
\ir _helpers.psql

select plan(29);

-- Vínculo professor e aluno com aceite mútuo e total público de alunos.
select tests.create_user('ts_mestre') as mestre \gset
select tests.create_user('ts_aluno') as aluno \gset
select tests.create_user('ts_outro') as outro \gset
select tests.create_user('ts_pendente') as pendente \gset
insert into public.teacher_profiles (user_id, professional_name) values (:'mestre', 'Mestre TS');
update public.teacher_profiles set status = 'approved' where user_id = :'mestre';
insert into public.teacher_profiles (user_id, professional_name) values (:'pendente', 'Ainda não aprovado');

-- ---------------------------------------------------------------- convite do professor
select tests.as_anon();
select throws_ok($$ select public.invite_student('ts_aluno') $$, '42501', null, 'visitante não convida');

select tests.authenticate_as(:'pendente');
select throws_ok($$ select public.invite_student('ts_aluno') $$, '42501', 'teacher_not_approved', 'professor não aprovado não convida');

select tests.authenticate_as(:'mestre');
select throws_ok($$ select public.invite_student('ts_mestre') $$, '22023', 'cannot_add_self', 'professor não é aluno de si mesmo');
select throws_ok($$ select public.invite_student('ninguem_ts') $$, 'P0002', 'user_not_found', '@ inexistente');
select is(public.invite_student('@TS_Aluno'), 'pending', 'convite fica pendente (aceita @ e maiúsculas)');
select is(public.invite_student('ts_aluno'), 'pending', 'convidar de novo não duplica');
select throws_ok(format($$ insert into public.teacher_students (teacher_id, student_id, status, requested_by) values (auth.uid(), %L, 'active', 'teacher') $$, :'outro'),
  '42501', null, 'ninguém grava o vínculo direto');
select is((select student_count from public.teacher_profiles where user_id = :'mestre'), 0, 'pendente não conta');

select tests.authenticate_as(:'aluno');
select is((select count(*)::int from public.notifications where recipient_id = auth.uid() and type = 'student_invite'), 1, 'aluno é avisado do convite');
select throws_ok(format($$ select public.respond_student_link(%L, %L, true) $$, :'mestre', :'outro'), 'P0002', 'link_not_found', 'só responde pedido que existe');

select tests.authenticate_as(:'mestre');
select throws_ok(format($$ select public.respond_student_link(%L, %L, true) $$, :'mestre', :'aluno'), '42501', 'forbidden', 'quem convidou não aceita pelo outro');

select tests.authenticate_as(:'aluno');
select lives_ok(format($$ select public.respond_student_link(%L, %L, true) $$, :'mestre', :'aluno'), 'aluno aceita o convite');
select is((select student_count from public.teacher_cards where user_id = :'mestre'), 1, 'total aparece no cartão público do professor');
select tests.as_anon();
select is((select student_count from public.teacher_cards where user_id = :'mestre'), 1, 'visitante também vê o total');

-- ---------------------------------------------------------------- visibilidade
select tests.authenticate_as(:'outro');
select is((select count(*)::int from public.teacher_students where teacher_id = :'mestre'), 0, 'lista de alunos não é pública');
select is((select count(*)::int from public.teacher_student_cards where teacher_id = :'mestre'), 0, 'cartões também não');
select tests.authenticate_as(:'mestre');
select is((select student_username from public.teacher_student_cards where teacher_id = auth.uid()), 'ts_aluno', 'professor vê os próprios alunos');
select tests.authenticate_as(:'aluno');
select is((select teacher_name from public.teacher_student_cards where student_id = auth.uid()), 'Mestre TS', 'aluno vê o nome do professor');

-- ---------------------------------------------------------------- pedido do aluno
select tests.authenticate_as(:'outro');
select throws_ok(format($$ select public.request_teacher(%L) $$, :'pendente'), 'P0002', 'teacher_not_found', 'só pede a professor aprovado');
select is(public.request_teacher(:'mestre'), 'pending', 'pessoa pede para ser aluno');
select tests.authenticate_as(:'mestre');
select is((select count(*)::int from public.notifications where recipient_id = auth.uid() and type = 'student_request'), 1, 'professor é avisado do pedido');
select is(public.invite_student('ts_outro'), 'active', 'convidar quem já pediu ativa na hora');
select is((select student_count from public.teacher_profiles where user_id = :'mestre'), 2, 'dois alunos');

-- ---------------------------------------------------------------- desfazer
select tests.authenticate_as(:'outro');
select lives_ok(format($$ select public.remove_student_link(%L, auth.uid()) $$, :'mestre'), 'aluno desfaz o vínculo');
select is((select student_count from public.teacher_cards where user_id = :'mestre'), 1, 'contador desce');
select tests.authenticate_as(:'pendente');
select throws_ok(format($$ select public.remove_student_link(%L, %L) $$, :'mestre', :'aluno'), '42501', 'forbidden', 'terceiro não desfaz vínculo alheio');

-- Bloquear desfaz o vínculo.
select tests.authenticate_as(:'aluno');
insert into public.blocked_users (blocker_id, blocked_id) values (auth.uid(), :'mestre');
select is((select count(*)::int from public.teacher_students where student_id = auth.uid()), 0, 'bloquear desfaz o vínculo');
select tests.as_postgres();
select is((select student_count from public.teacher_profiles where user_id = :'mestre'), 0, 'e zera o contador');

-- Contador não é editável e não reenvia pedido recusado.
select tests.authenticate_as(:'mestre');
select throws_ok($$ update public.teacher_profiles set student_count = 99 where user_id = auth.uid() $$, '42501', null, 'professor não edita o total');

select * from finish();
rollback;
