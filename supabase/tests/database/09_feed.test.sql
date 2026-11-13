begin;
\ir _helpers.psql

select plan(9);

-- Cenário de aceite da Fase 3: leitor segue 50 autores com 1.000 posts no total.
select tests.create_user('leitora') as leitora \gset
select tests.create_user('desconhecido') as desconhecido \gset

do $$
declare
  v_reader uuid := (select id from public.profiles where username = 'leitora');
  v_author uuid;
begin
  for a in 1..50 loop
    v_author := tests.create_user('autor_' || a);
    insert into public.follows (follower_id, following_id) values (v_reader, v_author);
    insert into public.posts (author_id, caption, created_at)
    select v_author, 'treino ' || a || '-' || n, now() - make_interval(mins => a * 20 + n)
    from generate_series(1, 20) n;
  end loop;
end;
$$;

select tests.create_post(:'desconhecido', 'não deveria aparecer') as fora \gset
analyze public.posts;

-- Cursor da página do meio calculado fora da medição de desempenho.
select created_at as mid_created, id as mid_id from public.posts p
where p.author_id in (select following_id from public.follows f join public.profiles r on r.id = f.follower_id where r.username = 'leitora')
order by created_at desc, id desc limit 1 offset 500 \gset

select tests.authenticate_as(:'leitora');

select is((select count(*)::int from public.get_home_feed()), 20, 'primeira página com 20 posts');
select ok(
  (select bool_and(author_id <> :'desconhecido') from public.get_home_feed(null, null, 50)),
  'feed não traz quem a leitora não segue'
);

-- Paginação por cursor: páginas sem repetição nem buraco
create temp table pages as
with recursive pager(n, last_created, last_id) as (
  select 1, null::timestamptz, null::uuid
  union all
  select n + 1, f.created_at, f.id
  from pager, lateral (
    select created_at, id from public.get_home_feed(pager.last_created, pager.last_id, 50)
    order by created_at, id limit 1
  ) f
  where n < 25
)
select n, last_created, last_id from pager;

select is(
  (select count(distinct x.id)::int from pages p, lateral public.get_home_feed(p.last_created, p.last_id, 50) x),
  1000, 'percorrendo o cursor chegamos aos 1.000 posts, sem duplicar'
);

select ok(
  (select bool_and(jsonb_typeof(media) = 'array' and viewer_has_liked = false) from public.get_home_feed()),
  'cada item já vem com mídias e estado do leitor (sem N+1)'
);

select performs_ok($$ select * from public.get_home_feed() $$, 300, 'primeira página do feed em < 300 ms');
select performs_ok(
  format($$ select * from public.get_home_feed(%L::timestamptz, %L::uuid) $$, :'mid_created', :'mid_id'),
  300, 'página do meio do feed em < 300 ms'
);
select performs_ok($$ select * from public.get_explore() $$, 300, 'explorar em < 300 ms');

-- Explorar: só públicos; perfil: respeita a RLS
select tests.as_anon();
select is((select count(*)::int from public.get_explore(0, 50)), 50, 'visitante vê o explorar');
select is((select count(*)::int from public.get_profile_posts((select id from public.profiles where username = 'autor_1'))), 20,
  'posts do perfil público para visitantes');

select * from finish();
rollback;
