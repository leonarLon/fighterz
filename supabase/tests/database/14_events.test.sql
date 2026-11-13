begin;
\ir _helpers.psql

select plan(23);

select tests.create_user('prof_ev') as prof \gset
select tests.create_user('gestor_ev') as gestor \gset
select tests.create_user('aluno_ev') as aluno \gset
select tests.create_user('curioso_ev') as curioso \gset
insert into public.teacher_profiles (user_id, professional_name) values (:'prof', 'Professor Eventos');
update public.teacher_profiles set status = 'approved' where user_id = :'prof';
select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset
insert into public.academies (name, created_by) values ('Academia Eventos', :'gestor') returning id as acad \gset
insert into public.academy_units (academy_id, name, neighborhood, city, state, latitude, longitude)
values (:'acad', 'Sede', 'Centro', 'Londrina', 'PR', -23.31, -51.16) returning id as unit \gset
insert into public.academies (name, created_by) values ('Academia Alheia', :'curioso') returning id as acad2 \gset
insert into public.academy_units (academy_id, name, city, state) values (:'acad2', 'Alheia', 'Maringá', 'PR') returning id as unit2 \gset

-- ---------------------------------------------------------------- quem organiza
select tests.authenticate_as(:'prof');
select lives_ok(
  format($$ insert into public.events (created_by, type, martial_art_id, title, starts_at, ends_at, venue_name, city, state, status)
            values (auth.uid(), 'seminar', %L, 'Seminário de guarda', now() + interval '10 days', now() + interval '10 days 3 hours',
                    'Ginásio Municipal', 'Curitiba', 'PR', 'published') $$, :'bjj'),
  'professor aprovado cria evento pessoal'
);
select id as ev from public.events where title = 'Seminário de guarda' \gset
select lives_ok(
  $$ with ins as (insert into public.events (created_by, title, starts_at, ends_at, city, state)
                  values (auth.uid(), 'Com returning', now() + interval '3 days', now() + interval '3 days', 'Curitiba', 'PR')
                  returning id)
     select id from ins $$,
  'INSERT ... RETURNING funciona (a política de leitura usa as colunas da linha)'
);
select throws_ok(
  $$ insert into public.events (created_by, title, starts_at, ends_at, city, state)
     values (auth.uid(), 'Evento antigo', now() - interval '10 days', now() - interval '10 days', 'Curitiba', 'PR') $$,
  '23514', 'event_in_past', 'não cria evento no passado'
);
select throws_ok(
  $$ insert into public.events (created_by, title, starts_at, ends_at, city, state)
     values (auth.uid(), 'Ao contrário', now() + interval '2 days', now() + interval '1 day', 'Curitiba', 'PR') $$,
  '23514', null, 'fim antes do início'
);

select tests.authenticate_as(:'aluno');
select throws_ok(
  $$ insert into public.events (created_by, title, starts_at, ends_at, city, state)
     values (auth.uid(), 'Open mat do aluno', now() + interval '2 days', now() + interval '2 days 2 hours', 'Curitiba', 'PR') $$,
  '42501', 'not_approved_teacher', 'aluno não cria evento pessoal'
);
select throws_ok(
  format($$ insert into public.events (created_by, academy_id, title, starts_at, ends_at, city, state)
            values (auth.uid(), %L, 'Evento pirata', now() + interval '2 days', now() + interval '2 days 2 hours', 'Curitiba', 'PR') $$, :'acad'),
  '42501', 'not_academy_manager', 'não cria evento em nome de academia alheia'
);

select tests.authenticate_as(:'gestor');
select throws_ok(
  format($$ insert into public.events (created_by, academy_id, unit_id, title, starts_at, ends_at, city, state)
            values (auth.uid(), %L, %L, 'Unidade errada', now() + interval '2 days', now() + interval '2 days 2 hours', 'X', 'PR') $$, :'acad', :'unit2'),
  '23514', 'unit_not_in_academy', 'unidade precisa ser da academia'
);
select lives_ok(
  format($$ insert into public.events (created_by, academy_id, unit_id, type, title, starts_at, ends_at, city, state, status)
            values (auth.uid(), %L, %L, 'open_mat', 'Open mat do teste', now() + interval '5 days', now() + interval '5 days 2 hours', 'Ignorada', 'SP', 'published') $$, :'acad', :'unit'),
  'gestor cria evento da academia na unidade'
);
select results_eq(
  $$ select city, state::text, latitude from public.events where title = 'Open mat do teste' $$,
  $$ values ('Londrina'::text, 'PR'::text, -23.31::double precision) $$,
  'local copiado da unidade'
);
select lives_ok(
  $$ insert into public.events (created_by, title, starts_at, ends_at, city, state, academy_id)
     select auth.uid(), 'Rascunho', now() + interval '20 days', now() + interval '20 days', 'Curitiba', 'PR', id
     from public.academies where name = 'Academia Eventos' $$,
  'rascunho'
);
select id as rascunho from public.events where title = 'Rascunho' \gset

-- ---------------------------------------------------------------- visibilidade e interesse
select tests.as_anon();
select is((select count(*)::int from public.event_cards where title in ('Seminário de guarda', 'Open mat do teste', 'Rascunho')), 2,
  'visitante vê publicados, não rascunho');

select tests.authenticate_as(:'aluno');
select lives_ok(format($$ insert into public.event_interests (event_id, user_id, kind) values (%L, auth.uid(), 'interested'),
                                                                                            (%L, auth.uid(), 'saved') $$, :'ev', :'ev'),
  'marca interesse e salva');
select is((select interest_count from public.events where id = :'ev'), 1, 'só "interesse" conta');
select results_eq(
  format($$ select viewer_interested, viewer_saved from public.event_cards where id = %L $$, :'ev'),
  $$ values (true, true) $$, 'card mostra o estado do usuário'
);
select throws_ok(format($$ insert into public.event_interests (event_id, user_id, kind) values (%L, auth.uid(), 'saved') $$, :'rascunho'),
  '42501', null, 'não interage com rascunho');

select tests.authenticate_as(:'curioso');
select is((select count(*)::int from public.event_interests where event_id = :'ev'), 0, 'interesses são privados');
update public.events set title = 'Invadido' where id = :'ev';
select is((select title from public.events where id = :'ev'), 'Seminário de guarda', 'terceiro não edita');

-- ---------------------------------------------------------------- cancelar e excluir
select tests.authenticate_as(:'prof');
select lives_ok(format($$ update public.events set status = 'cancelled' where id = %L $$, :'ev'), 'organizador cancela');
select tests.as_postgres();
select is((select count(*)::int from public.notifications where recipient_id = :'aluno' and type = 'event_update' and event_id = :'ev'), 1,
  'interessados são avisados');
select tests.authenticate_as(:'prof');
select throws_ok(format($$ update public.events set status = 'published' where id = %L $$, :'ev'), '23514', 'event_cancelled',
  'cancelado não volta a publicado');
delete from public.events where id = :'ev';
select is((select count(*)::int from public.events where id = :'ev'), 1, 'evento publicado/cancelado não é excluído');

select tests.authenticate_as(:'gestor');
delete from public.events where id = :'rascunho';
select is((select count(*)::int from public.events where id = :'rascunho'), 0, 'rascunho é excluído');

-- Conquista ligada a evento
select tests.authenticate_as(:'aluno');
select lives_ok(format($$ insert into public.athlete_achievements (title, event_id, achieved_on) values ('Participação', %L, current_date) $$, :'ev'),
  'conquista aponta para evento');

select * from finish();
rollback;
