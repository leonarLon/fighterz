begin;
\ir _helpers.psql

select plan(24);

select tests.create_user('autora') as autora \gset
select tests.create_user('fan') as fan \gset
select tests.create_user('estranho') as estranho \gset
insert into public.follows (follower_id, following_id) values (:'fan', :'autora');

select tests.create_post(:'autora', 'público', 'public') as pub \gset
select tests.create_post(:'autora', 'só seguidores', 'followers') as seg \gset
select tests.create_post(:'autora', 'privado', 'private') as priv \gset

-- Visitante
select tests.as_anon();
select is((select count(*)::int from public.posts where author_id = :'autora'), 1, 'visitante vê só o post público');
select throws_ok($$ insert into public.posts (author_id, caption) values (gen_random_uuid(), 'x') $$, '42501', null,
  'visitante não publica');

-- Seguidor, estranho e autora
select tests.authenticate_as(:'fan');
select is((select count(*)::int from public.posts where author_id = :'autora'), 2, 'seguidor vê público + seguidores');
select tests.authenticate_as(:'estranho');
select is((select count(*)::int from public.posts where author_id = :'autora'), 1, 'não seguidor vê só o público');
select tests.authenticate_as(:'autora');
select is((select count(*)::int from public.posts where author_id = :'autora'), 3, 'autora vê todos os seus');

-- Perfil privado esconde até os posts "públicos" de quem não segue
select tests.as_postgres();
update public.profiles set is_private = true where id = :'autora';
select tests.authenticate_as(:'estranho');
select is((select count(*)::int from public.posts where author_id = :'autora'), 0, 'perfil privado: não seguidor não vê nada');
select tests.authenticate_as(:'fan');
select is((select count(*)::int from public.posts where author_id = :'autora'), 2, 'perfil privado: seguidor continua vendo');
select tests.as_postgres();
update public.profiles set is_private = false where id = :'autora';

-- Bloqueio esconde os posts nos dois sentidos
insert into public.blocked_users (blocker_id, blocked_id) values (:'autora', :'estranho');
select tests.authenticate_as(:'estranho');
select is((select count(*)::int from public.posts where author_id = :'autora'), 0, 'bloqueado não vê posts de quem bloqueou');
select tests.as_postgres();
delete from public.blocked_users;

-- Edição e exclusão só pelo autor
select tests.authenticate_as(:'estranho');
update public.posts set caption = 'invadido' where id = :'pub';
select throws_ok(format($$ update public.posts set like_count = 999 where id = %L $$, :'pub'), '42501', null,
  'contadores não são editáveis');
select throws_ok(format($$ update public.posts set author_id = %L where id = %L $$, :'estranho', :'pub'), '42501', null,
  'autor não pode ser trocado');
select tests.as_postgres();
select is((select caption from public.posts where id = :'pub'), 'público', 'estranho não edita post alheio');

select tests.authenticate_as(:'autora');
select lives_ok(format($$ select public.delete_post(%L) $$, :'priv'), 'autora apaga o próprio post');
select throws_ok(format($$ update public.posts set deleted_at = now() where id = %L $$, :'pub'), '42501', null, 'soft delete só pela função dedicada');
select tests.as_postgres();
select ok((select deleted_at > now() - interval '1 minute' from public.posts where id = :'priv'), 'soft delete usa o horário do servidor');
select is((select post_count from public.profiles where id = :'autora'), 2, 'post_count desconta post apagado');
select tests.authenticate_as(:'autora');
select is((select count(*)::int from public.posts where id = :'priv'), 0, 'post apagado some até para a autora');

-- create_post: valida conteúdo, mídia e marcações
select tests.authenticate_as(:'autora');
select throws_ok($$ select public.create_post(gen_random_uuid(), '   ') $$, '23514', 'empty_post', 'post vazio é recusado');
select throws_ok(
  format($$ select public.create_post(gen_random_uuid(), 'x', 'public', null, null, '[{"path":"%s/outro/foto.webp"}]') $$, :'estranho'),
  '22023', 'invalid_media_path', 'não dá para anexar arquivo de outra pessoa'
);

select gen_random_uuid() as novo \gset
select tests.as_postgres();
insert into storage.objects (bucket_id, name, owner_id) values ('post-media', :'autora' || '/' || :'novo' || '/0.webp', :'autora');
select tests.authenticate_as(:'autora');
select lives_ok(
  format($$ select public.create_post(%L, 'treino com @fan e @estranho e @inexistente', 'public', null, 'Curitiba',
           '[{"path":"%s/%s/0.webp","width":1200,"height":900,"alt":"Rolando no tatame"}]') $$, :'novo', :'autora', :'novo'),
  'create_post com imagem e marcações'
);
select is((select count(*)::int from public.post_media where post_id = :'novo'), 1, 'mídia registrada');
select is((select count(*)::int from public.post_mentions where post_id = :'novo' and status = 'pending'), 2,
  'marcações de usuários existentes, pendentes');

-- Marcação só aparece publicamente depois de aprovada
select tests.authenticate_as(:'estranho');
select is((select jsonb_array_length(mentions) from public.post_cards where id = :'novo'), 0, 'marcação pendente não aparece');
select lives_ok(format($$ update public.post_mentions set status = 'approved' where post_id = %L and user_id = auth.uid() $$, :'novo'),
  'marcado aprova');
select tests.as_anon();
select is((select mentions from public.post_cards where id = :'novo'), '["estranho"]'::jsonb, 'marcação aprovada aparece para todos');

select * from finish();
rollback;
