begin;
\ir _helpers.psql

select plan(31);

-- ---------------------------------------------------------------------------
-- Cadastro: idade, termos e formato do username
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ select tests.create_user('menor', (current_date - interval '18 years' + interval '1 day')::date) $$,
  '23514', 'age_requirement_not_met',
  'menor de 18 anos não consegue criar conta'
);

select lives_ok(
  $$ select tests.create_user('fez18hoje', (current_date - interval '18 years')::date) $$,
  'quem faz 18 anos hoje consegue criar conta'
);

select throws_ok(
  $$ select tests.create_user('semtermos', '1990-01-01', false) $$,
  '23514', 'terms_not_accepted',
  'cadastro sem aceite dos termos é recusado'
);

select throws_ok(
  $$ select tests.create_user('Nome Invalido') $$,
  '23514', null,
  'username fora do padrão é recusado'
);

select tests.create_user('alice') as alice \gset
select tests.create_user('bruno') as bruno \gset

select is((select count(*)::int from public.profiles where id = :'alice'), 1, 'trigger cria o perfil');
select is((select theme::text from public.user_settings where user_id = :'alice'), 'system', 'tema padrão é automático');
select isnt((select terms_accepted_at from public.user_settings where user_id = :'alice'), null, 'aceite dos termos registrado');

select throws_ok(
  $$ select tests.create_user('ALICE') $$,
  '23505', null,
  'username é único sem diferenciar maiúsculas'
);

select is(public.is_username_available('alice'), false, 'is_username_available: ocupado');
select is(public.is_username_available('carla_99'), true, 'is_username_available: livre');
select is(public.is_username_available('ab'), false, 'is_username_available: formato inválido');

-- ---------------------------------------------------------------------------
-- Visitante (anon)
-- ---------------------------------------------------------------------------
select tests.as_anon();

select ok((select count(*) from public.profiles where id in (:'alice', :'bruno')) = 2, 'visitante vê perfis ativos');
select throws_ok($$ select * from public.user_settings $$, '42501', null, 'visitante não lê configurações');
select throws_ok($$ select public.delete_my_account() $$, '42501', null, 'visitante não executa delete_my_account');

-- ---------------------------------------------------------------------------
-- Usuário A não altera dados de B, nem colunas protegidas
-- ---------------------------------------------------------------------------
select tests.authenticate_as(:'alice');

select lives_ok($$ update public.profiles set display_name = 'Alice Silva', bio = 'Faixa azul' where id = auth.uid() $$,
  'dono edita o próprio perfil');
update public.profiles set display_name = 'Hackeado' where id = :'bruno';
select is((select count(*)::int from public.user_settings), 1, 'usuário só enxerga as próprias configurações');
update public.user_settings set theme = 'dark' where user_id = :'bruno';
select lives_ok($$ update public.user_settings set theme = 'dark' where user_id = auth.uid() $$, 'dono troca o tema');

select throws_ok($$ update public.profiles set status = 'active' where id = auth.uid() $$, '42501', null,
  'usuário não altera o próprio status');
select throws_ok($$ update public.profiles set follower_count = 9999 where id = auth.uid() $$, '42501', null,
  'usuário não altera contadores');
select throws_ok($$ update public.user_settings set birth_date = '1950-01-01' where user_id = auth.uid() $$, '42501', null,
  'usuário não altera a data de nascimento');
select throws_ok($$ insert into public.profiles (id, username, display_name) values (gen_random_uuid(), 'fake', 'Fake') $$,
  '42501', null, 'usuário não insere perfis diretamente');
select throws_ok($$ delete from public.profiles where id = auth.uid() $$, '42501', null,
  'perfil não é apagado por DELETE direto');

select tests.as_postgres();
select is((select display_name from public.profiles where id = :'bruno'), 'Bruno', 'perfil de B continua intacto');
select is((select theme::text from public.user_settings where user_id = :'bruno'), 'system', 'tema de B continua intacto');
select is((select theme::text from public.user_settings where user_id = :'alice'), 'dark', 'tema de A foi salvo');

-- ---------------------------------------------------------------------------
-- Conta suspensa some para o público
-- ---------------------------------------------------------------------------
update public.profiles set status = 'suspended' where id = :'bruno';
select tests.as_anon();
select is((select count(*)::int from public.profiles where id = :'bruno'), 0, 'perfil suspenso fica oculto para visitantes');
select tests.authenticate_as(:'bruno');
select is((select count(*)::int from public.profiles where id = :'bruno'), 1, 'dono suspenso ainda vê o próprio perfil');

-- ---------------------------------------------------------------------------
-- Exclusão de conta (LGPD)
-- ---------------------------------------------------------------------------
select tests.authenticate_as(:'alice');
select lives_ok($$ select public.delete_my_account() $$, 'usuário exclui a própria conta');

select tests.as_postgres();
select is((select count(*)::int from auth.users where id = :'alice'), 0, 'auth.users removido');
select is((select count(*)::int from public.profiles where id = :'alice'), 0, 'perfil removido em cascata');
select is((select count(*)::int from public.user_settings where user_id = :'alice'), 0, 'configurações removidas em cascata');

select * from finish();
rollback;
