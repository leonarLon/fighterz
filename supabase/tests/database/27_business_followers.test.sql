begin;
\ir _helpers.psql

select plan(14);

-- Seguir páginas comerciais, foto nos itens do catálogo e análise única dos posts antigos.
select tests.create_user('bf_dono') as dono \gset
select tests.create_user('bf_fa') as fa \gset
select tests.create_user('bf_outro') as outro \gset

select tests.authenticate_as(:'dono');
select public.create_business('Loja Seguida', 'store') as slug \gset
select id as biz from public.businesses where slug = :'slug' \gset
select gen_random_uuid() as post \gset
select public.create_page_post(:'biz', :'post', 'Novidade da loja para quem segue');
set constraints all immediate;
set constraints all deferred;

-- ---------------------------------------------------------------- seguir
select tests.as_anon();
select throws_ok(format($$ insert into public.business_followers (business_id, user_id) values (%L, gen_random_uuid()) $$, :'biz'),
  '42501', null, 'visitante não segue');
select tests.authenticate_as(:'fa');
select lives_ok(format($$ insert into public.business_followers (business_id, user_id) values (%L, auth.uid()) $$, :'biz'), 'pessoa segue a página');
select throws_ok(format($$ insert into public.business_followers (business_id, user_id) values (%L, %L) $$, :'biz', :'outro'),
  '42501', null, 'não segue em nome de outra pessoa');
select is((select follower_count from public.businesses where id = :'biz'), 1, 'contador de seguidores sobe');
select tests.authenticate_as(:'outro');
select is((select count(*)::int from public.business_followers where business_id = :'biz'), 0, 'lista de seguidores não é pública');

-- ---------------------------------------------------------------- feed
select tests.authenticate_as(:'fa');
select is((select count(*)::int from public.get_home_feed() where id = :'post'), 1, 'post da página entra no Início de quem segue');
select tests.authenticate_as(:'outro');
select is((select count(*)::int from public.get_home_feed() where id = :'post'), 0, 'quem não segue não recebe');
select tests.authenticate_as(:'dono');
select lives_ok(format($$ update public.businesses set status = 'hidden' where id = %L $$, :'biz'), 'dono oculta a página');
select tests.authenticate_as(:'fa');
select is((select count(*)::int from public.get_home_feed() where id = :'post'), 0, 'página oculta sai do Início');
select lives_ok(format($$ delete from public.business_followers where business_id = %L and user_id = auth.uid() $$, :'biz'), 'deixa de seguir');
select tests.as_postgres();
select is((select follower_count from public.businesses where id = :'biz'), 0, 'contador desce');

-- ---------------------------------------------------------------- foto no item do catálogo
select tests.authenticate_as(:'dono');
insert into storage.objects (bucket_id, name, owner_id) values ('covers', format('business/%s/item-foto123.webp', :'biz'), :'dono');
select lives_ok(format($$ insert into public.business_items (business_id, name, image_path) values (%L, 'Com foto', 'business/%s/item-foto123.webp') $$, :'biz', :'biz'),
  'item com foto enviada');
select throws_ok(format($$ insert into public.business_items (business_id, name, image_path) values (%L, 'Sem arquivo', 'business/%s/item-naoenv1.webp') $$, :'biz', :'biz'),
  '22023', 'cover_not_uploaded', 'foto que não foi enviada é recusada');

-- ---------------------------------------------------------------- análise única dos posts antigos
select tests.as_postgres();
select tests.create_post(:'outro', 'Kimono por R$ 299, chama no direct! Cupom TATAME10', 'public', now() - interval '3 days') as antigo \gset
set constraints all immediate;
set constraints all deferred;
delete from public.commercial_signals where post_id = :'antigo';  -- simula post de antes da detecção
select public.backfill_commercial_signals();
select is((select count(*)::int from public.commercial_signals where post_id = :'antigo'), 3, 'análise única registra os sinais do post antigo');

select * from finish();
rollback;
