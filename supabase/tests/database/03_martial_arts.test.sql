begin;
\ir _helpers.psql

select plan(12);

select tests.create_user('aluno') as aluno \gset
select tests.create_user('gestor') as gestor \gset
insert into public.user_roles (user_id, role) values (:'gestor', 'admin');

select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset

select is((select count(*)::int from public.martial_arts), 12, 'seed: 11 modalidades + Outra');
select is(
  (select max_degrees::int from public.martial_art_ranks where martial_art_id = :'bjj' and name = 'Faixa Preta'),
  6, 'BJJ: faixa preta com 6 graus'
);
select throws_ok(
  format($$ insert into public.martial_art_ranks (martial_art_id, ordinal, name) values (%L, 1, 'Duplicada') $$, :'bjj'),
  '23505', null, 'ordinal duplicado na mesma trilha é recusado'
);

update public.martial_arts set is_active = false where slug = 'outra';

-- Visitante
select tests.as_anon();
select is((select count(*)::int from public.martial_arts), 11, 'visitante vê só modalidades ativas');
select ok((select count(*) from public.martial_art_ranks) > 0, 'visitante vê graduações');
select throws_ok($$ insert into public.martial_arts (slug, name) values ('x', 'X') $$, '42501', null,
  'visitante não cria modalidade');

-- Usuário comum
select tests.authenticate_as(:'aluno');
select throws_ok($$ insert into public.martial_arts (slug, name) values ('sumo', 'Sumô') $$, '42501', null,
  'usuário comum não cria modalidade');
update public.martial_arts set name = 'Alterado' where slug = 'judo';
delete from public.martial_art_ranks where martial_art_id = :'bjj';

select tests.as_postgres();
select is((select name from public.martial_arts where slug = 'judo'), 'Judô', 'usuário comum não altera modalidade');
select is((select count(*)::int from public.martial_art_ranks where martial_art_id = :'bjj'), 8, 'usuário comum não apaga graduações');

-- Admin
select tests.authenticate_as(:'gestor');
select is((select count(*)::int from public.martial_arts), 12, 'admin vê modalidades inativas');
select lives_ok($$ insert into public.martial_arts (slug, name, has_ranks) values ('sumo', 'Sumô', false) $$,
  'admin cria modalidade');
select ok(
  (select count(*) from public.admin_audit_log where target_type = 'martial_arts' and actor_id = :'gestor') = 1,
  'mudança do admin registrada na auditoria'
);

select * from finish();
rollback;
