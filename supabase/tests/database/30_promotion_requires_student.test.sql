begin;
\ir _helpers.psql

select plan(10);

-- Pedido de confirmação de graduação só para professor com vínculo ativo.
select tests.create_user('pr_mestre') as mestre \gset
select tests.create_user('pr_aluno') as aluno \gset
select tests.create_user('pr_curioso') as curioso \gset
insert into public.teacher_profiles (user_id, professional_name) values (:'mestre', 'Mestre PR');
update public.teacher_profiles set status = 'approved' where user_id = :'mestre';
select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset
select id as azul from public.martial_art_ranks where martial_art_id = :'bjj' and name = 'Faixa Azul' and track = 'adult' \gset

select tests.authenticate_as(:'aluno');
insert into public.user_martial_arts (user_id, martial_art_id) values (auth.uid(), :'bjj');
select id as uma from public.user_martial_arts where user_id = :'aluno' \gset

select throws_ok(format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on, teacher_id) values (%L, %L, 0, '2025-01-10', %L) $$, :'uma', :'azul', :'mestre'),
  '23514', 'not_your_teacher', 'sem vínculo não indica o professor');
select lives_ok(format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on) values (%L, %L, 0, '2025-01-10') $$, :'uma', :'azul'),
  'sem professor continua permitido');

-- Vínculo ativo: pedido do aluno aceito pelo professor.
select public.request_teacher(:'mestre');
select tests.authenticate_as(:'mestre');
select public.respond_student_link(:'mestre', :'aluno', true);

select tests.authenticate_as(:'aluno');
select lives_ok(format($$ update public.rank_promotions set teacher_id = %L where user_martial_art_id = %L $$, :'mestre', :'uma'), 'com vínculo indica o professor');
select id as promo from public.rank_promotions where user_martial_art_id = :'uma' \gset

-- A checagem não revela vínculos alheios.
select tests.authenticate_as(:'curioso');
select is(public.is_active_student_of(:'mestre', :'aluno'), false, 'terceiro não descobre quem é aluno de quem');
select tests.authenticate_as(:'aluno');
select is(public.is_active_student_of(:'mestre', :'aluno'), true, 'a própria parte vê o vínculo');

-- Desfazer o vínculo cancela o pedido pendente; o professor não confirma mais.
select lives_ok(format($$ select public.remove_student_link(%L, auth.uid()) $$, :'mestre'), 'aluno desfaz o vínculo');
select is((select teacher_id from public.rank_promotions where id = :'promo'), null, 'pedido pendente perde o professor');

-- Professor indicado, mas sem vínculo na hora de confirmar (vínculo refeito e desfeito pelo professor).
select public.request_teacher(:'mestre');
select tests.authenticate_as(:'mestre');
select public.respond_student_link(:'mestre', :'aluno', true);
select tests.authenticate_as(:'aluno');
update public.rank_promotions set teacher_id = :'mestre' where id = :'promo';
select tests.as_postgres();
update public.teacher_students set status = 'pending' where teacher_id = :'mestre' and student_id = :'aluno';
select tests.authenticate_as(:'mestre');
select throws_ok(format($$ select public.confirm_promotion(%L, true) $$, :'promo'), '42501', 'not_your_student', 'sem vínculo ativo não confirma');
select tests.as_postgres();
update public.teacher_students set status = 'active' where teacher_id = :'mestre' and student_id = :'aluno';
select tests.authenticate_as(:'mestre');
select lives_ok(format($$ select public.confirm_promotion(%L, true) $$, :'promo'), 'com vínculo ativo confirma');
select is((select verification::text from public.rank_promotions where id = :'promo'), 'teacher_confirmed', 'graduação confirmada');

select * from finish();
rollback;
