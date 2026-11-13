begin;
\ir _helpers.psql

select plan(15);

select tests.create_user('criadora') as criadora \gset
select tests.create_user('fan1') as fan1 \gset
select tests.create_user('fan2') as fan2 \gset
select tests.create_user('fan3') as fan3 \gset
select tests.create_post(:'criadora', 'olha esse treino') as post \gset

-- Curtida gera 1 notificação, mesmo curtindo e descurtindo várias vezes
select tests.authenticate_as(:'fan1');
insert into public.post_likes (post_id, user_id) values (:'post', :'fan1');
delete from public.post_likes where post_id = :'post';
insert into public.post_likes (post_id, user_id) values (:'post', :'fan1');
insert into public.comments (post_id, author_id, body) values (:'post', :'fan1', 'top');
select id as c1 from public.comments where post_id = :'post' \gset

select tests.authenticate_as(:'fan2');
insert into public.comments (post_id, author_id, parent_id, body) values (:'post', :'fan2', :'c1', 'também achei');

select tests.authenticate_as(:'criadora');
select is((select count(*)::int from public.notifications where type = 'like'), 1, 'curtida deduplicada');
select is((select count(*)::int from public.notifications where type = 'comment'), 2, 'dona recebe comentário e resposta no seu post');
select is((select count(*)::int from public.notification_cards where actor_username = 'fan1'), 2, 'notification_cards traz o ator');

select tests.authenticate_as(:'fan1');
select is((select count(*)::int from public.notifications where type = 'reply'), 1, 'autor do comentário recebe a resposta');
select is((select count(*)::int from public.notifications where actor_id = :'fan1'), 0, 'ninguém é notificado da própria ação');

-- Preferência desligada
select tests.as_postgres();
update public.user_settings set notify_likes = false where user_id = :'criadora';
select tests.authenticate_as(:'fan2');
insert into public.post_likes (post_id, user_id) values (:'post', :'fan2');
select tests.authenticate_as(:'criadora');
select is((select count(*)::int from public.notifications where type = 'like'), 1, 'notify_likes = false é respeitado');

-- Privacidade e leitura
select tests.authenticate_as(:'fan2');
update public.notifications set read_at = now() where recipient_id = :'criadora';
select tests.authenticate_as(:'criadora');
select is((select count(*)::int from public.notifications where read_at is null), 3, 'terceiro não marca notificação alheia');
select throws_ok($$ insert into public.notifications (recipient_id, type) values (auth.uid(), 'like') $$, '42501', null,
  'cliente não cria notificações');
select lives_ok($$ select public.mark_all_notifications_read() $$, 'marcar todas como lidas');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'todas lidas');

-- Denúncias
select tests.authenticate_as(:'fan1');
select lives_ok(format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, 'post', %L, 'nudity') $$,
  :'fan1', :'post'), 'denunciar post');
select throws_ok(format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, 'post', %L, 'spam') $$,
  :'fan1', :'post'), '23505', null, 'uma denúncia aberta por pessoa e alvo');
select tests.authenticate_as(:'criadora');
select is((select count(*)::int from public.reports), 0, 'denunciado não vê as denúncias');

select tests.authenticate_as(:'fan2');
insert into public.reports (reporter_id, target_type, target_id, reason) values (:'fan2', 'post', :'post', 'violence');
select tests.authenticate_as(:'fan3');
insert into public.reports (reporter_id, target_type, target_id, reason) values (:'fan3', 'post', :'post', 'minor_safety');
select tests.as_postgres();
select is((select moderation_status::text from public.posts where id = :'post'), 'under_review',
  '3 denúncias graves ocultam o post preventivamente');
select tests.as_anon();
select is((select count(*)::int from public.posts where id = :'post'), 0, 'post em revisão some do público');

select * from finish();
rollback;
