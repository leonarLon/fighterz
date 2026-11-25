begin;
\ir _helpers.psql

select plan(14);

-- Professor aprovado na hora pelo critério de graduação (faixa preta ou equivalente).
select tests.create_user('ta_preta') as preta \gset
select tests.create_user('ta_azul') as azul \gset
select tests.create_user('ta_boxe') as boxe \gset
select tests.create_user('ta_capo') as capo \gset
select tests.create_user('ta_adm') as adm \gset
insert into public.user_roles (user_id, role) values (:'adm', 'admin');

select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset
select id as boxe_art from public.martial_arts where slug = 'boxe' \gset
select id as capoeira from public.martial_arts where slug = 'capoeira' \gset
select id as preta_rank from public.martial_art_ranks where martial_art_id = :'bjj' and track = 'adult' and name = 'Faixa Preta' \gset
select id as azul_rank from public.martial_art_ranks where martial_art_id = :'bjj' and track = 'adult' and name = 'Faixa Azul' \gset
select id as corda_vermelha from public.martial_art_ranks where martial_art_id = :'capoeira' and track = 'adult' and name like 'Corda Vermelha (Professor)%' \gset
select id as corda_marrom from public.martial_art_ranks where martial_art_id = :'capoeira' and track = 'adult' and name like 'Corda Marrom%' \gset

-- Faixa preta: aprovado ao gravar a modalidade.
select tests.authenticate_as(:'preta');
insert into public.teacher_profiles (user_id, professional_name) values (auth.uid(), 'Mestre Preta');
select is((select status::text from public.teacher_profiles where user_id = auth.uid()), 'pending', 'perfil nasce pendente');
insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values (auth.uid(), :'bjj', :'preta_rank');
select is((select status::text from public.teacher_profiles where user_id = auth.uid()), 'approved', 'faixa preta aprova na hora');
select is(public.is_approved_teacher(:'preta'), true, 'vale como professor aprovado');

-- Faixa azul: não grava (abaixo do mínimo) e não aprova.
select tests.authenticate_as(:'azul');
insert into public.teacher_profiles (user_id, professional_name) values (auth.uid(), 'Azul');
select throws_ok(format($$ insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values (auth.uid(), %L, %L) $$, :'bjj', :'azul_rank'),
  '23514', 'rank_below_teacher_min', 'faixa azul não vira professor');
select throws_ok(format($$ insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values (auth.uid(), %L, null) $$, :'bjj'),
  '23514', 'rank_below_teacher_min', 'modalidade com faixa exige a graduação');
select is((select status::text from public.teacher_profiles where user_id = auth.uid()), 'pending', 'continua pendente');
select throws_ok($$ update public.teacher_profiles set status = 'approved' where user_id = auth.uid() $$, '42501', null, 'não se aprova sozinho');

-- Modalidade sem graduação: aprova sem exigência.
select tests.authenticate_as(:'boxe');
insert into public.teacher_profiles (user_id, professional_name) values (auth.uid(), 'Coach Boxe');
insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values (auth.uid(), :'boxe_art', null);
select is((select status::text from public.teacher_profiles where user_id = auth.uid()), 'approved', 'boxe (sem faixa) aprova');

-- Capoeira: a partir da Corda Vermelha (Professor).
select tests.authenticate_as(:'capo');
insert into public.teacher_profiles (user_id, professional_name) values (auth.uid(), 'Mestre Capoeira');
select throws_ok(format($$ insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values (auth.uid(), %L, %L) $$, :'capoeira', :'corda_marrom'),
  '23514', 'rank_below_teacher_min', 'corda marrom (instrutor) não basta');
insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values (auth.uid(), :'capoeira', :'corda_vermelha');
select is((select status::text from public.teacher_profiles where user_id = auth.uid()), 'approved', 'corda vermelha (professor) aprova');

-- Tirar a única modalidade volta a pendente.
delete from public.teacher_martial_arts where teacher_id = auth.uid();
select is((select status::text from public.teacher_profiles where user_id = auth.uid()), 'pending', 'sem modalidade volta a pendente');

-- Revogação do admin não se desfaz editando as modalidades.
select tests.authenticate_as(:'adm');
select lives_ok(format($$ select public.review_teacher(%L, 'revoked', 'Teste de revogação') $$, :'preta'), 'admin revoga');
select tests.authenticate_as(:'preta');
delete from public.teacher_martial_arts where teacher_id = auth.uid();
insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values (auth.uid(), :'bjj', :'preta_rank');
select is((select status::text from public.teacher_profiles where user_id = auth.uid()), 'revoked', 'revogado continua revogado');
select tests.authenticate_as(:'adm');
select lives_ok(format($$ select public.review_teacher(%L, 'approved', null) $$, :'preta'), 'admin reativa');

select * from finish();
rollback;
