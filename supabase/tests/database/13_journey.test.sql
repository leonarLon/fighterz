begin;
\ir _helpers.psql

select plan(45);

-- Aceite da Fase 5: graduação BJJ com graus validados e confirmação pelo professor.
select tests.create_user('atleta_j') as atleta \gset
select tests.create_user('estranho_j') as estranho \gset
select tests.create_user('mestre_j') as mestre \gset
select tests.create_user('fake_j') as fake \gset
insert into public.teacher_profiles (user_id, professional_name) values (:'mestre', 'Mestre J');
update public.teacher_profiles set status = 'approved' where user_id = :'mestre';
insert into public.teacher_profiles (user_id, professional_name) values (:'fake', 'Pendente');
-- Desde a migration 30, só professor com vínculo ativo recebe pedido de confirmação.
insert into public.teacher_students (teacher_id, student_id, status, requested_by, accepted_at) values (:'mestre', :'atleta', 'active', 'teacher', now());

select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset
select id as mt from public.martial_arts where slug = 'muay-thai' \gset
select r.id as branca from public.martial_art_ranks r where r.martial_art_id = :'bjj' and r.ordinal = 1 \gset
select r.id as azul from public.martial_art_ranks r where r.martial_art_id = :'bjj' and r.ordinal = 2 \gset
select r.id as roxa from public.martial_art_ranks r where r.martial_art_id = :'bjj' and r.ordinal = 3 \gset
select r.id as coral from public.martial_art_ranks r where r.martial_art_id = :'bjj' and r.ordinal = 6 \gset
select r.id as kruang from public.martial_art_ranks r where r.martial_art_id = :'mt' and r.ordinal = 1 \gset
insert into public.academies (name, created_by) values ('Academia Jornada', :'mestre') returning id as acad \gset
insert into public.academies (name, created_by) values ('Outra Academia', :'mestre') returning id as acad2 \gset
insert into public.academy_units (academy_id, name, city, state) values (:'acad2', 'Sede', 'Curitiba', 'PR') returning id as unit2 \gset
insert into public.class_schedules (academy_id, unit_id, martial_art_id, name, weekday, starts_at, ends_at)
values (:'acad2', :'unit2', :'bjj', 'Noturna', 1, '19:00', '20:30') returning id as aula2 \gset

-- ---------------------------------------------------------------- modalidades e graduações
select tests.authenticate_as(:'atleta');
select lives_ok(
  format($$ insert into public.user_martial_arts (user_id, martial_art_id, started_on) values (%L, %L, '2020-03-01') $$, :'atleta', :'bjj'),
  'atleta adiciona BJJ à jornada'
);
select id as uma from public.user_martial_arts where user_id = :'atleta' \gset
select throws_ok(
  format($$ insert into public.user_martial_arts (user_id, martial_art_id) values (%L, %L) $$, :'estranho', :'mt'),
  '42501', null, 'não cria jornada de outra pessoa'
);
select throws_ok(
  format($$ update public.user_martial_arts set current_rank_id = %L where id = %L $$, :'coral', :'uma'),
  '42501', null, 'graduação atual não é escrita pelo usuário'
);

select lives_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on) values (%L, %L, 0, '2020-03-01') $$, :'uma', :'branca'),
  'faixa branca'
);
select lives_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on) values (%L, %L, 4, '2023-05-10') $$, :'uma', :'azul'),
  'faixa azul com 4 graus'
);
select throws_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on) values (%L, %L, 5, '2024-01-10') $$, :'uma', :'azul'),
  '23514', 'degree_exceeds_max', 'faixa azul não passa de 4 graus'
);
select throws_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on) values (%L, %L, 1, '2024-01-10') $$, :'uma', :'coral'),
  '23514', 'degree_exceeds_max', 'faixa coral não tem graus'
);
select throws_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on) values (%L, %L, 0, '2024-01-10') $$, :'uma', :'kruang'),
  '23514', 'rank_not_in_martial_art', 'graduação de outra modalidade'
);
select throws_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on) values (%L, %L, 0, current_date + 2) $$, :'uma', :'azul'),
  '23514', 'promoted_on_in_future', 'data futura'
);
select throws_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on, verification) values (%L, %L, 0, '2023-01-01', 'teacher_confirmed') $$, :'uma', :'azul'),
  '42501', null, 'atleta não se autoconfirma'
);
select results_eq(
  format($$ select rank_name, current_degree::int from public.journey_cards where id = %L $$, :'uma'),
  $$ values ('Faixa Azul'::text, 4) $$,
  'graduação atual = maior faixa e grau registrados'
);
select lives_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on) values (%L, %L, 2, '2021-06-01') $$, :'uma', :'branca'),
  'promoção antiga no histórico'
);
select is((select rank_name from public.journey_cards where id = :'uma'), 'Faixa Azul', 'histórico antigo não muda a atual');

-- ---------------------------------------------------------------- confirmação pelo professor
select throws_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on, teacher_id) values (%L, %L, 0, '2024-02-01', %L) $$, :'uma', :'azul', :'fake'),
  '23514', 'teacher_not_approved', 'só professor aprovado é indicado'
);
select lives_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, rank_id, degree, promoted_on, teacher_id, academy_id) values (%L, %L, 0, '2024-02-01', %L, %L) $$, :'uma', :'roxa', :'mestre', :'acad'),
  'indica o professor'
);
select id as promo from public.rank_promotions where teacher_id = :'mestre' \gset
select tests.as_postgres();
select is((select count(*)::int from public.notifications where recipient_id = :'mestre' and type = 'promotion_request'), 1,
  'professor recebe o pedido de confirmação');

select tests.authenticate_as(:'estranho');
select throws_ok(format($$ select public.confirm_promotion(%L, true) $$, :'promo'), '42501', 'not_the_teacher',
  'outra pessoa não confirma');

select tests.authenticate_as(:'mestre');
select is((select count(*)::int from public.promotion_cards where id = :'promo'), 1, 'professor vê a promoção indicada');
select lives_ok(format($$ select public.confirm_promotion(%L, true) $$, :'promo'), 'professor confirma');
select is((select verification::text from public.rank_promotions where id = :'promo'), 'teacher_confirmed', 'promoção confirmada');

select tests.as_postgres();
select is((select count(*)::int from public.notifications where recipient_id = :'atleta' and type = 'promotion_confirmed'), 1,
  'atleta é avisado da confirmação');

select tests.authenticate_as(:'atleta');
select results_eq(
  format($$ select rank_name, current_degree::int, current_confirmed from public.journey_cards where id = %L $$, :'uma'),
  $$ values ('Faixa Roxa'::text, 0, true) $$,
  'graduação atual confirmada'
);
select lives_ok(format($$ update public.rank_promotions set degree = 1 where id = %L $$, :'promo'), 'atleta edita o grau');
select is((select verification::text from public.rank_promotions where id = :'promo'), 'self_reported',
  'editar desfaz a confirmação');

select tests.authenticate_as(:'mestre');
select lives_ok(format($$ select public.confirm_promotion(%L, false) $$, :'promo'), 'professor recusa');
select tests.authenticate_as(:'atleta');
select is((select teacher_id from public.rank_promotions where id = :'promo'), null, 'recusa desfaz a indicação');

-- ---------------------------------------------------------------- privacidade da jornada
select tests.as_anon();
select is((select count(*)::int from public.journey_cards where user_id = :'atleta'), 1, 'graduações públicas por padrão');

select tests.authenticate_as(:'atleta');
update public.user_settings set show_ranks = 'followers' where user_id = auth.uid();
select tests.authenticate_as(:'estranho');
select is((select count(*)::int from public.rank_promotions where user_id = :'atleta'), 0, 'só seguidores: estranho não vê');
select lives_ok(format($$ insert into public.follows (follower_id, following_id) values (auth.uid(), %L) $$, :'atleta'), 'segue');
select ok((select count(*) from public.rank_promotions where user_id = :'atleta') > 0, 'seguidor vê');

-- ---------------------------------------------------------------- conquistas
select tests.authenticate_as(:'atleta');
select lives_ok(
  format($$ insert into public.athlete_achievements (martial_art_id, title, event_name, placement, medal, achieved_on)
            values (%L, 'Campeão estadual', 'Estadual PR', 1, 'gold', '2024-08-10') $$, :'bjj'),
  'registra conquista'
);
select throws_ok(
  $$ insert into public.athlete_achievements (title, achieved_on) values ('Futuro', current_date + 5) $$,
  '23514', 'achieved_on_in_future', 'conquista não pode ser futura'
);
select tests.authenticate_as(:'estranho');
update public.athlete_achievements set title = 'Hackeado' where user_id = :'atleta';
select tests.as_postgres();
select is((select title from public.athlete_achievements where user_id = :'atleta'), 'Campeão estadual', 'terceiro não edita conquista');

-- ---------------------------------------------------------------- registros de treino
select tests.authenticate_as(:'atleta');
select throws_ok(
  format($$ insert into public.training_checkins (user_id, martial_art_id, trained_at) values (auth.uid(), %L, now()) $$, :'bjj'),
  '42501', null, 'check-in só pela função'
);
select lives_ok(
  format($$ select public.create_checkin(now() - interval '2 hours', %L, 90, 'Treino de passagem', %L, null, true, 'public') $$, :'bjj', :'acad'),
  'registra treino e compartilha'
);
select results_eq(
  $$ select kind::text, academy_name, martial_art_name from public.post_cards where author_id = auth.uid() $$,
  $$ values ('checkin'::text, 'Academia Jornada'::text, 'Jiu-Jitsu Brasileiro'::text) $$,
  'post de treino traz modalidade e academia'
);
select throws_ok(
  format($$ select public.create_checkin(now() + interval '3 hours', %L) $$, :'bjj'),
  '23514', 'trained_at_in_future', 'treino no futuro'
);
select throws_ok(
  format($$ select public.create_checkin(now(), null, null, null, %L, %L) $$, :'acad', :'aula2'),
  '23514', 'class_not_in_academy', 'aula precisa ser da academia'
);
select lives_ok(format($$ select public.create_checkin(now(), null, null, null, null, %L) $$, :'aula2'),
  'aula define academia e modalidade');
select is((select academy_id from public.training_checkins where class_schedule_id = :'aula2'), :'acad2'::uuid,
  'academia vem da aula');
select lives_ok(format($$ select public.create_checkin(now(), %L), public.create_checkin(now(), %L), public.create_checkin(now(), %L) $$, :'bjj', :'bjj', :'bjj'),
  'até 5 treinos por dia');
select throws_ok(format($$ select public.create_checkin(now(), %L) $$, :'bjj'), 'P0429', null, 'limite de 5 treinos por dia');

-- show_checkins padrão = seguidores
select tests.as_postgres();
select tests.create_user('outro_j') as outro \gset
select tests.authenticate_as(:'outro');
select is((select count(*)::int from public.training_checkins where user_id = :'atleta'), 0, 'treinos ocultos para não seguidores');
select is((select total from public.get_training_summary(:'atleta')), 0, 'resumo respeita a privacidade');
select tests.authenticate_as(:'estranho');
select is((select total from public.get_training_summary(:'atleta')), 5, 'seguidor vê o resumo');

select * from finish();
rollback;
