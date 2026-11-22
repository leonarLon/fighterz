begin;
\ir _helpers.psql

select plan(6);

-- Só a moderação aplica ou tira a suspensão de uma academia.
select tests.create_user('as_dono') as dono \gset
select tests.create_user('as_moder') as moder \gset
insert into public.user_roles (user_id, role) values (:'moder', 'moderator');

select tests.authenticate_as(:'dono');
select public.create_academy('Academia Suspensa Teste') as slug \gset
select id as aid from public.academies where slug = :'slug' \gset
select lives_ok(format($$ update public.academies set status = 'hidden' where id = %L $$, :'aid'), 'dono oculta a própria academia');
select lives_ok(format($$ update public.academies set status = 'active' where id = %L $$, :'aid'), 'e reativa');
select throws_ok(format($$ update public.academies set status = 'suspended' where id = %L $$, :'aid'), '42501', null, 'dono não suspende');

select tests.authenticate_as(:'moder');
select lives_ok(format($$ select public.moderate_content('academy', %L, true, 'Teste de suspensão') $$, :'aid'), 'moderação suspende');

select tests.authenticate_as(:'dono');
select throws_ok(format($$ update public.academies set status = 'active' where id = %L $$, :'aid'), '42501', 'academy_status_forbidden', 'dono não tira a suspensão');
select tests.as_postgres();
select is((select status::text from public.academies where id = :'aid'), 'suspended', 'continua suspensa');

select * from finish();
rollback;
