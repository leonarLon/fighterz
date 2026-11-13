-- Dados de demonstração SOMENTE para o ambiente local (`supabase db reset`).
-- Nunca rodar em produção. Senha de ambos: Figtherz123
--   demo@figtherz.local   usuário comum
--   admin@figtherz.local  superadmin

do $$
declare
  v_demo  uuid := '00000000-0000-4000-8000-000000000001';
  v_admin uuid := '00000000-0000-4000-8000-000000000002';
  u record;
begin
  for u in
    select * from (values
      (v_demo,  'demo@figtherz.local',  'demo',  'Atleta Demo',  '1995-04-10'),
      (v_admin, 'admin@figtherz.local', 'admin', 'Admin Figtherz', '1988-09-21')
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

  insert into public.user_roles (user_id, role, granted_by) values (v_admin, 'superadmin', null);
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
