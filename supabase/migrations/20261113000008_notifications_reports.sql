-- Fase 3 · Notificações (geradas só por triggers) e denúncias com ocultação preventiva.

-- ---------------------------------------------------------------------------
-- Notificações
-- ---------------------------------------------------------------------------
create type public.notification_type as enum (
  'follow', 'follow_request', 'like', 'comment', 'reply', 'mention',
  'class_update', 'event_update', 'promotion_confirmed', 'membership_request', 'moderation'
);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete cascade,
  type         public.notification_type not null,
  post_id      uuid references public.posts (id) on delete cascade,
  comment_id   uuid references public.comments (id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc, id desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;
-- Curtir, descurtir e curtir de novo não gera notificação repetida.
create unique index notifications_like_dedup_idx on public.notifications (recipient_id, actor_id, type, post_id)
  where type = 'like';
create unique index notifications_follow_dedup_idx on public.notifications (recipient_id, actor_id, type)
  where type in ('follow', 'follow_request');

create or replace function public.notify(
  p_recipient uuid, p_actor uuid, p_type public.notification_type,
  p_post uuid default null, p_comment uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
begin
  if p_recipient is null or p_recipient = p_actor or public.is_blocked_between(p_recipient, p_actor) then
    return;
  end if;

  select case p_type
           when 'like'           then s.notify_likes
           when 'comment'        then s.notify_comments
           when 'reply'          then s.notify_comments
           when 'follow'         then s.notify_follows
           when 'follow_request' then true  -- solicitação precisa de resposta: sempre avisa
           when 'mention'        then true  -- marcação precisa de aprovação: sempre avisa
           else true
         end
  into v_enabled
  from public.user_settings s where s.user_id = p_recipient;

  if coalesce(v_enabled, false) then
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
    values (p_recipient, p_actor, p_type, p_post, p_comment)
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.notify_on_like()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id), new.user_id, 'like', new.post_id);
  return null;
end;
$$;

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_post_author   uuid := (select author_id from public.posts where id = new.post_id);
  v_parent_author uuid;
begin
  if new.parent_id is not null then
    v_parent_author := (select author_id from public.comments where id = new.parent_id);
    perform public.notify(v_parent_author, new.author_id, 'reply', new.post_id, new.id);
  end if;
  if v_parent_author is distinct from v_post_author then
    perform public.notify(v_post_author, new.author_id, 'comment', new.post_id, new.id);
  end if;
  return null;
end;
$$;

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.following_id, new.follower_id,
                          (case when new.status = 'accepted' then 'follow' else 'follow_request' end)::public.notification_type);
  elsif old.status = 'pending' and new.status = 'accepted' then
    -- Solicitação aceita: some da lista de pendências.
    delete from public.notifications
    where recipient_id = new.following_id and actor_id = new.follower_id and type = 'follow_request';
  end if;
  return null;
end;
$$;

create or replace function public.cleanup_follow_request_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications
  where recipient_id = old.following_id and actor_id = old.follower_id and type = 'follow_request';
  return null;
end;
$$;

create or replace function public.notify_on_mention()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.user_id, (select author_id from public.posts where id = new.post_id), 'mention', new.post_id);
  return null;
end;
$$;

create trigger post_likes_notify after insert on public.post_likes
  for each row execute function public.notify_on_like();
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_on_comment();
create trigger follows_notify after insert or update on public.follows
  for each row execute function public.notify_on_follow();
create trigger follows_cleanup_notification after delete on public.follows
  for each row when (old.status = 'pending') execute function public.cleanup_follow_request_notification();
create trigger post_mentions_notify after insert on public.post_mentions
  for each row execute function public.notify_on_mention();

create or replace function public.mark_all_notifications_read()
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where recipient_id = (select auth.uid()) and read_at is null;
$$;

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke execute on function public.notify(uuid, uuid, public.notification_type, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.notify_on_like(), public.notify_on_comment(), public.notify_on_follow(),
  public.cleanup_follow_request_notification(), public.notify_on_mention() from public, anon, authenticated;
revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (recipient_id = (select auth.uid()));

-- Realtime (incluso no Supabase): o contador de não lidas escuta INSERTs, filtrados pela RLS.
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Denúncias
-- ---------------------------------------------------------------------------
create type public.report_target as enum ('post', 'comment', 'profile', 'academy', 'event');
create type public.report_reason as enum (
  'spam', 'harassment', 'violence', 'nudity', 'minor_safety', 'impersonation', 'misinformation', 'other'
);
create type public.report_status as enum ('open', 'in_review', 'resolved', 'dismissed');

-- Alvo polimórfico de propósito: a denúncia é registro de auditoria e não some com o alvo.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,  -- anonimizada na exclusão de conta
  target_type public.report_target not null,
  target_id   uuid not null,
  reason      public.report_reason not null,
  details     text constraint reports_details_length check (char_length(details) <= 1000),
  status      public.report_status not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index reports_open_unique_idx on public.reports (reporter_id, target_type, target_id)
  where status in ('open', 'in_review');
-- Fila: minor_safety primeiro, depois as mais antigas.
create index reports_queue_idx on public.reports ((reason = 'minor_safety') desc, created_at)
  where status in ('open', 'in_review');

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

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

  -- Academias e eventos chegam nas Fases 4 e 5.
  if new.target_type = 'post' then
    v_exists := exists (select 1 from public.posts where id = new.target_id);
  elsif new.target_type = 'comment' then
    v_exists := exists (select 1 from public.comments where id = new.target_id);
  elsif new.target_type = 'profile' then
    v_exists := exists (select 1 from public.profiles where id = new.target_id);
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

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

-- Ocultação preventiva (SECURITY.md §5): 3+ denunciantes distintos por motivo grave.
create or replace function public.reports_auto_hide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reason in ('minor_safety', 'nudity', 'violence') and new.target_type in ('post', 'comment') and (
    select count(distinct reporter_id) from public.reports
    where target_type = new.target_type and target_id = new.target_id
      and reason in ('minor_safety', 'nudity', 'violence') and status in ('open', 'in_review')
  ) >= 3 then
    if new.target_type = 'post' then
      update public.posts set moderation_status = 'under_review'
      where id = new.target_id and moderation_status = 'visible';
    else
      update public.comments set moderation_status = 'under_review'
      where id = new.target_id and moderation_status = 'visible';
    end if;
  end if;
  return null;
end;
$$;

create trigger reports_auto_hide
  after insert on public.reports
  for each row execute function public.reports_auto_hide();

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;
grant update (status, assigned_to, resolved_at) on public.reports to authenticated;

revoke execute on function public.reports_before_insert(), public.reports_auto_hide() from public, anon, authenticated;

alter table public.reports enable row level security;

create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.has_role('moderator')));
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_update_moderator on public.reports
  for update to authenticated
  using ((select public.has_role('moderator'))) with check ((select public.has_role('moderator')));
