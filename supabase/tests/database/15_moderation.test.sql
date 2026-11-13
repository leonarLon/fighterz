begin;
\ir _helpers.psql

select plan(37);

select tests.create_user('mod_m') as moder \gset
select tests.create_user('adm_m') as adm \gset
select tests.create_user('autor_m') as autor \gset
select tests.create_user('fa_m') as fa \gset
select tests.create_user('den1_m') as d1 \gset
select tests.create_user('den2_m') as d2 \gset
insert into public.user_roles (user_id, role) values (:'moder', 'moderator'), (:'adm', 'admin');
select tests.create_post(:'autor', 'post denunciado', 'public') as post \gset
select tests.create_post(:'autor', 'post para seguidores', 'followers') as fpost \gset
insert into public.follows (follower_id, following_id) values (:'fa', :'autor');
insert into public.academies (name, created_by) values ('Academia Moderada', :'autor') returning id as acad \gset

-- ---------------------------------------------------------------- denúncias e fila
select tests.authenticate_as(:'d1');
select lives_ok(format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'post', %L, 'minor_safety') $$, :'post'),
  'denuncia post');
select lives_ok(format($$ insert into public.reports (reporter_id, target_type, target_id, reason, details) values (auth.uid(), 'academy', %L, 'impersonation', 'Usa o nome de outra') $$, :'acad'),
  'academia pode ser denunciada');
select throws_ok(format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'event', %L, 'spam') $$, gen_random_uuid()),
  'P0002', 'report_target_not_found', 'alvo precisa existir');
select tests.authenticate_as(:'d2');
select lives_ok(format($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'post', %L, 'spam') $$, :'post'),
  'segunda denúncia');

select throws_ok($$ select * from public.get_report_queue() $$, '42501', 'forbidden', 'usuário comum não vê a fila');
select is((select count(*)::int from public.reports where reporter_id <> auth.uid()), 0, 'usuário só vê as próprias denúncias');

select tests.authenticate_as(:'moder');
select results_eq(
  format($$ select target_type::text, report_count, priority, owner_username from public.get_report_queue() where target_id = %L $$, :'post'),
  $$ values ('post'::text, 2, true, 'autor_m'::text) $$,
  'fila agrupa por alvo e prioriza minor_safety'
);
-- O seed local também tem denúncias: a regra é "prioritárias antes de qualquer não prioritária".
select is(
  (select bool_and(prev_priority or not priority)
   from (select priority, lag(priority, 1, true) over () as prev_priority from public.get_report_queue()) q),
  true,
  'minor_safety vem antes das demais'
);
select is((public.get_admin_overview() ->> 'open_reports')::int >= 2, true, 'visão geral conta denúncias abertas');

-- ---------------------------------------------------------------- remover e restaurar
select throws_ok(format($$ select public.moderate_content('post', %L, true, '') $$, :'post'), '23514', 'reason_required', 'motivo obrigatório');
select lives_ok(format($$ select public.moderate_content('post', %L, true, 'Exposição de menor') $$, :'post'), 'moderador remove');
select is((select moderation_status::text from public.posts where id = :'post'), 'removed', 'post removido');
select is((select count(*)::int from public.reports where target_id = :'post' and status = 'resolved'), 2, 'denúncias do alvo resolvidas');
select is((select count(*)::int from public.moderation_actions where target_id = :'post' and action = 'remove_content'), 1, 'ação registrada no histórico');

select tests.as_postgres();
select results_eq(
  format($$ select type::text, actor_id, post_id from public.notifications where recipient_id = %L and type = 'moderation' $$, :'autor'),
  format($$ values ('moderation'::text, null::uuid, %L::uuid) $$, :'post'),
  'autor é avisado, sem expor o moderador'
);

select tests.authenticate_as(:'fa');
select is((select count(*)::int from public.post_cards where id = :'post'), 0, 'post removido some para os outros');
select tests.authenticate_as(:'autor');
select is((select count(*)::int from public.post_cards where id = :'post'), 1, 'autor ainda vê o próprio post removido');

select tests.authenticate_as(:'moder');
select lives_ok(format($$ select public.close_reports('academy', %L, true, 'Nome legítimo') $$, :'acad'), 'descarta denúncia improcedente');
select is((select status::text from public.reports where target_id = :'acad'), 'dismissed', 'denúncia descartada');

-- Histórico é append-only
select throws_ok($$ insert into public.moderation_actions (target_type, target_id, action) values ('post', gen_random_uuid(), 'warn') $$,
  '42501', null, 'ninguém insere direto no histórico');
select throws_ok($$ delete from public.moderation_actions $$, '42501', null, 'ninguém apaga o histórico');
select throws_ok($$ update public.moderation_actions set reason = 'x' $$, '42501', null, 'ninguém altera o histórico');

-- ---------------------------------------------------------------- suspensão
select throws_ok(format($$ select public.suspend_user(%L, 60, 'Spam') $$, :'autor'), '42501', 'admin_only', 'moderador suspende no máximo 30 dias');
select throws_ok(format($$ select public.suspend_user(%L, null, 'Spam') $$, :'autor'), '42501', 'admin_only', 'banimento é de admin');
select throws_ok(format($$ select public.suspend_user(%L, 3, 'Teste') $$, :'adm'), '42501', 'cannot_moderate_peer', 'moderador não suspende admin');
select lives_ok(format($$ select public.suspend_user(%L, 7, 'Spam repetido') $$, :'autor'), 'moderador suspende por 7 dias');

select tests.as_postgres();
select ok((select banned_until between now() + interval '6 days' and now() + interval '8 days' from auth.users where id = :'autor'),
  'login bloqueado no Auth até o fim do prazo');

select tests.as_anon();
select is((select count(*)::int from public.profiles where id = :'autor'), 0, 'perfil suspenso some');
select tests.authenticate_as(:'fa');
select is((select count(*)::int from public.post_cards where id = :'fpost'), 0, 'posts para seguidores também somem');

select tests.authenticate_as(:'autor');
select throws_ok($$ insert into public.posts (author_id, caption) values (auth.uid(), 'ainda posto?') $$, '42501', 'account_suspended',
  'conta suspensa não escreve, mesmo com JWT válido');
select results_eq($$ select status::text, suspension_reason from public.profiles where id = auth.uid() $$,
  $$ values ('suspended'::text, 'Spam repetido'::text) $$, 'o próprio usuário vê o motivo');

-- Prazo vencido: a rotina agendada reativa
select tests.as_postgres();
update public.profiles set suspended_until = now() - interval '1 minute' where id = :'autor';
select is(public.lift_expired_suspensions(), 1, 'rotina reativa suspensões vencidas');
select is((select status::text from public.profiles where id = :'autor'), 'active', 'perfil ativo de novo');
select is((select banned_until from auth.users where id = :'autor'), null, 'login liberado');

-- Banimento só admin desfaz
select tests.authenticate_as(:'adm');
select lives_ok(format($$ select public.suspend_user(%L, null, 'Assédio grave') $$, :'autor'), 'admin bane');
select tests.authenticate_as(:'moder');
select throws_ok(format($$ select public.unsuspend_user(%L) $$, :'autor'), '42501', 'admin_only', 'moderador não desfaz banimento');

-- ---------------------------------------------------------------- configurações
select tests.as_postgres();
update public.platform_settings set signups_open = false;
select throws_ok($$ select tests.create_user('tarde_demais') $$, '42501', 'signups_closed', 'cadastro fechado barra novos usuários');

select * from finish();
rollback;
