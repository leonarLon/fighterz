begin;
\ir _helpers.psql

select plan(23);

select tests.create_user('ana') as ana \gset
select tests.create_user('beto') as beto \gset
select tests.create_user('caio') as caio \gset
update public.profiles set is_private = true where id = :'caio';

-- Seguir perfil público: aceito na hora, contadores atualizados
select tests.authenticate_as(:'ana');
select lives_ok(format($$ insert into public.follows (follower_id, following_id) values (%L, %L) $$, :'ana', :'beto'),
  'ana segue beto');
select is((select status::text from public.follows where follower_id = :'ana' and following_id = :'beto'), 'accepted',
  'perfil público: follow aceito');
select throws_ok(format($$ insert into public.follows (follower_id, following_id) values (%L, %L) $$, :'beto', :'caio'),
  '42501', null, 'não dá para criar follow em nome de outra pessoa');
select throws_ok(format($$ insert into public.follows (follower_id, following_id) values (%L, %L) $$, :'ana', :'ana'),
  '23514', null, 'não dá para seguir a si mesmo');

-- Perfil privado: vira solicitação; o cliente não força status
select throws_ok(format($$ insert into public.follows (follower_id, following_id, status) values (%L, %L, 'accepted') $$, :'ana', :'caio'),
  '42501', null, 'cliente não envia status');
select lives_ok(format($$ insert into public.follows (follower_id, following_id) values (%L, %L) $$, :'ana', :'caio'),
  'ana pede para seguir caio');
select is((select status::text from public.follows where follower_id = :'ana' and following_id = :'caio'), 'pending',
  'perfil privado: solicitação pendente');
update public.follows set status = 'accepted' where follower_id = :'ana' and following_id = :'caio';

select tests.as_postgres();
select is((select status::text from public.follows where follower_id = :'ana' and following_id = :'caio'), 'pending',
  'quem pediu não aprova a própria solicitação');
select is((select follower_count from public.profiles where id = :'beto'), 1, 'beto tem 1 seguidor');
select is((select following_count from public.profiles where id = :'ana'), 1, 'pendente não conta em following');

-- Visibilidade da solicitação pendente
select tests.authenticate_as(:'beto');
select is((select count(*)::int from public.follows where following_id = :'caio'), 0, 'terceiros não veem solicitações pendentes');

select tests.authenticate_as(:'caio');
select is((select count(*)::int from public.notifications where type = 'follow_request'), 1, 'caio foi notificado da solicitação');
select lives_ok(format($$ update public.follows set status = 'accepted' where follower_id = %L and following_id = %L $$, :'ana', :'caio'),
  'caio aceita');
select is((select count(*)::int from public.notifications where type = 'follow_request'), 0, 'notificação de solicitação some ao aceitar');

select tests.as_postgres();
select is((select follower_count from public.profiles where id = :'caio'), 1, 'aceitar conta como seguidor');

-- Bloqueio desfaz follows e impede novo follow
select tests.authenticate_as(:'beto');
select lives_ok(format($$ insert into public.blocked_users (blocker_id, blocked_id) values (%L, %L) $$, :'beto', :'ana'),
  'beto bloqueia ana');
select tests.as_postgres();
select is((select count(*)::int from public.follows where follower_id = :'ana' and following_id = :'beto'), 0,
  'bloqueio remove o follow');
select is((select follower_count from public.profiles where id = :'beto'), 0, 'contador volta a zero');

select tests.authenticate_as(:'ana');
select throws_ok(format($$ insert into public.follows (follower_id, following_id) values (%L, %L) $$, :'ana', :'beto'),
  '42501', 'blocked', 'bloqueada não segue quem bloqueou');
select is((select count(*)::int from public.profiles where id = :'beto'), 0, 'quem me bloqueou some da minha busca de perfis');
select is((select count(*)::int from public.blocked_users), 0, 'ana não vê bloqueios feitos por outros');

select tests.authenticate_as(:'beto');
select is((select count(*)::int from public.profiles where id = :'ana'), 1, 'quem bloqueou ainda vê o perfil (para desbloquear)');

-- Privado vira público: pendentes são aceitos
select tests.as_postgres();
insert into public.follows (follower_id, following_id) values (:'beto', :'caio');
update public.profiles set is_private = false where id = :'caio';
select is((select status::text from public.follows where follower_id = :'beto' and following_id = :'caio'), 'accepted',
  'ao abrir o perfil, solicitações pendentes são aceitas');

select * from finish();
rollback;
