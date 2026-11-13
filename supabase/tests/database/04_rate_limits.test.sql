begin;
\ir _helpers.psql

select plan(8);

select tests.create_user('apressado') as u \gset

select is(public.check_rate_limit('teste:1', 3, interval '1 hour'), true, '1ª tentativa dentro do limite');
select is(public.check_rate_limit('teste:1', 3, interval '1 hour'), true, '2ª tentativa dentro do limite');
select is(public.check_rate_limit('teste:1', 3, interval '1 hour'), true, '3ª tentativa dentro do limite');
select is(public.check_rate_limit('teste:1', 3, interval '1 hour'), false, '4ª tentativa bloqueada');
select is(public.check_rate_limit('teste:2', 3, interval '1 hour'), true, 'chaves são independentes');
select throws_ok($$ select public.enforce_rate_limit('teste:1', 3, interval '1 hour') $$, 'P0429', 'rate_limit_exceeded',
  'enforce_rate_limit interrompe a operação');

select tests.authenticate_as(:'u');
select throws_ok($$ select public.check_rate_limit('post:alguem', 1, interval '1 hour') $$, '42501', null,
  'cliente não chama check_rate_limit diretamente');
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'cliente não lê rate_limits');

select * from finish();
rollback;
