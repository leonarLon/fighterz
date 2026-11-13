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
