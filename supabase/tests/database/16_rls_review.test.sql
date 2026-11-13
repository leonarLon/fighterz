begin;
\ir _helpers.psql

-- Revisão automática de segurança (Fase 6): regras que valem para TODO objeto novo do schema public.
select plan(8);

select is(
  array(select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity order by 1),
  '{}'::text[],
  'toda tabela do public tem RLS ativa'
);

-- Tabela com RLS e sem política nenhuma fica inacessível: só é aceitável se for de uso interno.
select is(
  array(select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
          and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
          and c.relname not in ('rate_limits', 'geocode_cache')
        order by 1),
  '{}'::text[],
  'toda tabela exposta tem política (exceto as internas rate_limits e geocode_cache)'
);

select is(
  array(select distinct table_name::text from information_schema.role_table_grants
        where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
        order by 1),
  '{}'::text[],
  'visitante (anon) não tem permissão de escrita em nenhuma tabela ou view'
);

select is(
  array(select distinct g.table_name::text from information_schema.role_table_grants g
        join pg_class c on c.relname = g.table_name join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
        where g.table_schema = 'public' and g.grantee = 'authenticated' and c.relkind = 'v'
          and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
        order by 1),
  '{}'::text[],
  'nenhuma view aceita escrita de usuários logados'
);

select is(
  array(select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')
        order by 1),
  '{}'::text[],
  'toda função security definer fixa o search_path'
);

-- Views rodam com as permissões de quem consulta, exceto as que filtram de propósito (documentadas).
select is(
  array(select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'v'
          and not coalesce('security_invoker=true' = any (c.reloptions), false)
          and c.relname not in ('teacher_cards')
        order by 1),
  '{}'::text[],
  'views são security_invoker (exceção documentada: teacher_cards)'
);

-- Funções internas (triggers, rotinas, helpers de escrita) não podem ser chamadas por clientes.
select is(
  array(select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('notify', 'log_moderation', 'lift_expired_suspensions', 'refresh_current_rank',
                            'enforce_rate_limit', 'check_rate_limit', 'assert_active_account', 'check_signups_open')
          and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
        order by 1),
  '{}'::text[],
  'funções internas não são executáveis por anon/authenticated'
);

-- Colunas sensíveis de profiles: só funções de moderação mudam status e suspensão.
select is(
  array(select column_name::text from information_schema.column_privileges
        where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated' and privilege_type = 'UPDATE'
          and column_name in ('status', 'suspended_until', 'suspension_reason', 'follower_count', 'post_count')
        order by 1),
  '{}'::text[],
  'usuário não altera status, suspensão nem contadores do próprio perfil'
);

select * from finish();
rollback;
