-- Fase 2 · Catálogo inicial de modalidades e graduações.
-- Fica em migration (e não em seed.sql) porque é dado de referência necessário também em produção.
-- Os sistemas de graduação variam entre federações e escolas. Aqui está um padrão comum,
-- e o admin pode ajustar pelo painel (Fase 6). A graduação do usuário aceitará `federation` livre.

alter table public.martial_arts      disable trigger martial_arts_audit;
alter table public.martial_art_ranks disable trigger martial_art_ranks_audit;

insert into public.martial_arts (slug, name, has_ranks, sort_order) values
  ('jiu-jitsu',    'Jiu-Jitsu Brasileiro',   true,  10),
  ('muay-thai',    'Muay Thai',              true,  20),
  ('judo',         'Judô',                   true,  30),
  ('karate',       'Karatê',                 true,  40),
  ('taekwondo',    'Taekwondo',              true,  50),
  ('capoeira',     'Capoeira',               true,  60),
  ('krav-maga',    'Krav Maga',              true,  70),
  ('kickboxing',   'Kickboxing',             true,  80),
  ('boxe',         'Boxe',                   false, 90),
  ('mma',          'MMA',                    false, 100),
  ('luta-olimpica','Luta Olímpica (Wrestling)', false, 110),
  ('outra',        'Outra',                  false, 999);

-- Insere graduações em ordem. Cada item: nome | cor | cor secundária | graus | idade mínima.
create function pg_temp.add_ranks(p_slug text, p_ranks text[][])
returns void
language plpgsql
as $$
declare
  v_id uuid;
  i    integer;
begin
  select id into strict v_id from public.martial_arts where slug = p_slug;
  for i in 1 .. array_length(p_ranks, 1) loop
    insert into public.martial_art_ranks (martial_art_id, track, ordinal, name, color_hex, secondary_color_hex, max_degrees, min_age)
    values (
      v_id, 'adult', i,
      p_ranks[i][1],
      nullif(p_ranks[i][2], ''),
      nullif(p_ranks[i][3], ''),
      coalesce(nullif(p_ranks[i][4], '')::smallint, 0),
      nullif(p_ranks[i][5], '')::smallint
    );
  end loop;
end;
$$;

-- Jiu-Jitsu (padrão IBJJF adulto): a preta tem 6 graus; 7º e 8º grau são coral, 9º e 10º vermelha.
select pg_temp.add_ranks('jiu-jitsu', array[
  ['Faixa Branca',                    '#FFFFFF', '',        '4', ''],
  ['Faixa Azul',                      '#1D4ED8', '',        '4', '16'],
  ['Faixa Roxa',                      '#7E22CE', '',        '4', '16'],
  ['Faixa Marrom',                    '#78350F', '',        '4', '18'],
  ['Faixa Preta',                     '#111111', '',        '6', '19'],
  ['Faixa Coral (vermelha e preta)',  '#DC2626', '#111111', '',  ''],
  ['Faixa Coral (vermelha e branca)', '#DC2626', '#FFFFFF', '',  ''],
  ['Faixa Vermelha',                  '#DC2626', '',        '',  '']
]);

-- Muay Thai: kruang (prajied). Há muitas variações entre confederações.
select pg_temp.add_ranks('muay-thai', array[
  ['Kruang Branco',   '#FFFFFF', '', '', ''],
  ['Kruang Amarelo',  '#FACC15', '', '', ''],
  ['Kruang Laranja',  '#F97316', '', '', ''],
  ['Kruang Verde',    '#16A34A', '', '', ''],
  ['Kruang Azul',     '#1D4ED8', '', '', ''],
  ['Kruang Roxo',     '#7E22CE', '', '', ''],
  ['Kruang Marrom',   '#78350F', '', '', ''],
  ['Kruang Vermelho', '#DC2626', '', '', ''],
  ['Kruang Preto',    '#111111', '', '', '']
]);

-- Judô (adulto): kyu até a marrom, depois dans. 6º a 8º Dan coral, 9º e 10º vermelha.
select pg_temp.add_ranks('judo', array[
  ['Faixa Branca',          '#FFFFFF', '',        '', ''],
  ['Faixa Azul',            '#1D4ED8', '',        '', ''],
  ['Faixa Amarela',         '#FACC15', '',        '', ''],
  ['Faixa Laranja',         '#F97316', '',        '', ''],
  ['Faixa Verde',           '#16A34A', '',        '', ''],
  ['Faixa Roxa',            '#7E22CE', '',        '', ''],
  ['Faixa Marrom',          '#78350F', '',        '', ''],
  ['Faixa Preta · 1º Dan',  '#111111', '',        '', ''],
  ['Faixa Preta · 2º Dan',  '#111111', '',        '', ''],
  ['Faixa Preta · 3º Dan',  '#111111', '',        '', ''],
  ['Faixa Preta · 4º Dan',  '#111111', '',        '', ''],
  ['Faixa Preta · 5º Dan',  '#111111', '',        '', ''],
  ['Faixa Coral · 6º Dan',  '#DC2626', '#FFFFFF', '', ''],
  ['Faixa Coral · 7º Dan',  '#DC2626', '#FFFFFF', '', ''],
  ['Faixa Coral · 8º Dan',  '#DC2626', '#FFFFFF', '', ''],
  ['Faixa Vermelha · 9º Dan',  '#DC2626', '',     '', ''],
  ['Faixa Vermelha · 10º Dan', '#DC2626', '',     '', '']
]);

select pg_temp.add_ranks('karate', array[
  ['Faixa Branca',          '#FFFFFF', '', '', ''],
  ['Faixa Amarela',         '#FACC15', '', '', ''],
  ['Faixa Vermelha',        '#DC2626', '', '', ''],
  ['Faixa Laranja',         '#F97316', '', '', ''],
  ['Faixa Verde',           '#16A34A', '', '', ''],
  ['Faixa Roxa',            '#7E22CE', '', '', ''],
  ['Faixa Marrom',          '#78350F', '', '', ''],
  ['Faixa Preta · 1º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 2º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 3º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 4º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 5º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 6º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 7º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 8º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 9º Dan',  '#111111', '', '', ''],
  ['Faixa Preta · 10º Dan', '#111111', '', '', '']
]);

select pg_temp.add_ranks('taekwondo', array[
  ['Faixa Branca',         '#FFFFFF', '',        '', ''],
  ['Faixa Cinza',          '#9CA3AF', '',        '', ''],
  ['Faixa Amarela',        '#FACC15', '',        '', ''],
  ['Faixa Laranja',        '#F97316', '',        '', ''],
  ['Faixa Verde',          '#16A34A', '',        '', ''],
  ['Faixa Roxa',           '#7E22CE', '',        '', ''],
  ['Faixa Azul',           '#1D4ED8', '',        '', ''],
  ['Faixa Marrom',         '#78350F', '',        '', ''],
  ['Faixa Vermelha',       '#DC2626', '',        '', ''],
  ['Faixa Vermelha e Preta', '#DC2626', '#111111', '', ''],
  ['Faixa Preta · 1º Dan', '#111111', '',        '', ''],
  ['Faixa Preta · 2º Dan', '#111111', '',        '', ''],
  ['Faixa Preta · 3º Dan', '#111111', '',        '', ''],
  ['Faixa Preta · 4º Dan', '#111111', '',        '', ''],
  ['Faixa Preta · 5º Dan', '#111111', '',        '', ''],
  ['Faixa Preta · 6º Dan', '#111111', '',        '', ''],
  ['Faixa Preta · 7º Dan', '#111111', '',        '', ''],
  ['Faixa Preta · 8º Dan', '#111111', '',        '', ''],
  ['Faixa Preta · 9º Dan', '#111111', '',        '', '']
]);

-- Capoeira: cordas. Cada grupo tem seu próprio sistema; este é um padrão genérico.
select pg_temp.add_ranks('capoeira', array[
  ['Corda Crua',                 '#E8DCC2', '',        '', ''],
  ['Corda Amarela',              '#FACC15', '',        '', ''],
  ['Corda Laranja',              '#F97316', '',        '', ''],
  ['Corda Azul',                 '#1D4ED8', '',        '', ''],
  ['Corda Verde',                '#16A34A', '',        '', ''],
  ['Corda Roxa',                 '#7E22CE', '',        '', ''],
  ['Corda Marrom (Instrutor)',   '#78350F', '',        '', ''],
  ['Corda Vermelha (Professor)', '#DC2626', '',        '', ''],
  ['Corda Vermelha e Branca (Contramestre)', '#DC2626', '#FFFFFF', '', ''],
  ['Corda Branca (Mestre)',      '#FFFFFF', '',        '', '']
]);

select pg_temp.add_ranks('krav-maga', array[
  ['Faixa Branca',         '#FFFFFF', '', '', ''],
  ['Faixa Amarela',        '#FACC15', '', '', ''],
  ['Faixa Laranja',        '#F97316', '', '', ''],
  ['Faixa Verde',          '#16A34A', '', '', ''],
  ['Faixa Azul',           '#1D4ED8', '', '', ''],
  ['Faixa Marrom',         '#78350F', '', '', ''],
  ['Faixa Preta · 1º Dan', '#111111', '', '', ''],
  ['Faixa Preta · 2º Dan', '#111111', '', '', ''],
  ['Faixa Preta · 3º Dan', '#111111', '', '', ''],
  ['Faixa Preta · 4º Dan', '#111111', '', '', ''],
  ['Faixa Preta · 5º Dan', '#111111', '', '', '']
]);

select pg_temp.add_ranks('kickboxing', array[
  ['Faixa Branca',         '#FFFFFF', '', '', ''],
  ['Faixa Amarela',        '#FACC15', '', '', ''],
  ['Faixa Laranja',        '#F97316', '', '', ''],
  ['Faixa Verde',          '#16A34A', '', '', ''],
  ['Faixa Azul',           '#1D4ED8', '', '', ''],
  ['Faixa Marrom',         '#78350F', '', '', ''],
  ['Faixa Preta · 1º Dan', '#111111', '', '', ''],
  ['Faixa Preta · 2º Dan', '#111111', '', '', ''],
  ['Faixa Preta · 3º Dan', '#111111', '', '', ''],
  ['Faixa Preta · 4º Dan', '#111111', '', '', ''],
  ['Faixa Preta · 5º Dan', '#111111', '', '', '']
]);

alter table public.martial_arts      enable trigger martial_arts_audit;
alter table public.martial_art_ranks enable trigger martial_art_ranks_audit;
