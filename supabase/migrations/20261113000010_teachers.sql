-- Fase 4 · Perfil profissional de professor, com aprovação pelo admin.
-- "Professor" na plataforma = teacher_profiles.status = 'approved' (DATA_MODEL.md §2).

create type public.teacher_status as enum ('pending', 'approved', 'rejected', 'revoked');

-- Lista JSON de URLs, todas https (DATA_MODEL.md: social_links validado).
create or replace function public.is_https_url_list(p_links jsonb, p_max integer)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select jsonb_typeof(p_links) = 'array'
     and jsonb_array_length(p_links) <= p_max
     and not exists (
       select 1 from jsonb_array_elements(p_links) e
       where jsonb_typeof(e) <> 'string'
          or (e #>> '{}') !~ '^https://[^\s<>"]{3,}$'
          or char_length(e #>> '{}') > 300
     );
$$;

create table public.teacher_profiles (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  professional_name text not null constraint teacher_profiles_name_length check (char_length(btrim(professional_name)) between 2 and 80),
  bio               text constraint teacher_profiles_bio_length check (char_length(bio) <= 2000),
  experience_years  smallint check (experience_years between 0 and 80),
  lineage           text constraint teacher_profiles_lineage_length check (char_length(lineage) <= 300),
  -- Lista de {title, issuer, year}
  certifications    jsonb not null default '[]'::jsonb
                      constraint teacher_profiles_certifications check (
                        jsonb_typeof(certifications) = 'array' and jsonb_array_length(certifications) <= 20
                      ),
  contact_email     text constraint teacher_profiles_contact_email check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contact_email) <= 254),
  contact_phone     text constraint teacher_profiles_contact_phone check (contact_phone ~ '^\+?[0-9 ()-]{8,20}$'),
  show_contact      boolean not null default false,  -- consentimento específico (SECURITY.md §7)
  social_links      jsonb not null default '[]'::jsonb
                      constraint teacher_profiles_social_links check (public.is_https_url_list(social_links, 10)),
  status            public.teacher_status not null default 'pending',
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,
  review_notes      text constraint teacher_profiles_review_notes_length check (char_length(review_notes) <= 1000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index teacher_profiles_pending_idx on public.teacher_profiles (created_at) where status = 'pending';

create trigger teacher_profiles_set_updated_at
  before update on public.teacher_profiles
  for each row execute function public.set_updated_at();

create table public.teacher_martial_arts (
  teacher_id     uuid not null references public.teacher_profiles (user_id) on delete cascade,
  martial_art_id uuid not null references public.martial_arts (id) on delete cascade,
  rank_id        uuid references public.martial_art_ranks (id) on delete set null,
  primary key (teacher_id, martial_art_id)
);

create or replace function public.is_approved_teacher(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.teacher_profiles where user_id = p_user and status = 'approved');
$$;

-- Pedido sempre nasce pendente. Reenviar depois de recusado volta para pendente.
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
  elsif old.status = 'rejected' and new.status = 'rejected' and new.reviewed_at is not distinct from old.reviewed_at then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger teacher_profiles_before_write
  before insert or update on public.teacher_profiles
  for each row execute function public.teacher_profiles_before_write();

create or replace function public.teacher_martial_arts_check_rank()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rank_id is not null and not exists (
    select 1 from public.martial_art_ranks where id = new.rank_id and martial_art_id = new.martial_art_id
  ) then
    raise exception 'rank_not_in_martial_art' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger teacher_martial_arts_check_rank
  before insert or update on public.teacher_martial_arts
  for each row execute function public.teacher_martial_arts_check_rank();

-- Revisão pelo admin (aprovar, recusar ou revogar), com auditoria e aviso ao professor.
create or replace function public.review_teacher(p_user uuid, p_status public.teacher_status, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status = 'pending' then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.teacher_profiles
  set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = nullif(btrim(p_notes), '')
  where user_id = p_user;
  if not found then
    raise exception 'teacher_profile_not_found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'teacher_' || p_status::text, 'teacher_profiles', p_user::text,
          jsonb_build_object('notes', nullif(btrim(p_notes), '')));

  -- Aviso ao professor (notify ganha a versão com academia na migration 12; resolvida em tempo de execução).
  perform public.notify(p_user, auth.uid(), 'moderation');
end;
$$;

-- Página pública do professor: só aprovados, e contato só com consentimento (show_contact).
-- View com permissões do dono (não security_invoker) de propósito: a tabela base é restrita a dono e admin.
create view public.teacher_cards as
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
  ), '[]'::jsonb) as martial_arts
from public.teacher_profiles t
join public.profiles p on p.id = t.user_id
where t.status = 'approved'
  and p.status = 'active'
  and not public.has_blocked_me(p.id);

revoke all on public.teacher_profiles, public.teacher_martial_arts from anon, authenticated;
grant select on public.teacher_profiles to authenticated;
grant insert (user_id, professional_name, bio, experience_years, lineage, certifications,
              contact_email, contact_phone, show_contact, social_links)
  on public.teacher_profiles to authenticated;
grant update (professional_name, bio, experience_years, lineage, certifications,
              contact_email, contact_phone, show_contact, social_links)
  on public.teacher_profiles to authenticated;
grant delete on public.teacher_profiles to authenticated;
grant select on public.teacher_martial_arts to anon, authenticated;
grant insert, update, delete on public.teacher_martial_arts to authenticated;
grant select on public.teacher_cards to anon, authenticated;

revoke execute on function public.review_teacher(uuid, public.teacher_status, text) from public, anon;
grant execute on function public.review_teacher(uuid, public.teacher_status, text) to authenticated;

alter table public.teacher_profiles     enable row level security;
alter table public.teacher_martial_arts enable row level security;

create policy teacher_profiles_select on public.teacher_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('admin')));
create policy teacher_profiles_insert_own on public.teacher_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy teacher_profiles_update_own on public.teacher_profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy teacher_profiles_delete_own on public.teacher_profiles
  for delete to authenticated using (user_id = (select auth.uid()));

create policy teacher_martial_arts_select on public.teacher_martial_arts
  for select to anon, authenticated
  using (teacher_id = (select auth.uid()) or public.is_approved_teacher(teacher_id) or (select public.has_role('admin')));
create policy teacher_martial_arts_write_own on public.teacher_martial_arts
  for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
