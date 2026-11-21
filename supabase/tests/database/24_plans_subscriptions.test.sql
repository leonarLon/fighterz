begin;
\ir _helpers.psql

select plan(37);

-- Fase 6 da evolução comercial: planos, assinaturas, benefícios no banco e professores gratuitos.
select tests.create_user('ps_admin') as adm \gset
select tests.create_user('ps_dono') as dono \gset
select tests.create_user('ps_prof') as prof \gset
select tests.create_user('ps_outro') as outro \gset
select tests.as_postgres();
insert into public.user_roles (user_id, role) values (:'adm', 'admin');

select tests.authenticate_as(:'dono');
select public.create_academy('Academia Plano') as slug_a \gset
select id as acad from public.academies where slug = :'slug_a' \gset
select public.create_business('Loja Plano', 'store') as slug_b \gset
select id as biz from public.businesses where slug = :'slug_b' \gset

-- ---------------------------------------------------------------- planos: só admin escreve
select tests.authenticate_as(:'dono');
select throws_ok($$ insert into public.plans (slug, name) values ('hack', 'Plano grátis') $$, '42501', null, 'usuário não cria plano');
select tests.authenticate_as(:'adm');
select lives_ok($$ insert into public.plans (slug, name, price_label, audience) values ('teste-academia-mais', 'Academia Mais', 'R$ 49/mês (referência)', 'academy') $$,
  'admin cria plano de academia');
select id as plano_acad from public.plans where slug = 'teste-academia-mais' \gset
select lives_ok($$ insert into public.plans (slug, name, audience) values ('teste-pagina-pro', 'Página Pro', 'business') $$, 'admin cria plano de página');
select id as plano_biz from public.plans where slug = 'teste-pagina-pro' \gset
select lives_ok(format($$ insert into public.plan_features (plan_id, feature_key, value) values (%L, 'gallery_photos', 40), (%L, 'featured_listing', 1) $$, :'plano_acad', :'plano_acad'),
  'admin define benefícios');
select lives_ok(format($$ insert into public.plan_features (plan_id, feature_key, value) values (%L, 'catalog_items', 100), (%L, 'active_promotions', 15) $$, :'plano_biz', :'plano_biz'),
  'benefícios do plano de página');
select throws_ok(format($$ insert into public.plan_features (plan_id, feature_key, value) values (%L, 'ilimitado', 1) $$, :'plano_acad'),
  '23514', null, 'benefício desconhecido é recusado');
select tests.authenticate_as(:'dono');
select is_empty(format($$ update public.plan_features set value = 9999 where plan_id = %L returning plan_id $$, :'plano_acad'),
  'usuário não altera benefício');
select tests.as_anon();
select is((select count(*)::int from public.plans where slug in ('teste-academia-mais', 'teste-pagina-pro')), 2, 'visitante vê os planos ativos');
select tests.as_postgres();
select is((select count(*)::int from public.admin_audit_log where target_type in ('plans', 'plan_features') and actor_id = :'adm'), 6, 'mudanças em planos ficam na auditoria');

-- ---------------------------------------------------------------- sem plano: limites padrão
select is(public.academy_gallery_limit(:'acad'), 12, 'sem plano: galeria 12');
select is(public.business_catalog_limit(:'biz'), 30, 'sem plano: catálogo 30');
select is(public.business_promotions_limit(:'biz'), 5, 'sem plano: promoções 5');

-- ---------------------------------------------------------------- assinaturas: só admin
select tests.authenticate_as(:'dono');
select throws_ok(format($$ select public.admin_create_subscription(%L, %L) $$, :'plano_acad', :'acad'),
  '42501', 'not_admin', 'dono não se dá plano');
select throws_ok(format($$ insert into public.subscriptions (plan_id, academy_id) values (%L, %L) $$, :'plano_acad', :'acad'),
  '42501', null, 'ninguém insere assinatura direto');
select tests.authenticate_as(:'adm');
select throws_ok(format($$ select public.admin_create_subscription(%L, %L) $$, :'plano_biz', :'acad'),
  '22023', 'plan_audience_mismatch', 'plano de página não vai para academia');
select public.admin_create_subscription(:'plano_acad', :'acad', null, null, null, 'Parceria de lançamento') as sub_a \gset
select is((select status::text from public.subscriptions where id = :'sub_a'), 'active', 'admin associa plano à academia');
select throws_ok(format($$ select public.admin_create_subscription(%L, %L) $$, :'plano_acad', :'acad'),
  '23505', 'subscription_exists', 'uma assinatura aberta por academia');
select is(public.academy_gallery_limit(:'acad'), 40, 'com plano: galeria 40 (verificado no banco)');
select ok(:'acad'::uuid in (select public.featured_entities('academy')), 'academia com plano aparece em destaque');
select public.admin_create_subscription(:'plano_biz', null, :'biz') as sub_b \gset
select is(public.business_catalog_limit(:'biz'), 100, 'com plano: catálogo 100');

-- ---------------------------------------------------------------- suspensão, reativação, troca, cancelamento
select throws_ok(format($$ select public.admin_set_subscription_status(%L, 'suspended', '') $$, :'sub_a'),
  '22023', 'reason_required', 'suspender exige motivo');
select lives_ok(format($$ select public.admin_set_subscription_status(%L, 'suspended', 'Pendência com a equipe') $$, :'sub_a'), 'admin suspende');
select is(public.academy_gallery_limit(:'acad'), 12, 'assinatura suspensa não dá benefício');
select lives_ok(format($$ select public.admin_set_subscription_status(%L, 'active', 'Resolvido') $$, :'sub_a'), 'admin reativa');
select is(public.academy_gallery_limit(:'acad'), 40, 'reativada volta o benefício');
select lives_ok(format($$ select public.admin_change_subscription(%L, %L, current_date + 30, 'Renovação por 30 dias') $$, :'sub_a', :'plano_acad'),
  'admin renova a validade');
select lives_ok(format($$ select public.admin_set_subscription_status(%L, 'cancelled', 'Pedido do dono') $$, :'sub_b'), 'admin cancela');
select throws_ok(format($$ select public.admin_set_subscription_status(%L, 'active', 'voltar') $$, :'sub_b'),
  '22023', 'invalid_transition', 'cancelada não volta (cria-se outra)');
select is(public.business_catalog_limit(:'biz'), 30, 'cancelada volta ao padrão');

-- ---------------------------------------------------------------- expiração automática
select tests.as_postgres();
update public.subscriptions set starts_on = (now() at time zone 'America/Sao_Paulo')::date - 10, ends_on = (now() at time zone 'America/Sao_Paulo')::date - 1 where id = :'sub_a';
select is(public.expire_subscriptions(), 1, 'rotina expira assinatura vencida');
select is((select status::text from public.subscriptions where id = :'sub_a'), 'expired', 'status expirado');
select is((select count(*)::int from public.subscription_events where subscription_id = :'sub_a'), 5,
  'histórico: criada, suspensa, reativada, renovada, expirada');
select throws_ok(format($$ update public.subscription_events set reason = 'apagar rastro' where subscription_id = %L $$, :'sub_a'),
  '42501', 'subscription_events_append_only', 'histórico não pode ser alterado');

-- ---------------------------------------------------------------- quem vê
select tests.authenticate_as(:'dono');
select is((select count(*)::int from public.subscription_cards where academy_id = :'acad'), 1, 'dono vê a assinatura da própria academia');
select tests.authenticate_as(:'outro');
select is((select count(*)::int from public.subscriptions), 0, 'outra pessoa não vê assinaturas');

-- ---------------------------------------------------------------- professores continuam gratuitos
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public'
     and tablename in ('teacher_profiles', 'teacher_martial_arts', 'class_schedules', 'academy_memberships',
                       'rank_promotions', 'training_checkins', 'user_martial_arts')
     and (coalesce(qual, '') ~ '(entitlement|subscription|plan_)' or coalesce(with_check, '') ~ '(entitlement|subscription|plan_)')),
  0, 'nenhuma política de recurso de professor depende de plano');
select tests.authenticate_as(:'prof');
select lives_ok($$ insert into public.teacher_profiles (user_id, professional_name, bio) values (auth.uid(), 'Prof Sem Plano', 'Ensino sem assinatura') $$,
  'professor sem nenhum plano cria o perfil profissional');

select * from finish();
rollback;
