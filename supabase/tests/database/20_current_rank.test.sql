begin;
\ir _helpers.psql

select plan(10);

-- Regressão do bug de graduação (21/11/2026): a atual é a MAIOR faixa e grau, não a data mais recente.
select tests.create_user('grad_dono') as dono \gset
select tests.create_user('grad_outro') as outro \gset
select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset
select id as judo from public.martial_arts where slug = 'judo' \gset
select id as branca from public.martial_art_ranks where martial_art_id = :'bjj' and ordinal = 1 \gset
select id as azul from public.martial_art_ranks where martial_art_id = :'bjj' and ordinal = 2 \gset
select id as roxa from public.martial_art_ranks where martial_art_id = :'bjj' and ordinal = 3 \gset
select id as marrom from public.martial_art_ranks where martial_art_id = :'bjj' and ordinal = 4 \gset
select id as judo_azul from public.martial_art_ranks where martial_art_id = :'judo' and ordinal = 2 \gset

select tests.authenticate_as(:'dono');
insert into public.user_martial_arts (user_id, martial_art_id) values (:'dono', :'bjj') returning id as uma \gset
insert into public.user_martial_arts (user_id, martial_art_id) values (:'dono', :'judo') returning id as uma_judo \gset
insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on)
values (:'uma', :'dono', :'azul', 2, current_date - 30);

-- O caso do bug: faixa maior com data ANTERIOR ao registro existente.
insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on)
values (:'uma', :'dono', :'roxa', 0, current_date - 400) returning id as p_roxa \gset
select is((select rank_name from public.journey_cards where id = :'uma'), 'Faixa Roxa',
          'faixa maior com data anterior vira a graduação atual');

-- Registro de faixa menor com data mais nova não rebaixa.
insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on)
values (:'uma', :'dono', :'branca', 4, current_date);
select is((select rank_name from public.journey_cards where id = :'uma'), 'Faixa Roxa', 'faixa menor mais recente não rebaixa');

-- Grau maior na mesma faixa vence.
insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on)
values (:'uma', :'dono', :'roxa', 2, current_date - 100);
select is((select current_degree from public.journey_cards where id = :'uma'), 2::smallint, 'maior grau da mesma faixa vence');

-- Outra modalidade não é afetada.
insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on)
values (:'uma_judo', :'dono', :'judo_azul', 0, current_date);
select is((select rank_name from public.journey_cards where id = :'uma'), 'Faixa Roxa', 'graduação de outra modalidade não sobrescreve');
select is((select rank_name from public.journey_cards where id = :'uma_judo'), 'Faixa Azul', 'cada modalidade tem a sua');

-- Corrigir um registro (editar) recalcula a atual.
update public.rank_promotions set rank_id = :'marrom', degree = 0 where id = :'p_roxa';
select is((select rank_name from public.journey_cards where id = :'uma'), 'Faixa Marrom', 'corrigir o registro atualiza a graduação atual');

-- Apagar o maior volta para o próximo maior.
delete from public.rank_promotions where id = :'p_roxa';
select is((select rank_name || ' ' || current_degree from public.journey_cards where id = :'uma'), 'Faixa Roxa 2',
          'apagar o maior volta para o próximo maior');

-- Terceiros não alteram nem apagam.
select tests.authenticate_as(:'outro');
select is_empty(format($$ update public.rank_promotions set degree = 4 where user_martial_art_id = %L returning id $$, :'uma'),
                'outra pessoa não altera a graduação de terceiros');
select is_empty(format($$ delete from public.rank_promotions where user_martial_art_id = %L returning id $$, :'uma'),
                'outra pessoa não apaga a graduação de terceiros');
select throws_ok(
  format($$ insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on)
            values (%L, %L, %L, 0, current_date) $$, :'uma', :'outro', :'marrom'),
  '42501', null, 'outra pessoa não registra graduação na jornada de terceiros');

select * from finish();
rollback;
