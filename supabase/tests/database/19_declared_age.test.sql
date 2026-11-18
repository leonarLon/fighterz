begin;
\ir _helpers.psql

select plan(9);

-- Cadastro com idade (fluxo atual do formulário).
create function tests.signup_with_age(p_username text, p_age jsonb) returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
          p_username || '@test.local',
          jsonb_build_object('username', p_username, 'display_name', p_username, 'age', p_age, 'accepted_terms', true),
          now(), now());
  return v_id;
end;
$$;

select lives_ok($$ select tests.signup_with_age('idade30', '30') $$, 'idade 30 cria a conta');
select is((select declared_age from public.user_settings s join public.profiles p on p.id = s.user_id where p.username = 'idade30'),
          30::smallint, 'grava a idade declarada');
select is((select birth_date from public.user_settings s join public.profiles p on p.id = s.user_id where p.username = 'idade30'),
          null, 'sem data de nascimento');
select lives_ok($$ select tests.signup_with_age('idade18', '"18"') $$, 'idade 18 (texto) é aceita');
select throws_ok($$ select tests.signup_with_age('idade17', '17') $$, '23514', 'age_requirement_not_met', 'menor de 18 é recusado');
select throws_ok($$ select tests.signup_with_age('idade121', '121') $$, '22023', 'invalid_age', 'idade acima de 120 é recusada');
select throws_ok($$ select tests.signup_with_age('idadefrac', '18.5') $$, '22023', 'invalid_age', 'idade fracionada é recusada');

-- Caminho antigo (data de nascimento) continua valendo para seed e testes.
select lives_ok($$ select tests.create_user('comdata') $$, 'cadastro com data de nascimento continua funcionando');

-- A idade não pode ser alterada pelo dono depois do cadastro.
select tests.authenticate_as((select id from public.profiles where username = 'idade30'));
select throws_ok($$ update public.user_settings set declared_age = 50 where user_id = auth.uid() $$, '42501', null,
                 'usuário não altera a idade declarada');

select * from finish();
rollback;
