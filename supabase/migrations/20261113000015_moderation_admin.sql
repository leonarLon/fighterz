-- Fase 6 · Moderação e administração: histórico de moderação (append-only), suspensão com prazo,
-- fila de denúncias, verificação de academias, configurações da plataforma e rotinas agendadas.

create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- Histórico de moderação (SECURITY.md §3: toda ação administrativa deixa registro)
-- ---------------------------------------------------------------------------
create type public.moderation_action as enum (
  'remove_content', 'restore_content', 'dismiss_reports', 'warn',
  'suspend', 'unsuspend', 'ban', 'verify', 'unverify'
);

create table public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.profiles (id) on delete set null,  -- nulo = rotina automática
  target_type  public.report_target not null,
  target_id    uuid not null,
  action       public.moderation_action not null,
  reason       text constraint moderation_actions_reason_length check (char_length(reason) <= 1000),
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index moderation_actions_created_idx on public.moderation_actions (created_at desc);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id, created_at desc);

-- Só funções de moderação (security definer) escrevem. Ninguém altera nem apaga.
revoke all on public.moderation_actions from anon, authenticated;
grant select on public.moderation_actions to authenticated;
alter table public.moderation_actions enable row level security;
create policy moderation_actions_select on public.moderation_actions
  for select to authenticated using ((select public.has_role('moderator')));

create or replace function public.log_moderation(
  p_target_type public.report_target, p_target_id uuid, p_action public.moderation_action,
  p_reason text default null, p_expires_at timestamptz default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, expires_at)
  values (auth.uid(), p_target_type, p_target_id, p_action, nullif(btrim(p_reason), ''), p_expires_at);
$$;

-- ---------------------------------------------------------------------------
-- Suspensão: perfil some, login é bloqueado (auth.users.banned_until) e escrita é negada
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column suspended_until   timestamptz,
  add column suspension_reason text constraint profiles_suspension_reason_length check (char_length(suspension_reason) <= 500);

-- Conta suspensa não escreve, mesmo com um JWT ainda válido (dura até 1 h).
create or replace function public.assert_active_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and exists (select 1 from public.profiles where id = auth.uid() and status <> 'active') then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'posts', 'comments', 'post_likes', 'comment_likes', 'saved_posts', 'post_mentions', 'follows', 'reports',
    'teacher_profiles', 'teacher_martial_arts', 'academies', 'academy_units', 'class_schedules',
    'academy_memberships', 'academy_followers', 'user_martial_arts', 'rank_promotions',
    'athlete_achievements', 'training_checkins', 'events', 'event_interests'
  ] loop
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.assert_active_account()',
      t || '_assert_active', t);
  end loop;
end;
$$;

-- Hierarquia: ninguém modera quem tem papel igual ou maior que o seu.
create or replace function public.platform_rank(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(case role when 'superadmin' then 3 when 'admin' then 2 when 'moderator' then 1 end), 0)
  from public.user_roles where user_id = p_user;
$$;

create or replace function public.suspend_user(p_user uuid, p_days integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz;
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = auth.uid() or public.platform_rank(p_user) >= public.platform_rank(auth.uid()) then
    raise exception 'cannot_moderate_peer' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  -- Moderador: até 30 dias. Banimento (sem prazo) e prazos maiores: admin.
  if p_days is null or p_days > 30 then
    if not public.has_role('admin') then
      raise exception 'admin_only' using errcode = '42501';
    end if;
  end if;
  if p_days is not null and (p_days < 1 or p_days > 365) then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  v_until := case when p_days is null then null else now() + make_interval(days => p_days) end;

  update public.profiles
  set status = 'suspended', suspended_until = v_until, suspension_reason = btrim(p_reason)
  where id = p_user and status <> 'deleted';
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  -- Login bloqueado pelo Auth e sessões encerradas (o refresh token deixa de valer).
  update auth.users set banned_until = coalesce(v_until, now() + interval '100 years') where id = p_user;
  delete from auth.sessions where user_id = p_user;

  perform public.log_moderation('profile', p_user, case when p_days is null then 'ban' else 'suspend' end::public.moderation_action,
                                p_reason, v_until);
end;
$$;

create or replace function public.unsuspend_user(p_user uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() nulo = rotina agendada (lift_expired_suspensions).
  if auth.uid() is not null then
    if not public.has_role('moderator') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    -- Banimento só um admin desfaz.
    if exists (select 1 from public.profiles where id = p_user and status = 'suspended' and suspended_until is null)
       and not public.has_role('admin') then
      raise exception 'admin_only' using errcode = '42501';
    end if;
  end if;

  update public.profiles
  set status = 'active', suspended_until = null, suspension_reason = null
  where id = p_user and status = 'suspended';
  if not found then
    raise exception 'user_not_suspended' using errcode = 'P0002';
  end if;
  update auth.users set banned_until = null where id = p_user;
  perform public.log_moderation('profile', p_user, 'unsuspend', coalesce(p_reason, case when auth.uid() is null then 'Prazo encerrado' end));
end;
$$;

create or replace function public.lift_expired_suspensions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_count integer := 0;
begin
  for v_user in
    select id from public.profiles where status = 'suspended' and suspended_until is not null and suspended_until <= now()
  loop
    perform public.unsuspend_user(v_user);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Post de quem está suspenso também some para seguidores (antes só o "público" checava o autor).
create or replace function public.can_view_post_row(
  p_author uuid, p_visibility public.visibility, p_moderation public.moderation_status, p_deleted_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_deleted_at is null and (
    p_author = (select auth.uid())
    or public.has_role('moderator')
    or (
      p_moderation = 'visible'
      and case p_visibility
            when 'public'    then public.can_view_profile_content(p_author)
            when 'followers' then public.is_following(p_author)
                                  and not public.is_blocked_between(p_author, (select auth.uid()))
                                  and exists (select 1 from public.profiles a where a.id = p_author and a.status = 'active')
            else false
          end
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Denúncias: academias e eventos também podem ser denunciados
-- ---------------------------------------------------------------------------
create or replace function public.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean := false;
begin
  if auth.uid() is not null then
    perform public.enforce_rate_limit('report:' || new.reporter_id, 20, interval '1 day');
  end if;

  if new.target_type = 'post' then
    v_exists := exists (select 1 from public.posts where id = new.target_id);
  elsif new.target_type = 'comment' then
    v_exists := exists (select 1 from public.comments where id = new.target_id);
  elsif new.target_type = 'profile' then
    v_exists := exists (select 1 from public.profiles where id = new.target_id);
  elsif new.target_type = 'academy' then
    v_exists := exists (select 1 from public.academies where id = new.target_id);
  elsif new.target_type = 'event' then
    v_exists := exists (select 1 from public.events where id = new.target_id);
  end if;

  if not v_exists then
    raise exception 'report_target_not_found' using errcode = 'P0002';
  end if;

  new.status := 'open';
  new.assigned_to := null;
  new.resolved_at := null;
  new.details := nullif(btrim(new.details), '');
  return new;
end;
$$;

-- Dono do conteúdo denunciado (para "suspender o autor" e para não moderar a si mesmo).
create or replace function public.report_target_owner(p_type public.report_target, p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'post'    then (select author_id from public.posts where id = p_id)
    when 'comment' then (select author_id from public.comments where id = p_id)
    when 'profile' then p_id
    when 'academy' then (select created_by from public.academies where id = p_id)
    when 'event'   then (select created_by from public.events where id = p_id)
  end;
$$;

-- Fila agrupada por alvo: minor_safety primeiro, depois mais denúncias, depois as mais antigas.
create or replace function public.get_report_queue(p_status text default 'open', p_limit integer default 50)
returns table (
  target_type public.report_target,
  target_id uuid,
  report_count integer,
  reasons public.report_reason[],
  priority boolean,
  first_reported_at timestamptz,
  last_reported_at timestamptz,
  details text[],
  owner_id uuid,
  owner_username text,
  owner_status public.account_status,
  preview text,
  link text,
  content_state text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  with grouped as (
    select r.target_type, r.target_id,
           count(*)::integer as report_count,
           array_agg(distinct r.reason) as reasons,
           bool_or(r.reason = 'minor_safety') as priority,
           min(r.created_at) as first_reported_at,
           max(r.created_at) as last_reported_at,
           (array_agg(r.details order by r.created_at desc) filter (where r.details is not null))[1:3] as details
    from public.reports r
    where (p_status = 'open' and r.status in ('open', 'in_review'))
       or (p_status = 'closed' and r.status in ('resolved', 'dismissed'))
    group by r.target_type, r.target_id
  )
  select g.target_type, g.target_id, g.report_count, g.reasons, g.priority, g.first_reported_at, g.last_reported_at,
         g.details,
         o.id, o.username::text, o.status,
         case g.target_type
           when 'post'    then (select left(p.caption, 200) from public.posts p where p.id = g.target_id)
           when 'comment' then (select left(c.body, 200) from public.comments c where c.id = g.target_id)
           when 'profile' then (select pr.display_name || ' (@' || pr.username || ')' from public.profiles pr where pr.id = g.target_id)
           when 'academy' then (select a.name from public.academies a where a.id = g.target_id)
           when 'event'   then (select e.title from public.events e where e.id = g.target_id)
         end,
         case g.target_type
           when 'post'    then '/p/' || g.target_id
           when 'comment' then (select '/p/' || c.post_id from public.comments c where c.id = g.target_id)
           when 'profile' then (select '/u/' || pr.username from public.profiles pr where pr.id = g.target_id)
           when 'academy' then (select '/academias/' || a.slug from public.academies a where a.id = g.target_id)
           when 'event'   then '/eventos/' || g.target_id
         end,
         case g.target_type
           when 'post'    then (select case when p.deleted_at is not null then 'deleted' else p.moderation_status::text end from public.posts p where p.id = g.target_id)
           when 'comment' then (select case when c.deleted_at is not null then 'deleted' else c.moderation_status::text end from public.comments c where c.id = g.target_id)
           when 'profile' then o.status::text
           when 'academy' then (select a.status::text from public.academies a where a.id = g.target_id)
           when 'event'   then (select e.status::text from public.events e where e.id = g.target_id)
         end
  from grouped g
  left join public.profiles o on o.id = public.report_target_owner(g.target_type, g.target_id)
  order by g.priority desc, g.report_count desc, g.first_reported_at
  limit least(greatest(p_limit, 1), 200);
end;
$$;

-- Remover ou restaurar conteúdo. Fecha as denúncias abertas do alvo.
create or replace function public.moderate_content(
  p_target_type public.report_target, p_target_id uuid, p_remove boolean, p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.report_target_owner(p_target_type, p_target_id);
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_owner is null then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
  if v_owner = auth.uid() or public.platform_rank(v_owner) >= public.platform_rank(auth.uid()) then
    raise exception 'cannot_moderate_peer' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;

  if p_target_type = 'post' then
    update public.posts set moderation_status = case when p_remove then 'removed' else 'visible' end::public.moderation_status
    where id = p_target_id;
  elsif p_target_type = 'comment' then
    update public.comments set moderation_status = case when p_remove then 'removed' else 'visible' end::public.moderation_status
    where id = p_target_id;
  elsif p_target_type = 'academy' then
    update public.academies set status = case when p_remove then 'suspended' else 'active' end::public.academy_status
    where id = p_target_id;
  elsif p_target_type = 'event' then
    if not p_remove then
      raise exception 'event_cannot_be_restored' using errcode = '23514';
    end if;
    update public.events set status = 'cancelled' where id = p_target_id and status <> 'cancelled';
  else
    raise exception 'use_suspend_user' using errcode = '22023';
  end if;

  update public.reports
  set status = 'resolved', resolved_at = now(), assigned_to = auth.uid()
  where target_type = p_target_type and target_id = p_target_id and status in ('open', 'in_review');

  perform public.log_moderation(p_target_type, p_target_id,
                                case when p_remove then 'remove_content' else 'restore_content' end::public.moderation_action, p_reason);
  -- Aviso ao dono, sem expor quem moderou (ator nulo). O conteúdo vai junto para o texto e o link.
  if p_remove and p_target_type in ('post', 'comment', 'academy') then
    perform public.notify(
      v_owner, null, 'moderation',
      case p_target_type
        when 'post' then p_target_id
        when 'comment' then (select post_id from public.comments where id = p_target_id)
      end,
      case when p_target_type = 'comment' then p_target_id end,
      case when p_target_type = 'academy' then p_target_id end
    );
  end if;
end;
$$;

-- Descartar (improcedente) ou marcar como resolvidas sem mexer no conteúdo.
create or replace function public.close_reports(
  p_target_type public.report_target, p_target_id uuid, p_dismiss boolean, p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.reports
  set status = case when p_dismiss then 'dismissed' else 'resolved' end::public.report_status,
      resolved_at = now(), assigned_to = auth.uid()
  where target_type = p_target_type and target_id = p_target_id and status in ('open', 'in_review');
  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform public.log_moderation(p_target_type, p_target_id, 'dismiss_reports',
                                  coalesce(nullif(btrim(p_reason), ''), case when p_dismiss then 'Denúncias improcedentes' else 'Resolvido' end));
  end if;
  -- Conteúdo ocultado preventivamente volta a aparecer quando as denúncias são descartadas.
  if p_dismiss then
    if p_target_type = 'post' then
      update public.posts set moderation_status = 'visible' where id = p_target_id and moderation_status = 'under_review';
    elsif p_target_type = 'comment' then
      update public.comments set moderation_status = 'visible' where id = p_target_id and moderation_status = 'under_review';
    end if;
  end if;
  return v_count;
end;
$$;

-- Selo de verificação da academia (só admin).
create or replace function public.set_academy_verified(p_academy uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.academies set is_verified = p_verified where id = p_academy;
  if not found then
    raise exception 'academy_not_found' using errcode = 'P0002';
  end if;
  perform public.log_moderation('academy', p_academy, case when p_verified then 'verify' else 'unverify' end::public.moderation_action);
end;
$$;

-- ---------------------------------------------------------------------------
-- Painel: números e busca de usuários
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'open_reports',     (select count(distinct (target_type, target_id)) from public.reports where status in ('open', 'in_review')),
    'priority_reports', (select count(distinct (target_type, target_id)) from public.reports
                         where status in ('open', 'in_review') and reason = 'minor_safety'),
    'under_review',     (select count(*) from public.posts where moderation_status = 'under_review' and deleted_at is null)
                      + (select count(*) from public.comments where moderation_status = 'under_review' and deleted_at is null),
    'pending_teachers', (select count(*) from public.teacher_profiles where status = 'pending'),
    'suspended_users',  (select count(*) from public.profiles where status = 'suspended'),
    'users',            (select count(*) from public.profiles where status <> 'deleted'),
    'new_users_7d',     (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'posts_24h',        (select count(*) from public.posts where created_at >= now() - interval '24 hours' and deleted_at is null),
    'academies',        (select count(*) from public.academies),
    'upcoming_events',  (select count(*) from public.events where status = 'published' and ends_at >= now())
  );
end;
$$;

-- E-mail só para admin (moderador vê o resto): minimização (SECURITY.md §7).
create or replace function public.admin_search_users(p_query text default null, p_status public.account_status default null, p_limit integer default 50)
returns table (
  id uuid, username text, display_name text, email text, status public.account_status,
  suspended_until timestamptz, suspension_reason text, roles public.platform_role[],
  post_count integer, open_reports integer, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(public.search_normalize(coalesce(p_query, '')), '');
  v_admin boolean := public.has_role('admin');
begin
  if not public.has_role('moderator') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select p.id, p.username::text, p.display_name,
         case when v_admin then u.email::text end,
         p.status, p.suspended_until, p.suspension_reason,
         coalesce((select array_agg(r.role order by r.role) from public.user_roles r where r.user_id = p.id), '{}'),
         p.post_count,
         (select count(*)::integer from public.reports rp
          where rp.status in ('open', 'in_review')
            and public.report_target_owner(rp.target_type, rp.target_id) = p.id),
         p.created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.status <> 'deleted'
    and (p_status is null or p.status = p_status)
    and (v_q is null
         or public.search_normalize(p.username::text) like '%' || v_q || '%'
         or public.search_normalize(p.display_name) like '%' || v_q || '%'
         or (v_admin and lower(u.email::text) like '%' || lower(btrim(p_query)) || '%'))
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 100);
end;
$$;

-- ---------------------------------------------------------------------------
-- Configurações da plataforma (linha única)
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  id           boolean primary key default true check (id),
  signups_open boolean not null default true,
  announcement text constraint platform_settings_announcement_length check (char_length(announcement) <= 280),
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);
insert into public.platform_settings (id) values (true);

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();
create trigger platform_settings_audit
  after update on public.platform_settings
  for each row execute function public.audit_row_change();

revoke all on public.platform_settings from anon, authenticated;
grant select on public.platform_settings to anon, authenticated;
grant update (signups_open, announcement, updated_by) on public.platform_settings to authenticated;
alter table public.platform_settings enable row level security;
create policy platform_settings_select on public.platform_settings for select to anon, authenticated using (true);
create policy platform_settings_update_admin on public.platform_settings
  for update to authenticated
  using ((select public.has_role('admin')))
  with check ((select public.has_role('admin')) and updated_by = (select auth.uid()));

-- Cadastro fechado barra novos usuários no banco (o formulário avisa antes).
create or replace function public.check_signups_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((select signups_open from public.platform_settings where id), true) then
    raise exception 'signups_closed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger check_signups_open
  before insert on auth.users
  for each row execute function public.check_signups_open();

-- ---------------------------------------------------------------------------
-- Permissões das funções
-- ---------------------------------------------------------------------------
revoke execute on function public.log_moderation(public.report_target, uuid, public.moderation_action, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.assert_active_account() from public, anon, authenticated;
revoke execute on function public.lift_expired_suspensions() from public, anon, authenticated;
revoke execute on function public.check_signups_open() from public, anon, authenticated;
revoke execute on function public.platform_rank(uuid) from public, anon;
revoke execute on function public.report_target_owner(public.report_target, uuid) from public, anon;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.suspend_user(uuid, integer, text)',
    'public.unsuspend_user(uuid, text)',
    'public.get_report_queue(text, integer)',
    'public.moderate_content(public.report_target, uuid, boolean, text)',
    'public.close_reports(public.report_target, uuid, boolean, text)',
    'public.set_academy_verified(uuid, boolean)',
    'public.get_admin_overview()',
    'public.admin_search_users(text, public.account_status, integer)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Suspensões com prazo expiram sozinhas (pg_cron é gratuito e vem no Supabase).
select cron.schedule('lift-expired-suspensions', '*/10 * * * *', $$select public.lift_expired_suspensions()$$);

-- Revisão de RLS: o privilégio padrão do Supabase dá escrita em toda view nova para anon/authenticated.
-- Nenhuma view é atualizável hoje (todas têm join), mas a permissão não deve existir.
-- O teste 16_rls_review falha se uma view nova voltar a ter escrita.
do $$
declare
  v text;
begin
  for v in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'v' loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon, authenticated', v);
  end loop;
end;
$$;
