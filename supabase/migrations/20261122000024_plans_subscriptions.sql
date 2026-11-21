-- Evolução comercial · Fase 6: planos e assinaturas administrados pela equipe (sem pagamento na plataforma).
-- Preço é só texto informativo. Ninguém além do admin escreve em planos e assinaturas. Benefícios são
-- conferidos no banco (entitlement) e os limites das Fases 5 passam a ler o plano. Professores continuam
-- gratuitos: nada de teacher_profiles, grade, vínculos ou jornada depende de plano.

create type public.plan_audience       as enum ('academy', 'business', 'both');
create type public.subscription_status as enum ('active', 'suspended', 'cancelled', 'expired');

-- Benefícios conhecidos e o valor sem plano. Novos benefícios entram aqui e no core (PLAN_FEATURES).
create or replace function public.default_entitlement(p_key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_key
    when 'gallery_photos'    then 12
    when 'catalog_items'     then 30
    when 'active_promotions' then 5
    when 'featured_listing'  then 0
  end;
$$;

-- ---------------------------------------------------------------------------
-- Planos
-- ---------------------------------------------------------------------------
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique constraint plans_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name        text not null constraint plans_name_length check (char_length(btrim(name)) between 2 and 60),
  description text constraint plans_description_length check (char_length(description) <= 1000),
  price_label text constraint plans_price_label_length check (char_length(price_label) <= 60),
  audience    public.plan_audience not null default 'both',
  is_active   boolean not null default true,
  sort_order  integer not null default 0 check (sort_order between 0 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create table public.plan_features (
  plan_id     uuid not null references public.plans (id) on delete cascade,
  feature_key text not null constraint plan_features_key check (public.default_entitlement(feature_key) is not null),
  value       integer not null check (value between 0 and 10000),
  primary key (plan_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- Assinaturas (academia OU página) e histórico append-only
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans (id) on delete restrict,
  academy_id  uuid references public.academies (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  status      public.subscription_status not null default 'active',
  starts_on   date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  ends_on     date,
  notes       text constraint subscriptions_notes_length check (char_length(notes) <= 500),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint subscriptions_one_entity check (num_nonnulls(academy_id, business_id) = 1),
  constraint subscriptions_dates check (ends_on is null or ends_on >= starts_on)
);

-- No máximo uma assinatura ativa ou suspensa por entidade (cancelada/expirada vira histórico).
create unique index subscriptions_open_academy_idx on public.subscriptions (academy_id) where status in ('active', 'suspended');
create unique index subscriptions_open_business_idx on public.subscriptions (business_id) where status in ('active', 'suspended');
create index subscriptions_status_idx on public.subscriptions (status, ends_on);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.subscription_events (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  action          text not null constraint subscription_events_action check (action in ('created', 'status', 'changed', 'expired')),
  from_status     public.subscription_status,
  to_status       public.subscription_status,
  reason          text constraint subscription_events_reason_length check (char_length(reason) <= 500),
  details         jsonb not null default '{}'::jsonb,
  actor_id        uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index subscription_events_sub_idx on public.subscription_events (subscription_id, created_at desc);

-- Histórico não muda nem some (a não ser junto com a assinatura, quando a entidade é excluída).
create or replace function public.subscription_events_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'subscription_events_append_only' using errcode = '42501';
end;
$$;

create trigger subscription_events_no_update
  before update on public.subscription_events
  for each row execute function public.subscription_events_immutable();

-- ---------------------------------------------------------------------------
-- Benefícios
-- ---------------------------------------------------------------------------
-- Valor do benefício: o maior entre o padrão e o plano da assinatura ativa e vigente da entidade.
create or replace function public.entitlement(p_kind text, p_entity uuid, p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    public.default_entitlement(p_key),
    coalesce((
      select max(f.value)
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      join public.plan_features f on f.plan_id = s.plan_id and f.feature_key = p_key
      where s.status = 'active'
        and s.starts_on <= (now() at time zone 'America/Sao_Paulo')::date
        and (s.ends_on is null or s.ends_on >= (now() at time zone 'America/Sao_Paulo')::date)
        and ((p_kind = 'academy' and s.academy_id = p_entity) or (p_kind = 'business' and s.business_id = p_entity))
    ), 0)
  );
$$;

create or replace function public.academy_gallery_limit(p_academy uuid)
returns integer language sql stable security definer set search_path = ''
as $$ select public.entitlement('academy', p_academy, 'gallery_photos'); $$;

create or replace function public.business_catalog_limit(p_business uuid)
returns integer language sql stable security definer set search_path = ''
as $$ select public.entitlement('business', p_business, 'catalog_items'); $$;

create or replace function public.business_promotions_limit(p_business uuid)
returns integer language sql stable security definer set search_path = ''
as $$ select public.entitlement('business', p_business, 'active_promotions'); $$;

-- Entidades com destaque na listagem (benefício featured_listing ativo).
create or replace function public.featured_entities(p_kind text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct case when p_kind = 'academy' then s.academy_id else s.business_id end
  from public.subscriptions s
  join public.plan_features f on f.plan_id = s.plan_id and f.feature_key = 'featured_listing' and f.value > 0
  where s.status = 'active'
    and s.starts_on <= (now() at time zone 'America/Sao_Paulo')::date
    and (s.ends_on is null or s.ends_on >= (now() at time zone 'America/Sao_Paulo')::date)
    and ((p_kind = 'academy' and s.academy_id is not null) or (p_kind = 'business' and s.business_id is not null));
$$;

-- ---------------------------------------------------------------------------
-- Operações do admin (cada uma grava o histórico)
-- ---------------------------------------------------------------------------
create or replace function public.require_platform_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'not_admin' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_create_subscription(
  p_plan      uuid,
  p_academy   uuid default null,
  p_business  uuid default null,
  p_starts_on date default null,
  p_ends_on   date default null,
  p_notes     text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_audience public.plan_audience;
  v_id       uuid;
begin
  perform public.require_platform_admin();
  select audience into v_audience from public.plans where id = p_plan and is_active;
  if v_audience is null then
    raise exception 'plan_not_found' using errcode = 'P0002';
  end if;
  if num_nonnulls(p_academy, p_business) <> 1 then
    raise exception 'one_entity' using errcode = '22023';
  end if;
  if (p_academy is not null and v_audience = 'business') or (p_business is not null and v_audience = 'academy') then
    raise exception 'plan_audience_mismatch' using errcode = '22023';
  end if;
  if (p_academy is not null and not exists (select 1 from public.academies where id = p_academy))
     or (p_business is not null and not exists (select 1 from public.businesses where id = p_business)) then
    raise exception 'entity_not_found' using errcode = 'P0002';
  end if;
  begin
    insert into public.subscriptions (plan_id, academy_id, business_id, starts_on, ends_on, notes, created_by)
    values (p_plan, p_academy, p_business,
            coalesce(p_starts_on, (now() at time zone 'America/Sao_Paulo')::date), p_ends_on,
            nullif(btrim(p_notes), ''), auth.uid())
    returning id into v_id;
  exception when unique_violation then
    raise exception 'subscription_exists' using errcode = '23505';
  end;
  insert into public.subscription_events (subscription_id, action, to_status, reason, details, actor_id)
  values (v_id, 'created', 'active', nullif(btrim(p_notes), ''),
          jsonb_build_object('plan_id', p_plan, 'starts_on', coalesce(p_starts_on, (now() at time zone 'America/Sao_Paulo')::date), 'ends_on', p_ends_on),
          auth.uid());
  return v_id;
end;
$$;

-- Transições: ativa ↔ suspensa; ativa/suspensa → cancelada. Cancelada e expirada são finais (crie outra).
create or replace function public.admin_set_subscription_status(p_subscription uuid, p_status public.subscription_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old    public.subscription_status;
  v_reason text := nullif(btrim(p_reason), '');
begin
  perform public.require_platform_admin();
  select status into v_old from public.subscriptions where id = p_subscription for update;
  if v_old is null then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;
  if p_status = 'expired' or v_old in ('cancelled', 'expired') or v_old = p_status
     or (p_status = 'active' and v_old <> 'suspended') then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  if p_status in ('suspended', 'cancelled') and coalesce(char_length(v_reason), 0) < 3 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  begin
    update public.subscriptions set status = p_status where id = p_subscription;
  exception when unique_violation then
    raise exception 'subscription_exists' using errcode = '23505';
  end;
  insert into public.subscription_events (subscription_id, action, from_status, to_status, reason, actor_id)
  values (p_subscription, 'status', v_old, p_status, v_reason, auth.uid());
end;
$$;

-- Troca de plano ou de validade (renovação), com motivo no histórico.
create or replace function public.admin_change_subscription(p_subscription uuid, p_plan uuid, p_ends_on date, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub      public.subscriptions;
  v_audience public.plan_audience;
begin
  perform public.require_platform_admin();
  select * into v_sub from public.subscriptions where id = p_subscription for update;
  if v_sub.id is null then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;
  if v_sub.status not in ('active', 'suspended') then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  select audience into v_audience from public.plans where id = p_plan and is_active;
  if v_audience is null then
    raise exception 'plan_not_found' using errcode = 'P0002';
  end if;
  if (v_sub.academy_id is not null and v_audience = 'business') or (v_sub.business_id is not null and v_audience = 'academy') then
    raise exception 'plan_audience_mismatch' using errcode = '22023';
  end if;
  if p_ends_on is not null and p_ends_on < v_sub.starts_on then
    raise exception 'invalid_dates' using errcode = '22023';
  end if;
  update public.subscriptions set plan_id = p_plan, ends_on = p_ends_on where id = p_subscription;
  insert into public.subscription_events (subscription_id, action, from_status, to_status, reason, details, actor_id)
  values (p_subscription, 'changed', v_sub.status, v_sub.status, nullif(btrim(p_reason), ''),
          jsonb_build_object('from_plan', v_sub.plan_id, 'to_plan', p_plan, 'from_ends_on', v_sub.ends_on, 'to_ends_on', p_ends_on),
          auth.uid());
end;
$$;

-- Rotina diária: assinaturas ativas ou suspensas com fim no passado expiram (sem ator).
create or replace function public.expire_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub   record;
  v_count integer := 0;
begin
  for v_sub in
    select id, status from public.subscriptions
    where status in ('active', 'suspended') and ends_on < (now() at time zone 'America/Sao_Paulo')::date
    for update
  loop
    update public.subscriptions set status = 'expired' where id = v_sub.id;
    insert into public.subscription_events (subscription_id, action, from_status, to_status, reason)
    values (v_sub.id, 'expired', v_sub.status, 'expired', 'Fim da validade');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('expire-subscriptions', '15 3 * * *', $$select public.expire_subscriptions()$$);

-- Lista para o painel e para a gestão da entidade (RLS das tabelas vale: security_invoker).
create view public.subscription_cards with (security_invoker = true) as
select
  s.id,
  s.status,
  s.starts_on,
  s.ends_on,
  s.notes,
  s.created_at,
  s.updated_at,
  s.plan_id,
  p.name        as plan_name,
  p.price_label as plan_price_label,
  s.academy_id,
  s.business_id,
  coalesce(a.name, b.name) as entity_name,
  coalesce(a.slug, b.slug) as entity_slug,
  case when s.academy_id is not null then 'academy' else 'business' end as entity_kind
from public.subscriptions s
join public.plans p on p.id = s.plan_id
left join public.academies a on a.id = s.academy_id
left join public.businesses b on b.id = s.business_id;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;

revoke all on public.plans, public.plan_features, public.subscriptions, public.subscription_events from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.subscription_cards from anon, authenticated;

-- Planos: catálogo público (só ativos); só admin escreve, com auditoria.
grant select on public.plans, public.plan_features to anon, authenticated;
grant insert (slug, name, description, price_label, audience, is_active, sort_order),
      update (name, description, price_label, audience, is_active, sort_order)
  on public.plans to authenticated;
grant insert, update (value), delete on public.plan_features to authenticated;
grant select on public.subscriptions, public.subscription_events, public.subscription_cards to authenticated;

create policy plans_select on public.plans
  for select to anon, authenticated using (is_active or public.has_role('admin'));
create policy plans_admin_insert on public.plans for insert to authenticated with check (public.has_role('admin'));
create policy plans_admin_update on public.plans for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy plan_features_select on public.plan_features
  for select to anon, authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id and (p.is_active or public.has_role('admin'))));
create policy plan_features_admin_insert on public.plan_features for insert to authenticated with check (public.has_role('admin'));
create policy plan_features_admin_update on public.plan_features for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy plan_features_admin_delete on public.plan_features for delete to authenticated using (public.has_role('admin'));

-- Assinaturas: admin vê todas; a gestão vê as da própria academia ou página. Escrita só pelas funções.
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (
    public.has_role('admin')
    or (academy_id is not null and public.is_academy_manager(academy_id))
    or (business_id is not null and public.is_business_manager(business_id))
  );
create policy subscription_events_select on public.subscription_events
  for select to authenticated
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id));

create trigger plans_audit
  after insert or update or delete on public.plans
  for each row execute function public.audit_row_change();
create trigger plan_features_audit
  after insert or update or delete on public.plan_features
  for each row execute function public.audit_row_change();
create trigger subscriptions_audit
  after insert or update or delete on public.subscriptions
  for each row execute function public.audit_row_change();

revoke execute on function
  public.expire_subscriptions(), public.subscription_events_immutable(), public.require_platform_admin()
  from public, anon, authenticated;
revoke execute on function
  public.admin_create_subscription(uuid, uuid, uuid, date, date, text),
  public.admin_set_subscription_status(uuid, public.subscription_status, text),
  public.admin_change_subscription(uuid, uuid, date, text)
  from public, anon;
grant execute on function
  public.admin_create_subscription(uuid, uuid, uuid, date, date, text),
  public.admin_set_subscription_status(uuid, public.subscription_status, text),
  public.admin_change_subscription(uuid, uuid, date, text)
  to authenticated;
grant execute on function public.entitlement(text, uuid, text), public.featured_entities(text), public.default_entitlement(text)
  to anon, authenticated;
