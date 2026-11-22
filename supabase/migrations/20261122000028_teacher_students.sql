-- Pós-evolução (22/11/2026, pedido do usuário): o professor associa alunos a ele e o perfil mostra quantos tem.
-- Aceite mútuo, como os vínculos com academias (Fase 4): quem não iniciou o pedido decide.
--   * o professor convida pelo @usuário e o aluno aceita;
--   * o aluno pede ("Sou aluno") na página do professor e o professor aceita.
-- O total de alunos é público (teacher_profiles.student_count, exposto em teacher_cards).
-- A lista de alunos só aparece para as duas partes do vínculo.

alter type public.notification_type add value if not exists 'student_invite';
alter type public.notification_type add value if not exists 'student_request';
alter type public.notification_type add value if not exists 'student_accepted';

alter table public.teacher_profiles add column student_count integer not null default 0 check (student_count >= 0);

create table public.teacher_students (
  teacher_id   uuid not null references public.teacher_profiles (user_id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'active')),
  requested_by text not null check (requested_by in ('teacher', 'student')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (teacher_id, student_id),
  constraint teacher_students_not_self check (teacher_id <> student_id)
);

-- O contador também atualiza teacher_profiles: isso não pode contar como "reenviar pedido recusado".
create or replace function public.teacher_profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_notes := null;
    new.student_count := 0;
  elsif old.status = 'rejected' and new.status = 'rejected' and new.reviewed_at is not distinct from old.reviewed_at
        and new.student_count is not distinct from old.student_count then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create index teacher_students_student_idx on public.teacher_students (student_id);
create index teacher_students_active_idx on public.teacher_students (teacher_id) where status = 'active';

-- Contador de alunos ativos.
create or replace function public.teacher_students_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old integer := case when tg_op in ('UPDATE', 'DELETE') and old.status = 'active' then 1 else 0 end;
  v_new integer := case when tg_op in ('INSERT', 'UPDATE') and new.status = 'active' then 1 else 0 end;
begin
  if tg_op in ('UPDATE', 'DELETE') and v_old = 1 and (tg_op = 'DELETE' or v_new = 0) then
    update public.teacher_profiles set student_count = greatest(student_count - 1, 0) where user_id = old.teacher_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and v_new = 1 and v_old = 0 then
    update public.teacher_profiles set student_count = student_count + 1 where user_id = new.teacher_id;
  end if;
  return null;
end;
$$;

create trigger teacher_students_counter
  after insert or update of status or delete on public.teacher_students
  for each row execute function public.teacher_students_counter();

-- Bloquear desfaz o vínculo nos dois sentidos (como os follows).
create or replace function public.blocked_users_remove_students()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.teacher_students
  where (teacher_id = new.blocker_id and student_id = new.blocked_id)
     or (teacher_id = new.blocked_id and student_id = new.blocker_id);
  return null;
end;
$$;

create trigger blocked_users_remove_students
  after insert on public.blocked_users
  for each row execute function public.blocked_users_remove_students();

-- Só leitura direta (cada parte vê os próprios vínculos); toda escrita passa pelas funções abaixo.
alter table public.teacher_students enable row level security;
revoke all on public.teacher_students from anon, authenticated;
grant select on public.teacher_students to authenticated;

create policy teacher_students_select on public.teacher_students
  for select to authenticated
  using (teacher_id = (select auth.uid()) or student_id = (select auth.uid()));

-- Cartões com nome e foto das duas partes (respeita a RLS do vínculo e dos perfis). O aluno não lê
-- teacher_profiles: o nome profissional vem de teacher_cards (só aprovados), com o nome do perfil como reserva.
create view public.teacher_student_cards with (security_invoker = true) as
select
  ts.teacher_id,
  ts.student_id,
  ts.status,
  ts.requested_by,
  ts.created_at,
  ts.accepted_at,
  coalesce((select c.professional_name from public.teacher_cards c where c.user_id = ts.teacher_id), t.display_name) as teacher_name,
  t.username::text     as teacher_username,
  t.avatar_path        as teacher_avatar_path,
  s.username::text     as student_username,
  s.display_name       as student_display_name,
  s.avatar_path        as student_avatar_path
from public.teacher_students ts
join public.profiles t on t.id = ts.teacher_id
join public.profiles s on s.id = ts.student_id;

revoke all on public.teacher_student_cards from anon, authenticated;
grant select on public.teacher_student_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Funções do vínculo
-- ---------------------------------------------------------------------------
create or replace function public.assert_caller_active()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and status <> 'active') then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- Professor aprovado convida um aluno pelo @usuário. Se a pessoa já tinha pedido, ativa na hora.
create or replace function public.invite_student(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := public.assert_caller_active();
  v_target   uuid;
  v_existing public.teacher_students;
begin
  if not public.is_approved_teacher(v_uid) then
    raise exception 'teacher_not_approved' using errcode = '42501';
  end if;
  select id into v_target from public.profiles
  where username = lower(ltrim(btrim(p_username), '@'))::extensions.citext and status = 'active';
  if v_target is null or public.is_blocked_between(v_target, v_uid) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if v_target = v_uid then
    raise exception 'cannot_add_self' using errcode = '22023';
  end if;

  select * into v_existing from public.teacher_students where teacher_id = v_uid and student_id = v_target;
  if found and v_existing.status = 'active' then
    return 'active';
  elsif found and v_existing.requested_by = 'student' then
    update public.teacher_students set status = 'active', accepted_at = now()
    where teacher_id = v_uid and student_id = v_target;
    perform public.notify(v_target, v_uid, 'student_accepted');
    return 'active';
  elsif found then
    return 'pending';
  end if;

  perform public.enforce_rate_limit('student_invite:' || v_uid, 100, interval '1 day');
  insert into public.teacher_students (teacher_id, student_id, status, requested_by)
  values (v_uid, v_target, 'pending', 'teacher');
  perform public.notify(v_target, v_uid, 'student_invite');
  return 'pending';
end;
$$;

-- Pessoa pede para constar como aluno de um professor aprovado. Se o professor já tinha convidado, ativa na hora.
create or replace function public.request_teacher(p_teacher uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := public.assert_caller_active();
  v_existing public.teacher_students;
begin
  if p_teacher = v_uid then
    raise exception 'cannot_add_self' using errcode = '22023';
  end if;
  if not public.is_approved_teacher(p_teacher)
     or not exists (select 1 from public.profiles where id = p_teacher and status = 'active')
     or public.is_blocked_between(p_teacher, v_uid) then
    raise exception 'teacher_not_found' using errcode = 'P0002';
  end if;

  select * into v_existing from public.teacher_students where teacher_id = p_teacher and student_id = v_uid;
  if found and v_existing.status = 'active' then
    return 'active';
  elsif found and v_existing.requested_by = 'teacher' then
    update public.teacher_students set status = 'active', accepted_at = now()
    where teacher_id = p_teacher and student_id = v_uid;
    perform public.notify(p_teacher, v_uid, 'student_accepted');
    return 'active';
  elsif found then
    return 'pending';
  end if;

  perform public.enforce_rate_limit('student_request:' || v_uid, 30, interval '1 day');
  insert into public.teacher_students (teacher_id, student_id, status, requested_by)
  values (p_teacher, v_uid, 'pending', 'student');
  perform public.notify(p_teacher, v_uid, 'student_request');
  return 'pending';
end;
$$;

-- Responder: quem não iniciou decide. Recusar apaga o pedido (pode ser refeito depois).
create or replace function public.respond_student_link(p_teacher uuid, p_student uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_caller_active();
  v_row public.teacher_students;
begin
  select * into v_row from public.teacher_students
  where teacher_id = p_teacher and student_id = p_student and status = 'pending';
  if not found then
    raise exception 'link_not_found' using errcode = 'P0002';
  end if;
  if (v_row.requested_by = 'teacher' and v_uid <> p_student)
     or (v_row.requested_by = 'student' and v_uid <> p_teacher) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_accept then
    if not public.is_approved_teacher(p_teacher) then
      raise exception 'teacher_not_approved' using errcode = '42501';
    end if;
    update public.teacher_students set status = 'active', accepted_at = now()
    where teacher_id = p_teacher and student_id = p_student;
    perform public.notify(case when v_uid = p_teacher then p_student else p_teacher end, v_uid, 'student_accepted');
  else
    delete from public.teacher_students where teacher_id = p_teacher and student_id = p_student;
  end if;
end;
$$;

-- Qualquer uma das partes desfaz o vínculo ou cancela o pedido.
create or replace function public.remove_student_link(p_teacher uuid, p_student uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or v_uid not in (p_teacher, p_student) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.teacher_students where teacher_id = p_teacher and student_id = p_student;
  if not found then
    raise exception 'link_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function
  public.teacher_students_counter(), public.blocked_users_remove_students()
  from public, anon, authenticated;
revoke execute on function
  public.assert_caller_active(), public.invite_student(text), public.request_teacher(uuid),
  public.respond_student_link(uuid, uuid, boolean), public.remove_student_link(uuid, uuid)
  from public, anon;
grant execute on function
  public.invite_student(text), public.request_teacher(uuid),
  public.respond_student_link(uuid, uuid, boolean), public.remove_student_link(uuid, uuid)
  to authenticated;
revoke execute on function public.assert_caller_active() from authenticated;

-- teacher_cards ganha o total de alunos no fim (create or replace só acrescenta colunas no final).
create or replace view public.teacher_cards as
select
  t.user_id,
  p.username::text      as username,
  p.display_name,
  p.avatar_path,
  p.city,
  p.state,
  t.professional_name,
  t.bio,
  t.experience_years,
  t.lineage,
  t.certifications,
  t.social_links,
  case when t.show_contact then t.contact_email end as contact_email,
  case when t.show_contact then t.contact_phone end as contact_phone,
  coalesce((
    select jsonb_agg(jsonb_build_object('martial_art', m.name, 'slug', m.slug, 'rank', r.name, 'color', r.color_hex)
                     order by m.sort_order)
    from public.teacher_martial_arts tm
    join public.martial_arts m on m.id = tm.martial_art_id
    left join public.martial_art_ranks r on r.id = tm.rank_id
    where tm.teacher_id = t.user_id
  ), '[]'::jsonb) as martial_arts,
  t.access_plans,
  t.student_count
from public.teacher_profiles t
join public.profiles p on p.id = t.user_id
where t.status = 'approved'
  and p.status = 'active'
  and not public.has_blocked_me(p.id);

revoke insert, update, delete on public.teacher_cards from anon, authenticated;
