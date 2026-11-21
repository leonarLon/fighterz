begin;
\ir _helpers.psql

select plan(37);

-- Fase 7 da evolução comercial: detecção heurística, revisão humana e recurso. Nunca pune sozinho.
select tests.create_user('cd_vendedor') as vend \gset
select tests.create_user('cd_atleta') as atleta \gset
select tests.create_user('cd_mod') as moder \gset
select tests.create_user('cd_outro') as outro \gset
select tests.as_postgres();
insert into public.user_roles (user_id, role) values (:'moder', 'moderator');

-- ---------------------------------------------------------------- regras (mesmos casos do Vitest)
select is(public.commercial_text_score('Treino pesado hoje no tatame, rolamos 6 rounds!'), 0, 'relato de treino não pontua');
select is(public.commercial_text_score('Promoção de faixa! Agora sou faixa roxa'), 0, '"promoção de faixa" é graduação, não venda');
select is(public.commercial_text_score('Vendo o treino da galera hoje, que luta!'), 0, '"vendo" (verbo ver) não pontua');
select is(public.commercial_text_score('Academia aceita TotalPass e Wellhub, plano Gold'), 0, 'citar TotalPass/Wellhub não é propaganda');
select is(public.commercial_text_score('Kimono novo por R$ 299, chama no direct! Cupom TATAME10'), 65, 'preço + chamada + cupom');
select is(public.commercial_text_score('Compre já: https://shopee.com.br/kimono-a1 frete grátis'), 50, 'link de loja + chamada');
select is(public.commercial_text_score('Encomendas abertas, whats (41) 99999-1234'), 30, 'encomenda + contato');
select is(public.commercial_text_score('Link na bio, 20% off só hoje'), 45, 'link na bio + desconto');
select is(public.commercial_text_score('wa.me/5541999991234 pronta entrega'), 50, 'WhatsApp direto + pronta entrega');
select is((select string_agg(code || ':' || points, ',' order by points desc) from public.commercial_text_signals('Kimono por R$ 299, cupom TATAME10')),
  'coupon:25,price:20', 'cada ponto tem um código explicável');

-- ---------------------------------------------------------------- posts pessoais geram sinais; um só não abre revisão
select tests.authenticate_as(:'vend');
select public.create_post(gen_random_uuid(), 'Kimono novo por R$ 299, chama no direct! Cupom TATAME10') as p1 \gset
-- O trigger é diferido (fim da transação): força a checagem agora.
set constraints all immediate;
set constraints all deferred;
select is((select count(*)::int from public.commercial_signals where post_id = :'p1'), 3, 'post comercial gera 3 sinais');
select tests.as_postgres();
select is((select score from public.commercial_risk where user_id = :'vend'), 52, 'risco com um post: 32 + 20 = 52');
select is((select count(*)::int from public.commercial_reviews where user_id = :'vend'), 0, 'um post comercial sozinho não abre revisão');

select tests.authenticate_as(:'atleta');
select public.create_post(gen_random_uuid(), 'Treino pesado hoje no tatame, rolamos 6 rounds!') as p_ok \gset
set constraints all immediate;
set constraints all deferred;
select tests.as_postgres();
select is((select count(*)::int from public.commercial_signals where post_id = :'p_ok'), 0, 'post pessoal não gera sinal');

-- Post publicado como página não entra na detecção.
select tests.authenticate_as(:'vend');
select public.create_business('Loja do Vendedor', 'store') as biz_slug \gset
select id as biz from public.businesses where slug = :'biz_slug' \gset
select public.create_page_post(:'biz', gen_random_uuid(), 'Kimono por R$ 299! Cupom TATAME10, compre já') as p_page \gset
set constraints all immediate;
set constraints all deferred;
select tests.as_postgres();
select is((select count(*)::int from public.commercial_signals where post_id = :'p_page'), 0, 'post da página comercial não é analisado');

-- Segundo post comercial: abre revisão (sem punir).
select tests.authenticate_as(:'vend');
select public.create_post(gen_random_uuid(), 'Compre já: https://shopee.com.br/kimono-a1 frete grátis') as p2 \gset
set constraints all immediate;
set constraints all deferred;
select tests.as_postgres();
select is((select score from public.commercial_risk where user_id = :'vend'), 72, 'risco com dois posts: 32 + 40 = 72');
select id as rev from public.commercial_reviews where user_id = :'vend' and status = 'open' \gset
select ok(:'rev'::text <> '', 'revisão aberta para a moderação');
select is((select jsonb_array_length(reasons) from public.commercial_reviews where id = :'rev'), 5, 'revisão guarda os motivos');
select is((select moderation_status::text from public.posts where id = :'p1'), 'visible', 'nada foi removido automaticamente');
select is((select status::text from public.profiles where id = :'vend'), 'active', 'conta não foi suspensa automaticamente');

-- ---------------------------------------------------------------- quem vê
select tests.authenticate_as(:'vend');
select is((select count(*)::int from public.commercial_reviews), 0, 'revisão aberta não aparece para a pessoa (só decisões)');
select is((select count(*)::int from public.commercial_signals), 5, 'a pessoa vê os próprios sinais (transparência)');
select tests.authenticate_as(:'outro');
select is((select count(*)::int from public.commercial_signals), 0, 'terceiros não veem sinais');
select throws_ok(format($$ select public.decide_commercial_review(%L, 'dismiss', null) $$, :'rev'), '42501', 'forbidden', 'usuário comum não decide');
select tests.authenticate_as(:'moder');
select is((select count(*)::int from public.commercial_reviews where status = 'open' and user_id = :'vend'), 1, 'moderação vê a fila');

-- ---------------------------------------------------------------- decisão e recurso
select throws_ok(format($$ select public.decide_commercial_review(%L, 'remove_posts', '') $$, :'rev'), '23514', 'reason_required', 'remover exige motivo');
select lives_ok(format($$ select public.decide_commercial_review(%L, 'remove_posts', 'Venda de kimonos no perfil pessoal') $$, :'rev'),
  'moderação remove os posts comerciais');
select is((select count(*)::int from public.posts where id in (:'p1', :'p2') and moderation_status = 'removed'), 2, 'posts sinalizados removidos');
select tests.as_postgres();
select is((select count(*)::int from public.notifications where recipient_id = :'vend' and type = 'commercial_warning'), 1, 'pessoa é avisada');

select tests.authenticate_as(:'vend');
select throws_ok(format($$ select public.create_commercial_appeal(%L, 'curto') $$, :'rev'), '23514', 'message_too_short', 'recurso precisa de explicação');
select lives_ok(format($$ select public.create_commercial_appeal(%L, 'Eram fotos do meu kimono de treino, não estou vendendo nada.') $$, :'rev'),
  'pessoa recorre');
select throws_ok(format($$ select public.create_commercial_appeal(%L, 'Outra tentativa de recurso aqui') $$, :'rev'), '23505', 'appeal_exists', 'um recurso por revisão');
select id as appeal from public.commercial_appeals where review_id = :'rev' \gset
select tests.authenticate_as(:'outro');
select throws_ok(format($$ select public.create_commercial_appeal(%L, 'Recurso de outra pessoa qualquer') $$, :'rev'), 'P0002', 'review_not_found', 'terceiro não recorre por outra pessoa');

select tests.authenticate_as(:'moder');
select lives_ok(format($$ select public.decide_commercial_appeal(%L, true, 'Revisamos: era equipamento pessoal.') $$, :'appeal'), 'moderação aceita o recurso');
select is((select count(*)::int from public.posts where id in (:'p1', :'p2') and moderation_status = 'visible'), 2, 'recurso aceito restaura os posts');
select is((select status::text from public.commercial_reviews where id = :'rev'), 'reverted', 'revisão desfeita');
select tests.as_postgres();
select is((select count(*)::int from public.commercial_reviews where user_id = :'vend' and status = 'open'), 0,
  'mesmo conteúdo não reabre revisão depois da decisão');

select * from finish();
rollback;
