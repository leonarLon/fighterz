-- Evolução comercial · Fase 8: páginas comerciais entram no painel e na moderação existentes.
-- Denúncia de página, suspensão/reativação pela moderação (moderate_content) e selo pelo admin.
-- As funções abaixo são as da Fase 6 (migration 15) com o novo tipo 'business'.

alter type public.report_target add value if not exists 'business';

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
  elsif new.target_type = 'business' then
    v_exists := exists (select 1 from public.businesses where id = new.target_id);
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


create or replace function public.report_target_owner(p_type public.report_target, p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  -- p_type::text: função SQL é validada na criação e não pode usar o valor novo do enum na mesma transação.
  select case p_type::text
    when 'post'    then (select author_id from public.posts where id = p_id)
    when 'comment' then (select author_id from public.comments where id = p_id)
    when 'profile' then p_id
    when 'academy' then (select created_by from public.academies where id = p_id)
    when 'event'   then (select created_by from public.events where id = p_id)
    when 'business' then coalesce(
      (select user_id from public.business_members where business_id = p_id and role = 'owner' and status = 'active' limit 1),
      (select created_by from public.businesses where id = p_id))
  end;
$$;


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
           when 'business' then (select b.name from public.businesses b where b.id = g.target_id)
         end,
         case g.target_type
           when 'post'    then '/p/' || g.target_id
           when 'comment' then (select '/p/' || c.post_id from public.comments c where c.id = g.target_id)
           when 'profile' then (select '/u/' || pr.username from public.profiles pr where pr.id = g.target_id)
           when 'academy' then (select '/academias/' || a.slug from public.academies a where a.id = g.target_id)
           when 'event'   then '/eventos/' || g.target_id
           when 'business' then (select '/paginas/' || b.slug from public.businesses b where b.id = g.target_id)
         end,
         case g.target_type
           when 'post'    then (select case when p.deleted_at is not null then 'deleted' else p.moderation_status::text end from public.posts p where p.id = g.target_id)
           when 'comment' then (select case when c.deleted_at is not null then 'deleted' else c.moderation_status::text end from public.comments c where c.id = g.target_id)
           when 'profile' then o.status::text
           when 'academy' then (select a.status::text from public.academies a where a.id = g.target_id)
           when 'event'   then (select e.status::text from public.events e where e.id = g.target_id)
           when 'business' then (select b.status::text from public.businesses b where b.id = g.target_id)
         end
  from grouped g
  left join public.profiles o on o.id = public.report_target_owner(g.target_type, g.target_id)
  order by g.priority desc, g.report_count desc, g.first_reported_at
  limit least(greatest(p_limit, 1), 200);
end;
$$;


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
  elsif p_target_type = 'business' then
    update public.businesses set status = case when p_remove then 'suspended' else 'active' end::public.business_status
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


create or replace function public.set_business_verified(p_business uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.businesses set is_verified = p_verified where id = p_business;
  if not found then
    raise exception 'business_not_found' using errcode = 'P0002';
  end if;
  perform public.log_moderation('business', p_business, case when p_verified then 'verify' else 'unverify' end::public.moderation_action);
end;
$$;

revoke execute on function public.set_business_verified(uuid, boolean) from public, anon;
grant execute on function public.set_business_verified(uuid, boolean) to authenticated;
