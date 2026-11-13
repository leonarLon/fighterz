begin;
\ir _helpers.psql

select plan(21);

select tests.create_user('dona') as dona \gset
select tests.create_user('leitor') as leitor \gset
select tests.create_user('outro') as outro \gset
select tests.create_post(:'dona', 'post público') as post \gset
select tests.create_post(:'dona', 'privado', 'private') as priv \gset

-- Curtidas: idempotentes, impossível duplicar
select tests.authenticate_as(:'leitor');
select lives_ok(format($$ insert into public.post_likes (post_id, user_id) values (%L, %L) $$, :'post', :'leitor'), 'curtir');
select throws_ok(format($$ insert into public.post_likes (post_id, user_id) values (%L, %L) $$, :'post', :'leitor'),
  '23505', null, 'curtida dupla é impossível');
select lives_ok(format($$ insert into public.post_likes (post_id, user_id) values (%L, %L) on conflict do nothing $$, :'post', :'leitor'),
  'upsert idempotente não falha');
select throws_ok(format($$ insert into public.post_likes (post_id, user_id) values (%L, %L) $$, :'post', :'outro'),
  '42501', null, 'não curte em nome de outra pessoa');
select throws_ok(format($$ insert into public.post_likes (post_id, user_id) values (%L, %L) $$, :'priv', :'leitor'),
  '42501', null, 'não curte post que não pode ver');
select is((select like_count from public.posts where id = :'post'), 1, 'like_count = 1');
select ok((select viewer_has_liked from public.post_cards where id = :'post'), 'post_cards marca viewer_has_liked');

delete from public.post_likes where post_id = :'post';
select tests.as_postgres();
select is((select like_count from public.posts where id = :'post'), 0, 'descurtir decrementa');

-- Salvos são privados
select tests.authenticate_as(:'leitor');
insert into public.saved_posts (user_id, post_id) values (:'leitor', :'post');
select tests.authenticate_as(:'dona');
select is((select count(*)::int from public.saved_posts), 0, 'ninguém vê os salvos de outra pessoa');

-- Comentários e respostas (1 nível)
select tests.authenticate_as(:'leitor');
select lives_ok(format($$ insert into public.comments (post_id, author_id, body) values (%L, %L, '  Bom treino!  ') $$, :'post', :'leitor'),
  'comentar');
select id as c1 from public.comments where post_id = :'post' \gset
select is((select body from public.comments where id = :'c1'), 'Bom treino!', 'corpo normalizado');

select tests.authenticate_as(:'outro');
select lives_ok(format($$ insert into public.comments (post_id, author_id, parent_id, body) values (%L, %L, %L, 'Concordo') $$,
  :'post', :'outro', :'c1'), 'responder');
select id as c2 from public.comments where parent_id = :'c1' \gset
select throws_ok(format($$ insert into public.comments (post_id, author_id, parent_id, body) values (%L, %L, %L, 'nível 3') $$,
  :'post', :'outro', :'c2'), '23514', 'invalid_parent_comment', 'resposta de resposta é recusada');

select tests.as_postgres();
select is((select comment_count from public.posts where id = :'post'), 2, 'comment_count = 2');

-- Exclusão: autor do comentário ou dono do post; terceiros não
select tests.authenticate_as(:'outro');
select throws_ok(format($$ select public.delete_comment(%L) $$, :'c1'), 'P0002', null, 'terceiro não apaga comentário alheio');
select throws_ok(format($$ update public.comments set deleted_at = now() where id = %L $$, :'c2'), '42501', null,
  'soft delete só pela função dedicada');
select tests.authenticate_as(:'dona');
select lives_ok(format($$ select public.delete_comment(%L) $$, :'c1'), 'dona do post apaga comentário no seu post');
select is((select count(*)::int from public.comments where id = :'c1'), 0, 'comentário apagado some');
select tests.as_postgres();
select is((select comment_count from public.posts where id = :'post'), 1, 'comment_count desconta apagado');

-- Bloqueio impede interação
insert into public.blocked_users (blocker_id, blocked_id) values (:'dona', :'leitor');
select tests.authenticate_as(:'leitor');
select throws_ok(format($$ insert into public.comments (post_id, author_id, body) values (%L, %L, 'oi') $$, :'post', :'leitor'),
  '42501', null, 'bloqueado não comenta');

-- Rate limit de comentários (60/h)
select tests.as_postgres();
delete from public.blocked_users;
select tests.authenticate_as(:'leitor');
select throws_ok(
  format($$ do $do$ begin for i in 1..61 loop insert into public.comments (post_id, author_id, body) values (%L, %L, 'spam ' || i); end loop; end $do$ $$,
         :'post', :'leitor'),
  'P0429', 'rate_limit_exceeded', 'mais de 60 comentários por hora é bloqueado'
);

select * from finish();
rollback;
