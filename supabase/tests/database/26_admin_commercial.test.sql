begin;
\ir _helpers.psql

select plan(15);

-- Fase 8: páginas comerciais na denúncia, na moderação e no selo; visão geral do painel.
select tests.create_user('ac_dono') as dono \gset
select tests.create_user('ac_denunciante') as den \gset
select tests.create_user('ac_mod') as moder \gset
select tests.create_user('ac_admin') as adm \gset
select tests.as_postgres();
insert into public.user_roles (user_id, role) values (:'moder', 'moderator'), (:'adm', 'admin');

select tests.authenticate_as(:'dono');
select public.create_business('Loja Denunciada', 'store') as slug \gset
select id as biz from public.businesses where slug = :'slug' \gset

-- ---------------------------------------------------------------- denúncia
select tests.authenticate_as(:'den');
select lives_ok(format($$ insert into public.reports (reporter_id, target_type, target_id, reason, details) values (auth.uid(), 'business', %L, 'spam', 'Golpe') $$, :'biz'),
  'qualquer pessoa denuncia uma página');
select throws_ok(format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'business', %L, 'spam') $$, gen_random_uuid()),
  'P0002', 'report_target_not_found', 'página inexistente não é denunciada');

select tests.authenticate_as(:'moder');
select is((select preview from public.get_report_queue() where target_id = :'biz'), 'Loja Denunciada', 'fila mostra o nome da página');
select is((select link from public.get_report_queue() where target_id = :'biz'), '/paginas/' || :'slug', 'fila leva à página');
select is((select owner_id from public.get_report_queue() where target_id = :'biz'), :'dono'::uuid, 'dono da página é o responsável');

-- ---------------------------------------------------------------- suspensão e reativação
select lives_ok(format($$ select public.moderate_content('business', %L, true, 'Golpe confirmado') $$, :'biz'), 'moderação suspende a página');
select is((select status::text from public.businesses where id = :'biz'), 'suspended', 'página suspensa');
select is((select count(*)::int from public.reports where target_id = :'biz' and status = 'resolved'), 1, 'denúncia resolvida');
select tests.as_anon();
select is((select count(*)::int from public.businesses where id = :'biz'), 0, 'visitante não vê página suspensa');
select tests.authenticate_as(:'dono');
select throws_ok(format($$ update public.businesses set status = 'active' where id = %L $$, :'biz'),
  '42501', 'business_status_forbidden', 'dono não reativa página suspensa');
select tests.authenticate_as(:'moder');
select lives_ok(format($$ select public.moderate_content('business', %L, false, 'Revisado') $$, :'biz'), 'moderação reativa');

-- ---------------------------------------------------------------- selo
select throws_ok(format($$ select public.set_business_verified(%L, true) $$, :'biz'), '42501', 'forbidden', 'moderador não dá selo');
select tests.authenticate_as(:'adm');
select lives_ok(format($$ select public.set_business_verified(%L, true) $$, :'biz'), 'admin dá selo de verificada');
select is((select count(*)::int from public.moderation_actions where target_type = 'business' and target_id = :'biz'), 3,
  'suspender, reativar e selo ficam no histórico de moderação');

-- ---------------------------------------------------------------- visão geral
select ok((public.get_admin_overview() ?& array['open_commercial', 'businesses', 'active_subscriptions']), 'visão geral traz os números comerciais');

select * from finish();
rollback;
