-- Dados de demonstração SOMENTE para o ambiente local (`supabase db reset`).
-- Nunca rodar em produção. Senha de todos: Figtherz123
--   demo@figtherz.local       usuário comum
--   admin@figtherz.local      superadmin
--   moderador@figtherz.local  moderador (Fase 6)

do $$
declare
  v_demo  uuid := '00000000-0000-4000-8000-000000000001';
  v_admin uuid := '00000000-0000-4000-8000-000000000002';
  v_mod   uuid := '00000000-0000-4000-8000-000000000003';
  u record;
begin
  for u in
    select * from (values
      (v_demo,  'demo@figtherz.local',  'demo',  'Atleta Demo',  '1995-04-10'),
      (v_admin, 'admin@figtherz.local', 'admin', 'Admin Figtherz', '1988-09-21'),
      (v_mod,   'moderador@figtherz.local', 'moderador', 'Moderação Figtherz', '1990-02-14')
    ) as t(id, email, username, display_name, birth_date)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('Figtherz123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', u.username, 'display_name', u.display_name,
                         'birth_date', u.birth_date, 'accepted_terms', true),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;

  insert into public.user_roles (user_id, role, granted_by) values (v_admin, 'superadmin', null), (v_mod, 'moderator', v_admin);
end;
$$;

-- ---------------------------------------------------------------------------
-- Rede social de demonstração (Fase 3): 25 atletas, 1.000 posts, follows, curtidas e comentários.
-- Senha de todos: Figtherz123. A conta demo segue os 20 primeiros.
-- ---------------------------------------------------------------------------
do $$
declare
  v_demo  uuid := '00000000-0000-4000-8000-000000000001';
  v_names text[] := array[
    'Bruna Tavares','Diego Ramos','Fernanda Lima','Gustavo Nogueira','Helena Castro','Igor Mendes',
    'Juliana Prado','Kleber Souza','Larissa Moura','Marcelo Dias','Natália Rocha','Otávio Freitas',
    'Paula Andrade','Rafael Teixeira','Sabrina Lopes','Thiago Barros','Úrsula Pinto','Vinícius Cardoso',
    'Wesley Duarte','Yasmin Correia','Zeca Monteiro','Amanda Ribeiro','Bernardo Faria','Camila Azevedo','Davi Martins'];
  v_arts  uuid[] := array(select id from public.martial_arts where has_ranks or slug in ('boxe','mma') order by sort_order);
  v_lines text[] := array[
    'Treino pesado hoje. Saí do tatame destruído, mas feliz.',
    'Drill de passagem de guarda por 40 minutos. A consistência vence.',
    'Sparring leve com a turma da noite. Que energia!',
    'Primeira aula experimental de um amigo. Bem-vindo ao time!',
    'Foco na defesa hoje. Ainda tenho muito a melhorar.',
    'Open mat de sábado: 6 rounds e muita troca de conhecimento.',
    'Técnica nova aprendida: vou repetir até ficar automático.',
    'Recuperação ativa: alongamento e mobilidade. O corpo agradece.',
    'Semana de competição chegando. Cabeça no lugar e treino em dia.',
    'Agradecido ao professor pela paciência de sempre.'];
  v_id    uuid;
  v_ids   uuid[] := '{}';
  v_post  uuid;
  i int;
  n int;
begin
  for i in 1 .. array_length(v_names, 1) loop
    v_id := ('00000000-0000-4000-8000-0000000001' || lpad(i::text, 2, '0'))::uuid;
    v_ids := v_ids || v_id;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'atleta' || i || '@figtherz.local', extensions.crypt('Figtherz123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', 'atleta' || i, 'display_name', v_names[i],
                         'birth_date', (date '1985-01-01' + (i * 211)), 'accepted_terms', true),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', 'atleta' || i || '@figtherz.local', 'email_verified', true),
            'email', now(), now(), now());

    update public.profiles
    set bio = 'Praticante de ' || (select name from public.martial_arts where id = v_arts[1 + i % array_length(v_arts, 1)]) || '. Treino quase todo dia.',
        city = (array['São Paulo','Rio de Janeiro','Curitiba','Belo Horizonte','Porto Alegre','Recife','Salvador','Florianópolis'])[1 + i % 8],
        state = (array['SP','RJ','PR','MG','RS','PE','BA','SC'])[1 + i % 8],
        is_private = (i % 9 = 0)
    where id = v_id;

    -- 40 posts por atleta, espalhados pelos últimos 60 dias
    for n in 1 .. 40 loop
      insert into public.posts (author_id, caption, martial_art_id, visibility, created_at)
      values (v_id, v_lines[1 + (i + n) % 10], v_arts[1 + (i + n) % array_length(v_arts, 1)],
              (case when n % 10 = 0 then 'followers' else 'public' end)::public.visibility,
              now() - make_interval(hours => n * 36 + i));
    end loop;
  end loop;

  -- A demo segue os 20 primeiros; atletas se seguem em anel
  for i in 1 .. 20 loop
    insert into public.follows (follower_id, following_id) values (v_demo, v_ids[i]);
  end loop;
  for i in 1 .. array_length(v_ids, 1) loop
    insert into public.follows (follower_id, following_id) values (v_ids[i], v_ids[1 + i % array_length(v_ids, 1)]);
    insert into public.follows (follower_id, following_id) values (v_ids[i], v_demo);
  end loop;
  update public.follows set status = 'accepted' where status = 'pending' and follower_id <> v_demo;

  -- Curtidas e comentários nos posts mais recentes
  for v_post in select id from public.posts where visibility = 'public' order by created_at desc limit 200 loop
    insert into public.post_likes (post_id, user_id)
    select v_post, u from unnest(v_ids[1:1 + (abs(hashtext(v_post::text)) % 12)]) u
    on conflict do nothing;
    insert into public.comments (post_id, author_id, body)
    values (v_post, v_ids[1 + abs(hashtext(v_post::text)) % 25], 'Boa! Bora treinar junto essa semana?');
  end loop;

  -- Notificações geradas pelo seed para a demo começam lidas
  update public.notifications set read_at = now() where recipient_id = v_demo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fase 4: professores, academias fictícias, unidades, grade e vínculos.
-- atleta2 (Diego Ramos) é professor aprovado em 3 academias: grade unificada em /professores/atleta2.
-- atleta7 tem pedido de professor pendente (para testar a aprovação em /admin/professores).
-- ---------------------------------------------------------------------------
do $$
declare
  v_demo uuid := '00000000-0000-4000-8000-000000000001';
  u      uuid[] := array(select id from public.profiles where username like 'atleta%' order by (substring(username from 7))::int);
  bjj    uuid := (select id from public.martial_arts where slug = 'jiu-jitsu');
  mt     uuid := (select id from public.martial_arts where slug = 'muay-thai');
  judo   uuid := (select id from public.martial_arts where slug = 'judo');
  boxe   uuid := (select id from public.martial_arts where slug = 'boxe');
  a1 uuid; a2 uuid; a3 uuid; a4 uuid;
  u1a uuid; u1b uuid; u2 uuid; u3 uuid; u4 uuid;
begin
  -- Professores
  insert into public.teacher_profiles (user_id, professional_name, bio, experience_years, lineage, show_contact, contact_email, social_links, certifications)
  values
    (u[2], 'Professor Diego Ramos', 'Faixa preta de Jiu-Jitsu. Aulas para iniciantes e competidores em três academias.', 14,
     'Linhagem tradicional de Jiu-Jitsu brasileiro', true, 'diego.ramos@figtherz.local', '["https://www.youtube.com/@exemplo"]',
     '[{"title":"Faixa preta 2º grau","issuer":"Federação estadual","year":2022}]'),
    (u[6], 'Kru Igor Mendes', 'Muay Thai tradicional, condicionamento e técnica.', 9, null, false, null, '[]', '[]'),
    (u[7], 'Juliana Prado', 'Judô para adultos iniciantes.', 6, null, false, null, '[]', '[]');
  update public.teacher_profiles set status = 'approved', reviewed_at = now() where user_id in (u[2], u[6]);
  insert into public.teacher_martial_arts (teacher_id, martial_art_id, rank_id) values
    (u[2], bjj, (select id from public.martial_art_ranks where martial_art_id = bjj and name = 'Faixa Preta')),
    (u[6], mt,  (select id from public.martial_art_ranks where martial_art_id = mt and name = 'Kruang Preto')),
    (u[7], judo, null);

  -- Academias (nomes fictícios)
  insert into public.academies (name, description, instagram, created_by, is_verified)
  values ('Tatame Central', 'Jiu-Jitsu e Muay Thai no coração de Curitiba. Turmas para todos os níveis e aula experimental gratuita.', 'tatamecentral.demo', u[1], true)
  returning id into a1;
  insert into public.academies (name, description, created_by)
  values ('Equipe Raiz Combate', 'Equipe de competição e turmas de iniciantes no Batel.', u[3]) returning id into a2;
  insert into public.academies (name, description, created_by)
  values ('Dojo Horizonte', 'Judô e Jiu-Jitsu em Pinheiros, São Paulo.', u[4]) returning id into a3;
  insert into public.academies (name, description, created_by)
  values ('Arena Norte Muay Thai', 'Muay Thai e boxe na Tijuca, Rio de Janeiro.', u[5]) returning id into a4;

  insert into public.academy_martial_arts (academy_id, martial_art_id) values
    (a1, bjj), (a1, mt), (a2, bjj), (a3, judo), (a3, bjj), (a4, mt), (a4, boxe);

  insert into public.academy_units (academy_id, name, postal_code, street, number, neighborhood, city, state, reference_point, latitude, longitude)
  values (a1, 'Sede Centro', '80020000', 'Rua das Flores', '120', 'Centro', 'Curitiba', 'PR', 'Próximo à praça', -25.4310, -49.2710)
  returning id into u1a;
  insert into public.academy_units (academy_id, name, postal_code, street, number, neighborhood, city, state, latitude, longitude)
  values (a1, 'Unidade Água Verde', '80240000', 'Avenida Exemplo', '900', 'Água Verde', 'Curitiba', 'PR', -25.4510, -49.2850)
  returning id into u1b;
  insert into public.academy_units (academy_id, name, postal_code, street, number, neighborhood, city, state, latitude, longitude)
  values (a2, 'Batel', '80420000', 'Rua Fictícia', '45', 'Batel', 'Curitiba', 'PR', -25.4420, -49.2900) returning id into u2;
  insert into public.academy_units (academy_id, name, postal_code, street, number, neighborhood, city, state, latitude, longitude)
  values (a3, 'Pinheiros', '05422000', 'Rua Modelo', '300', 'Pinheiros', 'São Paulo', 'SP', -23.5670, -46.6920) returning id into u3;
  insert into public.academy_units (academy_id, name, postal_code, street, number, neighborhood, city, state, latitude, longitude)
  values (a4, 'Tijuca', '20510000', 'Rua Demonstração', '77', 'Tijuca', 'Rio de Janeiro', 'RJ', -22.9250, -43.2320) returning id into u4;

  -- Vínculos ativos (aceite mútuo simulado no seed)
  insert into public.academy_memberships (academy_id, user_id, role, status, requested_by, approved_at) values
    (a1, u[2], 'teacher', 'active', 'academy', now()),
    (a2, u[2], 'teacher', 'active', 'academy', now()),
    (a3, u[2], 'teacher', 'active', 'user', now()),
    (a1, u[6], 'teacher', 'active', 'academy', now()),
    (a4, u[6], 'teacher', 'active', 'academy', now()),
    (a1, v_demo, 'student', 'active', 'user', now()),
    (a2, u[8], 'student', 'pending', 'user', null);

  -- Grade (0 = domingo)
  insert into public.class_schedules (academy_id, unit_id, teacher_id, martial_art_id, name, level, weekday, starts_at, ends_at, accepts_trial) values
    (a1, u1a, u[2], bjj,  'Jiu-Jitsu Iniciante',       'beginner',     1, '19:00', '20:30', true),
    (a1, u1a, u[2], bjj,  'Jiu-Jitsu Iniciante',       'beginner',     3, '19:00', '20:30', true),
    (a1, u1a, u[2], bjj,  'Jiu-Jitsu Avançado',        'advanced',     2, '20:00', '21:30', false),
    (a1, u1b, u[6], mt,   'Muay Thai Todos os Níveis', 'all',          1, '07:00', '08:00', true),
    (a1, u1b, u[6], mt,   'Muay Thai Todos os Níveis', 'all',          4, '18:30', '19:30', true),
    (a1, u1a, null, bjj,  'Open Mat',                  'all',          6, '10:00', '12:00', false),
    (a2, u2,  u[2], bjj,  'Competição',                'competition',  2, '12:00', '13:30', false),
    (a2, u2,  u[2], bjj,  'Jiu-Jitsu Manhã',           'all',          5, '06:30', '07:30', true),
    (a3, u3,  u[2], bjj,  'Jiu-Jitsu Pinheiros',       'intermediate', 4, '20:00', '21:30', false),
    (a3, u3,  null, judo, 'Judô Adulto',               'beginner',     2, '19:00', '20:00', true),
    (a4, u4,  u[6], mt,   'Muay Thai Iniciante',       'beginner',     1, '19:00', '20:00', true),
    (a4, u4,  null, boxe, 'Boxe Condicionamento',      'all',          3, '07:00', '08:00', true);

  insert into public.academy_followers (academy_id, user_id) values (a1, v_demo), (a1, u[9]), (a2, u[10]);
  update public.notifications set read_at = now() where read_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fase 5: jornada, treinos, conquistas e eventos.
-- demo: BJJ faixa azul (2 graus confirmados por atleta2; 3º grau aguardando confirmação em /professor).
-- Eventos: open mat da Tatame Central, seminário pessoal do atleta2, campeonato em SP e um rascunho.
-- ---------------------------------------------------------------------------
do $$
declare
  v_demo uuid := (select id from public.profiles where username = 'demo');
  v_prof uuid := (select id from public.profiles where username = 'atleta2');
  v_a1   uuid := (select id from public.profiles where username = 'atleta1');
  v_a3   uuid := (select id from public.profiles where username = 'atleta3');
  bjj    uuid := (select id from public.martial_arts where slug = 'jiu-jitsu');
  mt     uuid := (select id from public.martial_arts where slug = 'muay-thai');
  tatame uuid := (select id from public.academies where slug = 'tatame-central');
  raiz   uuid := (select id from public.academies where slug = 'equipe-raiz-combate');
  unit1  uuid;
  r      record;
  uma    uuid;
  post   uuid;
  ev     uuid;
  i      integer;
begin
  select id into unit1 from public.academy_units where academy_id = tatame order by name limit 1;

  -- Jornada da demo
  insert into public.user_martial_arts (user_id, martial_art_id, started_on, federation)
  values (v_demo, bjj, '2021-02-01', 'IBJJF') returning id into uma;
  for r in select id, ordinal from public.martial_art_ranks where martial_art_id = bjj and ordinal <= 2 loop
    if r.ordinal = 1 then
      insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on)
      values (uma, v_demo, r.id, 0, '2021-02-01'), (uma, v_demo, r.id, 4, '2023-03-10');
    else
      insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on, academy_id, teacher_id, verification, confirmed_at)
      values (uma, v_demo, r.id, 2, '2025-04-12', tatame, v_prof, 'teacher_confirmed', now());
      insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on, academy_id, teacher_id)
      values (uma, v_demo, r.id, 3, current_date - 20, tatame, v_prof);
    end if;
  end loop;
  insert into public.user_martial_arts (user_id, martial_art_id, started_on) values (v_demo, mt, '2024-08-01');

  -- Professor também tem jornada (preta 2 graus)
  insert into public.user_martial_arts (user_id, martial_art_id, started_on) values (v_prof, bjj, '2008-01-01') returning id into uma;
  insert into public.rank_promotions (user_martial_art_id, user_id, rank_id, degree, promoted_on)
  select uma, v_prof, id, 2, '2019-06-01' from public.martial_art_ranks where martial_art_id = bjj and ordinal = 5;

  -- Treinos da demo nos últimos 30 dias (um compartilhado no feed)
  for i in 1..9 loop
    insert into public.training_checkins (user_id, martial_art_id, academy_id, trained_at, duration_min, notes)
    values (v_demo, case when i % 3 = 0 then mt else bjj end, tatame,
            date_trunc('day', now()) - make_interval(days => i * 3) + interval '22 hours', 90,
            case when i = 1 then 'Treino de raspagens' end);
  end loop;
  insert into public.posts (author_id, kind, caption, visibility, martial_art_id, academy_id, created_at)
  values (v_demo, 'checkin', 'Treino pesado de passagem de guarda hoje.', 'public', bjj, tatame, now() - interval '3 hours')
  returning id into post;
  insert into public.training_checkins (user_id, martial_art_id, academy_id, trained_at, duration_min, notes, post_id)
  values (v_demo, bjj, tatame, now() - interval '4 hours', 90, 'Treino pesado de passagem de guarda hoje.', post);

  insert into public.athlete_achievements (user_id, martial_art_id, type, title, event_name, placement, medal, division, achieved_on)
  values (v_demo, bjj, 'competition_result', 'Campeã da categoria', 'Copa Fictícia de Curitiba', 1, 'gold', 'Adulto azul leve', '2025-09-20'),
         (v_demo, bjj, 'milestone', '100 treinos no ano', null, null, null, null, '2025-12-15');

  -- Eventos
  insert into public.events (created_by, academy_id, unit_id, type, martial_art_id, title, description, starts_at, ends_at, city, state, status)
  values (v_a1, tatame, unit1, 'open_mat', bjj, 'Open mat de sábado', 'Treino livre para todas as faixas. Traga água e kimono.',
          date_trunc('day', now()) + interval '5 days 13 hours', date_trunc('day', now()) + interval '5 days 15 hours', '-', 'PR', 'published');
  insert into public.events (created_by, type, martial_art_id, title, description, starts_at, ends_at, venue_name, street, number, neighborhood, city, state, external_url, status)
  values (v_prof, 'seminar', bjj, 'Seminário de guarda com Diego Ramos', 'Três horas de guarda aberta e raspagens.',
          date_trunc('day', now()) + interval '12 days 12 hours', date_trunc('day', now()) + interval '12 days 15 hours',
          'Ginásio Fictício', 'Rua Exemplo', '100', 'Centro', 'Curitiba', 'PR', 'https://example.com/seminario', 'published')
  returning id into ev;
  insert into public.event_interests (event_id, user_id, kind) values (ev, v_demo, 'interested'), (ev, v_a1, 'interested');
  insert into public.events (created_by, academy_id, type, martial_art_id, title, starts_at, ends_at, venue_name, city, state, status)
  values (v_a3, raiz, 'championship', bjj, 'Campeonato Paulista Fictício', date_trunc('day', now()) + interval '30 days 11 hours',
          date_trunc('day', now()) + interval '31 days 20 hours', 'Arena Exemplo', 'São Paulo', 'SP', 'published');
  insert into public.events (created_by, type, martial_art_id, title, starts_at, ends_at, city, state, status)
  values (v_prof, 'workshop', bjj, 'Workshop de arbitragem (rascunho)', date_trunc('day', now()) + interval '40 days 12 hours',
          date_trunc('day', now()) + interval '40 days 16 hours', 'Curitiba', 'PR', 'draft');
end;
$$;

-- ---------------------------------------------------------------------------
-- Fase 6: denúncias de demonstração para a fila de moderação (moderador@ e admin@).
-- Um post do atleta25 com 3 denúncias (uma de segurança de menores) e um perfil denunciado por spam.
-- ---------------------------------------------------------------------------
do $$
declare
  v_target uuid := (select id from public.profiles where username = 'atleta25');
  v_post   uuid;
  v_i      integer;
begin
  select id into v_post from public.posts where author_id = v_target and deleted_at is null order by created_at desc limit 1;
  for v_i in 10..12 loop
    insert into public.reports (reporter_id, target_type, target_id, reason, details)
    values ((select id from public.profiles where username = 'atleta' || v_i), 'post', v_post,
            (array['spam', 'minor_safety', 'harassment'])[v_i - 9]::public.report_reason,
            case when v_i = 11 then 'Parece mostrar uma criança sem autorização.' end);
  end loop;
  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values ((select id from public.profiles where username = 'atleta13'), 'profile', (select id from public.profiles where username = 'atleta24'),
          'spam', 'Divulga links de apostas nos comentários.');
end;
$$;
