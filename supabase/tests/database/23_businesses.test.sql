begin;
\ir _helpers.psql

select plan(47);

-- Fase 5b da evolução comercial: páginas de marca, loja e serviço.
select tests.create_user('bz_dono') as dono \gset
select tests.create_user('bz_adm') as adm \gset
select tests.create_user('bz_outro') as outro \gset

-- ---------------------------------------------------------------- criação
select tests.authenticate_as(:'dono');
select public.create_business('  Kimonos Faixa Teste  ', 'store') as slug \gset
select is(:'slug'::text, 'kimonos-faixa-teste', 'página criada com slug a partir do nome');
select id as biz from public.businesses where slug = :'slug' \gset
select is((select role::text || '/' || status::text from public.business_members where business_id = :'biz' and user_id = :'dono'),
  'owner/active', 'quem cria é o dono');
select is((select name from public.businesses where id = :'biz'), 'Kimonos Faixa Teste', 'nome sem espaços sobrando');

select tests.as_anon();
select is((select count(*)::int from public.businesses where id = :'biz'), 1, 'visitante vê a página ativa');
select throws_ok($$ select public.create_business('Anônimo', 'brand') $$, '42501', null, 'visitante não cria página');
select throws_ok($$ select * from public.business_members $$, '42501', null, 'visitante não lista membros');
select throws_ok(format($$ insert into public.businesses (slug, name, category) values ('direto', 'Direto', 'brand') $$),
  '42501', null, 'ninguém insere página direto (só pela função)');

-- ---------------------------------------------------------------- edição e status
select tests.authenticate_as(:'outro');
select is_empty(format($$ update public.businesses set description = 'invadido' where id = %L returning id $$, :'biz'),
  'outra pessoa não edita a página');
select is((select count(*)::int from public.business_members where business_id = :'biz'), 0, 'outra pessoa não vê os membros');

select tests.authenticate_as(:'dono');
select lives_ok(format($$ update public.businesses set description = 'Kimonos para treino', city = 'Curitiba', state = 'PR' where id = %L $$, :'biz'),
  'dono edita a página');
select throws_ok(format($$ update public.businesses set status = 'suspended' where id = %L $$, :'biz'),
  '42501', 'business_status_forbidden', 'gestão não suspende a própria página');
select throws_ok(format($$ update public.businesses set is_verified = true where id = %L $$, :'biz'),
  '42501', null, 'gestão não se dá selo de verificada');
select throws_ok(format($$ update public.businesses set martial_art_ids = array[gen_random_uuid()] where id = %L $$, :'biz'),
  '23503', 'martial_art_not_found', 'modalidade inexistente é recusada');
select lives_ok(format($$ update public.businesses set status = 'hidden' where id = %L $$, :'biz'), 'dono oculta a página');
select tests.as_anon();
select is((select count(*)::int from public.businesses where id = :'biz'), 0, 'página oculta some para o visitante');
select tests.authenticate_as(:'dono');
select lives_ok(format($$ update public.businesses set status = 'active' where id = %L $$, :'biz'), 'dono publica de novo');

-- ---------------------------------------------------------------- administradores
select tests.authenticate_as(:'outro');
select throws_ok(format($$ select public.invite_business_admin(%L, 'bz_outro') $$, :'biz'),
  '42501', 'not_business_owner', 'quem não é dono não convida');
select tests.authenticate_as(:'dono');
select lives_ok(format($$ select public.invite_business_admin(%L, '@bz_adm') $$, :'biz'), 'dono convida administrador');
select throws_ok(format($$ select public.invite_business_admin(%L, 'bz_adm') $$, :'biz'),
  '23505', 'already_member', 'convite repetido é recusado');
select tests.as_postgres();
select is((select count(*)::int from public.notifications where recipient_id = :'adm' and type = 'business_invite'), 1,
  'convidado recebe notificação');
select tests.authenticate_as(:'adm');
select is_empty(format($$ update public.businesses set description = 'antes de aceitar' where id = %L returning id $$, :'biz'),
  'convite pendente ainda não dá acesso');
select lives_ok(format($$ select public.respond_business_invite(%L, true) $$, :'biz'), 'convidado aceita');
select lives_ok(format($$ update public.businesses set website = 'https://kimonos.example' where id = %L $$, :'biz'),
  'administrador edita depois de aceitar');
select throws_ok(format($$ select public.invite_business_admin(%L, 'bz_outro') $$, :'biz'),
  '42501', 'not_business_owner', 'administrador não convida (só o dono)');

-- ---------------------------------------------------------------- catálogo
select lives_ok(
  format($$ insert into public.business_items (business_id, name, price_status, price_cents, url) values (%L, 'Kimono A1', 'paid', 39990, 'https://kimonos.example/a1') $$, :'biz'),
  'administrador cadastra produto com preço');
select throws_ok(format($$ insert into public.business_items (business_id, name, price_status) values (%L, 'Sem preço', 'paid') $$, :'biz'),
  '23514', null, 'preço "pago" exige valor (nada inventado)');
select throws_ok(format($$ insert into public.business_items (business_id, name, price_status, price_cents) values (%L, 'Grátis', 'free', 1000) $$, :'biz'),
  '23514', null, 'item gratuito não guarda valor');
select lives_ok(format($$ insert into public.business_items (business_id, name, is_active) values (%L, 'Rascunho', false) $$, :'biz'),
  'item inativo (rascunho)');
select tests.authenticate_as(:'outro');
select throws_ok(format($$ insert into public.business_items (business_id, name) values (%L, 'Intruso') $$, :'biz'),
  '42501', null, 'outra pessoa não cadastra produto');
select tests.as_anon();
select is((select count(*)::int from public.business_items where business_id = :'biz'), 1, 'visitante vê só itens ativos');
select tests.as_postgres();
insert into public.business_items (business_id, name) select :'biz', 'Item ' || i from generate_series(1, 28) i;
select tests.authenticate_as(:'dono');
select throws_ok(format($$ insert into public.business_items (business_id, name) values (%L, 'O 31º') $$, :'biz'),
  '23514', 'catalog_limit', 'catálogo respeita o limite');

-- ---------------------------------------------------------------- promoções
select lives_ok(
  format($$ insert into public.business_promotions (business_id, title, coupon_code) values (%L, 'Semana do faixa branca', ' tatame10 ') $$, :'biz'),
  'dono cria promoção vigente');
select is((select coupon_code from public.business_promotions where business_id = :'biz'), 'TATAME10', 'cupom normalizado');
select lives_ok(
  format($$ insert into public.business_promotions (business_id, title, starts_on) values (%L, 'Black Friday', current_date + 30) $$, :'biz'),
  'promoção futura');
select throws_ok(
  format($$ insert into public.business_promotions (business_id, title, starts_on, ends_on) values (%L, 'Datas trocadas', current_date, current_date - 1) $$, :'biz'),
  '23514', null, 'fim antes do início é recusado');
select tests.as_anon();
select is((select count(*)::int from public.business_promotions where business_id = :'biz'), 1, 'visitante vê só a promoção vigente');

-- ---------------------------------------------------------------- publicar como página
select tests.authenticate_as(:'dono');
select gen_random_uuid() as post \gset
select lives_ok(format($$ select public.create_page_post(%L, %L, 'Coleção nova de kimonos') $$, :'biz', :'post'), 'dono publica como página');
select is((select business_name from public.post_cards where id = :'post'), 'Kimonos Faixa Teste', 'post aparece com a página');
select is((select count(*)::int from public.get_profile_posts(:'dono') where id = :'post'), 0, 'post da página fica fora do perfil pessoal');
select tests.authenticate_as(:'outro');
select throws_ok(format($$ select public.create_page_post(%L, gen_random_uuid(), 'Fingindo ser a loja') $$, :'biz'),
  '42501', 'not_business_manager', 'outra pessoa não publica como a página');

select tests.as_anon();
select is((select count(*)::int from public.get_business_posts(:'biz')), 1, 'visitante vê o post na página');

-- ---------------------------------------------------------------- arquivos da página
select tests.authenticate_as(:'adm');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', 'business/%s/logo-biz123.webp', %L) $$, :'biz', :'adm'),
  'gestão envia o logo da página');
select tests.authenticate_as(:'outro');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', 'business/%s/logo-out123.webp', %L) $$, :'biz', :'outro'),
  '42501', null, 'outra pessoa não envia arquivos da página');

-- ---------------------------------------------------------------- saída e remoção
select tests.authenticate_as(:'dono');
select throws_ok(format($$ select public.remove_business_member(%L, %L) $$, :'biz', :'dono'),
  '42501', 'owner_cannot_leave', 'dono não sai da própria página');
select tests.authenticate_as(:'adm');
select lives_ok(format($$ select public.remove_business_member(%L, %L) $$, :'biz', :'adm'), 'administrador sai da página');
select is_empty(format($$ update public.businesses set description = 'depois de sair' where id = %L returning id $$, :'biz'),
  'quem saiu perde o acesso');

-- ---------------------------------------------------------------- conta suspensa
select tests.as_postgres();
update public.profiles set status = 'suspended' where id = :'dono';
select tests.authenticate_as(:'dono');
select throws_ok(format($$ update public.businesses set description = 'x' where id = %L $$, :'biz'),
  '42501', 'account_suspended', 'conta suspensa não altera a página');

select * from finish();
rollback;
