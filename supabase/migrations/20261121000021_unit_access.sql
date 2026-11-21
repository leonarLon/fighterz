-- Evolução comercial · Fase 4 (21/11/2026): TotalPass, Wellhub e diária POR UNIDADE (PLANO_EVOLUCAO_COMERCIAL.md §4).
-- Uma linha por unidade e tipo. Só a gestão da academia (owner/admin) escreve; o público lê se a academia é visível.
-- Nenhum preço é inventado: diária paga exige valor; "não divulgado" e "gratuita" não têm valor.

create type public.unit_access_kind as enum ('totalpass', 'wellhub', 'day_pass');
create type public.price_status as enum ('paid', 'free', 'undisclosed');

-- Lista curta de textos (planos aceitos): até p_max itens, cada um com 1 a p_len caracteres, sem repetição.
create or replace function public.is_short_text_list(p_list text[], p_max integer, p_len integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(p_list), 0) <= p_max
     and not exists (select 1 from unnest(coalesce(p_list, '{}')) v where char_length(btrim(v)) not between 1 and p_len)
     and coalesce(cardinality(p_list), 0) = (select count(distinct lower(btrim(v))) from unnest(coalesce(p_list, '{}')) v);
$$;

create table public.academy_unit_access (
  id              uuid primary key default gen_random_uuid(),
  unit_id         uuid not null references public.academy_units (id) on delete cascade,
  academy_id      uuid not null references public.academies (id) on delete cascade,  -- copiado da unidade (trigger)
  kind            public.unit_access_kind not null,
  accepted        boolean not null default false,
  plans           text[] not null default '{}'
                    constraint academy_unit_access_plans check (public.is_short_text_list(plans, 10, 40)),
  martial_art_ids uuid[] not null default '{}'
                    constraint academy_unit_access_arts_count check (cardinality(martial_art_ids) <= 20),
  restrictions    text constraint academy_unit_access_restrictions_length check (char_length(restrictions) <= 500),
  access_hours    text constraint academy_unit_access_hours_length check (char_length(access_hours) <= 300),
  notes           text constraint academy_unit_access_notes_length check (char_length(notes) <= 500),
  price_status    public.price_status,
  price_cents     integer constraint academy_unit_access_price_range check (price_cents between 100 and 10000000),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null,
  constraint academy_unit_access_unique unique (unit_id, kind),
  -- Preço só existe para diária.
  constraint academy_unit_access_price_only_day_pass check (kind = 'day_pass' or (price_status is null and price_cents is null)),
  -- Diária oferecida precisa dizer se é paga, gratuita ou não divulgada.
  constraint academy_unit_access_day_pass_status check (kind <> 'day_pass' or not accepted or price_status is not null),
  -- Valor só quando paga, e paga sempre com valor.
  constraint academy_unit_access_price_consistency check ((price_status = 'paid') = (price_cents is not null))
);

create index academy_unit_access_academy_idx on public.academy_unit_access (academy_id);
create index academy_unit_access_accepted_idx on public.academy_unit_access (kind) where accepted;

create or replace function public.academy_unit_access_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_academy uuid;
begin
  select academy_id into v_academy from public.academy_units where id = new.unit_id;
  if v_academy is null then
    raise exception 'unit_not_found' using errcode = 'P0002';
  end if;
  if tg_op = 'UPDATE' and new.unit_id is distinct from old.unit_id then
    raise exception 'unit_immutable' using errcode = '42501';
  end if;
  new.academy_id := v_academy;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.plans := coalesce((select array_agg(btrim(v)) from unnest(new.plans) v), '{}');
  if exists (select 1 from unnest(new.martial_art_ids) m where not exists (select 1 from public.martial_arts where id = m)) then
    raise exception 'martial_art_not_found' using errcode = '23503';
  end if;
  -- Quem não aceita não precisa guardar detalhes antigos que confundiriam a página.
  if not new.accepted then
    new.price_status := null;
    new.price_cents := null;
  end if;
  return new;
end;
$$;

create trigger academy_unit_access_before_write
  before insert or update on public.academy_unit_access
  for each row execute function public.academy_unit_access_before_write();

create trigger academy_unit_access_assert_active
  before insert or update on public.academy_unit_access
  for each row execute function public.assert_active_account();

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
alter table public.academy_unit_access enable row level security;

revoke all on public.academy_unit_access from anon, authenticated;
grant select on public.academy_unit_access to anon, authenticated;
-- updated_at e updated_by vêm do trigger. academy_id pode ser enviado, mas o trigger sempre o troca pelo da unidade.
grant insert (unit_id, academy_id, kind, accepted, plans, martial_art_ids, restrictions, access_hours, notes, price_status, price_cents),
      update (accepted, plans, martial_art_ids, restrictions, access_hours, notes, price_status, price_cents),
      delete
  on public.academy_unit_access to authenticated;

create policy academy_unit_access_select on public.academy_unit_access
  for select to anon, authenticated using (public.is_academy_visible(academy_id));
-- O trigger BEFORE roda antes do WITH CHECK: academy_id já é o da unidade (não dá para apontar outra academia).
create policy academy_unit_access_insert on public.academy_unit_access
  for insert to authenticated with check (public.is_academy_manager(academy_id));
create policy academy_unit_access_update on public.academy_unit_access
  for update to authenticated using (public.is_academy_manager(academy_id)) with check (public.is_academy_manager(academy_id));
create policy academy_unit_access_delete on public.academy_unit_access
  for delete to authenticated using (public.is_academy_manager(academy_id));

revoke execute on function public.academy_unit_access_before_write() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Professor cita os planos aceitos onde dá aula (texto livre, gratuito como todo o perfil de professor)
-- ---------------------------------------------------------------------------
alter table public.teacher_profiles
  add column access_plans text constraint teacher_profiles_access_plans_length check (char_length(access_plans) <= 500);

grant insert (access_plans), update (access_plans) on public.teacher_profiles to authenticated;

-- create or replace só permite acrescentar colunas no fim; as permissões da view são mantidas.
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
  t.access_plans
from public.teacher_profiles t
join public.profiles p on p.id = t.user_id
where t.status = 'approved'
  and p.status = 'active'
  and not public.has_blocked_me(p.id);
