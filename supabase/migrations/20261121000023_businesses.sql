-- Evolução comercial · Fase 5b: páginas de marca, loja e serviço (separadas do perfil pessoal, como academias).
-- Uma ou mais contas administram a página (owner + admins com aceite). Catálogo e promoções são informativos:
-- preço nunca é inventado e não há pagamento na plataforma (custo zero).

alter type public.notification_type add value if not exists 'business_invite';

create type public.business_category      as enum ('brand', 'store', 'service');
create type public.business_status        as enum ('active', 'hidden', 'suspended');
create type public.business_role          as enum ('owner', 'admin');
create type public.business_member_status as enum ('pending', 'active');
create type public.catalog_item_kind      as enum ('product', 'service');

-- ---------------------------------------------------------------------------
-- Páginas
-- ---------------------------------------------------------------------------
create table public.businesses (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  name            text not null constraint businesses_name_length check (char_length(btrim(name)) between 2 and 80),
  category        public.business_category not null,
  description     text constraint businesses_description_length check (char_length(description) <= 3000),
  logo_path       text,
  cover_path      text,
  website         text constraint businesses_website check (website ~ '^https://[^\s<>"]{3,}$' and char_length(website) <= 300),
  instagram       text constraint businesses_instagram check (instagram ~ '^[A-Za-z0-9_.]{1,30}$'),
  contact_email   text constraint businesses_contact_email check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contact_email) <= 254),
  contact_phone   text constraint businesses_contact_phone check (contact_phone ~ '^\+?[0-9 ()-]{8,20}$'),
  city            text constraint businesses_city_length check (char_length(city) <= 80),
  state           text constraint businesses_state check (state ~ '^[A-Z]{2}$'),
  martial_art_ids uuid[] not null default '{}' constraint businesses_arts_count check (coalesce(array_length(martial_art_ids, 1), 0) <= 12),
  status          public.business_status not null default 'active',
  is_verified     boolean not null default false,
  created_by      uuid references public.profiles (id) on delete set null,
  search_vector   tsvector generated always as (
                    setweight(to_tsvector('simple'::regconfig, public.immutable_unaccent(name)), 'A') ||
                    setweight(to_tsvector('portuguese'::regconfig, public.immutable_unaccent(coalesce(description, ''))), 'C')
                  ) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint businesses_logo_path_format check (logo_path ~ ('^business/' || id::text || '/logo-[a-z0-9]{6,16}\.(webp|jpg)$')),
  constraint businesses_cover_path_format check (cover_path ~ ('^business/' || id::text || '/banner-[a-z0-9]{6,16}\.(webp|jpg)$'))
);

create index businesses_search_vector_idx on public.businesses using gin (search_vector);
create index businesses_category_idx on public.businesses (category, status);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.business_role not null,
  status      public.business_member_status not null default 'pending',
  invited_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_members_user_idx on public.business_members (user_id, status);

create or replace function public.is_business_manager(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin') or exists (
    select 1 from public.business_members
    where business_id = p_business and user_id = (select auth.uid()) and status = 'active'
  );
$$;

create or replace function public.is_business_owner(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business and user_id = (select auth.uid()) and role = 'owner' and status = 'active'
  );
$$;

create or replace function public.is_business_visible(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.businesses where id = p_business and status = 'active')
      or public.is_business_manager(p_business)
      or public.has_role('moderator');
$$;

-- Gestão só alterna entre ativa e oculta; suspensão e selo são da moderação (Fase 8).
create or replace function public.businesses_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug or new.created_by is distinct from old.created_by then
    raise exception 'business_immutable' using errcode = '42501';
  end if;
  if (new.status is distinct from old.status or new.is_verified is distinct from old.is_verified)
     and auth.uid() is not null and not public.has_role('moderator') then
    if new.is_verified is distinct from old.is_verified or old.status = 'suspended' or new.status = 'suspended' then
      raise exception 'business_status_forbidden' using errcode = '42501';
    end if;
  end if;
  if new.logo_path is distinct from old.logo_path and new.logo_path is not null
     and not public.cover_object_exists(new.logo_path) then
    raise exception 'cover_not_uploaded' using errcode = '22023';
  end if;
  if new.cover_path is distinct from old.cover_path and new.cover_path is not null
     and not public.cover_object_exists(new.cover_path) then
    raise exception 'cover_not_uploaded' using errcode = '22023';
  end if;
  if new.martial_art_ids is distinct from old.martial_art_ids
     and exists (select 1 from unnest(new.martial_art_ids) a where not exists (select 1 from public.martial_arts m where m.id = a)) then
    raise exception 'martial_art_not_found' using errcode = '23503';
  end if;
  new.name := btrim(new.name);
  return new;
end;
$$;

create trigger businesses_before_update
  before update on public.businesses
  for each row execute function public.businesses_before_update();

create trigger businesses_assert_active
  before insert or update on public.businesses
  for each row execute function public.assert_active_account();

-- Cria a página e o vínculo de dono numa transação. Até 3 páginas novas por dia por pessoa.
create or replace function public.create_business(p_name text, p_category public.business_category)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_base text;
  v_slug text;
  v_id   uuid;
  i      integer := 1;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and status <> 'active') then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('business:' || v_uid, 3, interval '1 day');
  v_base := left(public.slugify(v_name), 80);
  if v_base is null or v_base = '' then
    v_base := 'pagina';
  end if;
  v_slug := v_base;
  -- Slug único também entre academias (as duas aparecem em buscas e links parecidos).
  while exists (select 1 from public.businesses where slug = v_slug) or exists (select 1 from public.academies where slug = v_slug) loop
    i := i + 1;
    v_slug := v_base || '-' || i;
  end loop;
  insert into public.businesses (slug, name, category, created_by) values (v_slug, v_name, p_category, v_uid) returning id into v_id;
  insert into public.business_members (business_id, user_id, role, status, invited_by) values (v_id, v_uid, 'owner', 'active', v_uid);
  return v_slug;
end;
$$;

-- Dono convida um administrador pelo @usuário. O convidado precisa aceitar.
create or replace function public.invite_business_admin(p_business uuid, p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
begin
  if not (public.is_business_owner(p_business) or public.has_role('admin')) then
    raise exception 'not_business_owner' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and status <> 'active') then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('business_invite:' || v_uid, 30, interval '1 day');
  select id into v_target from public.profiles
  where username = lower(ltrim(btrim(p_username), '@'))::extensions.citext and status = 'active';
  if v_target is null or public.is_blocked_between(v_target, v_uid) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.business_members where business_id = p_business and user_id = v_target) then
    raise exception 'already_member' using errcode = '23505';
  end if;
  insert into public.business_members (business_id, user_id, role, status, invited_by)
  values (p_business, v_target, 'admin', 'pending', v_uid);
  perform public.notify(v_target, v_uid, 'business_invite');
end;
$$;

create or replace function public.respond_business_invite(p_business uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.business_members
                 where business_id = p_business and user_id = auth.uid() and status = 'pending') then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
  if p_accept then
    update public.business_members set status = 'active' where business_id = p_business and user_id = auth.uid();
  else
    delete from public.business_members where business_id = p_business and user_id = auth.uid();
  end if;
end;
$$;

-- Dono remove um administrador; administrador sai sozinho. O dono não sai (apaga a página, se quiser).
create or replace function public.remove_business_member(p_business uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.business_role;
begin
  select role into v_role from public.business_members where business_id = p_business and user_id = p_user;
  if v_role is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if v_role = 'owner' then
    raise exception 'owner_cannot_leave' using errcode = '42501';
  end if;
  if p_user <> auth.uid() and not (public.is_business_owner(p_business) or public.has_role('admin')) then
    raise exception 'not_business_owner' using errcode = '42501';
  end if;
  delete from public.business_members where business_id = p_business and user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catálogo (produtos e serviços) e promoções
-- ---------------------------------------------------------------------------
create table public.business_items (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  kind         public.catalog_item_kind not null default 'product',
  name         text not null constraint business_items_name_length check (char_length(btrim(name)) between 2 and 120),
  description  text constraint business_items_description_length check (char_length(description) <= 1000),
  price_status public.price_status not null default 'undisclosed',
  price_cents  integer constraint business_items_price_range check (price_cents between 100 and 10000000),
  url          text constraint business_items_url check (url ~ '^https://[^\s<>"]{3,}$' and char_length(url) <= 300),
  image_path   text,
  is_active    boolean not null default true,
  position     integer not null default 0 check (position between 0 and 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint business_items_price_consistency check ((price_status = 'paid') = (price_cents is not null)),
  constraint business_items_image_path_format check (image_path ~ ('^business/' || business_id::text || '/item-[a-z0-9]{6,16}\.(webp|jpg)$'))
);

create index business_items_business_idx on public.business_items (business_id, position, created_at);

create table public.business_promotions (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  title        text not null constraint business_promotions_title_length check (char_length(btrim(title)) between 2 and 120),
  description  text constraint business_promotions_description_length check (char_length(description) <= 1000),
  coupon_code  text constraint business_promotions_coupon check (coupon_code ~ '^[A-Za-z0-9_-]{2,40}$'),
  url          text constraint business_promotions_url check (url ~ '^https://[^\s<>"]{3,}$' and char_length(url) <= 300),
  starts_on    date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  ends_on      date,
  created_at   timestamptz not null default now(),
  constraint business_promotions_dates check (ends_on is null or ends_on >= starts_on)
);

create index business_promotions_business_idx on public.business_promotions (business_id, starts_on desc);

-- Limites. Fase 6 (planos) passa a ler o benefício do plano; sem plano vale o padrão.
create or replace function public.business_catalog_limit(p_business uuid)
returns integer language sql stable security definer set search_path = '' as $$ select 30; $$;
create or replace function public.business_promotions_limit(p_business uuid)
returns integer language sql stable security definer set search_path = '' as $$ select 5; $$;

create or replace function public.business_items_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended('business_items:' || new.business_id::text, 0));
    if (select count(*) from public.business_items where business_id = new.business_id)
       >= public.business_catalog_limit(new.business_id) then
      raise exception 'catalog_limit' using errcode = '23514';
    end if;
    new.created_at := now();
  elsif new.business_id is distinct from old.business_id then
    raise exception 'business_immutable' using errcode = '42501';
  end if;
  if new.image_path is not null and (tg_op = 'INSERT' or new.image_path is distinct from old.image_path)
     and not public.cover_object_exists(new.image_path) then
    raise exception 'cover_not_uploaded' using errcode = '22023';
  end if;
  new.name := btrim(new.name);
  new.description := nullif(btrim(new.description), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger business_items_before_write
  before insert or update on public.business_items
  for each row execute function public.business_items_before_write();

-- Limite conta só promoções vigentes ou futuras (as encerradas ficam como histórico).
create or replace function public.business_promotions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended('business_promotions:' || new.business_id::text, 0));
    if (select count(*) from public.business_promotions
        where business_id = new.business_id and (ends_on is null or ends_on >= v_today))
       >= public.business_promotions_limit(new.business_id) then
      raise exception 'promotions_limit' using errcode = '23514';
    end if;
    new.created_at := now();
  elsif new.business_id is distinct from old.business_id then
    raise exception 'business_immutable' using errcode = '42501';
  end if;
  new.title := btrim(new.title);
  new.description := nullif(btrim(new.description), '');
  new.coupon_code := nullif(upper(btrim(new.coupon_code)), '');
  return new;
end;
$$;

create trigger business_promotions_before_write
  before insert or update on public.business_promotions
  for each row execute function public.business_promotions_before_write();

create trigger business_items_assert_active
  before insert or update on public.business_items
  for each row execute function public.assert_active_account();
create trigger business_promotions_assert_active
  before insert or update on public.business_promotions
  for each row execute function public.assert_active_account();

-- ---------------------------------------------------------------------------
-- Publicar como página: o post continua do autor (responsável), mas aparece com a página
-- e fica fora do perfil pessoal. Só a gestão ativa da página publica por ela.
-- ---------------------------------------------------------------------------
alter table public.posts add column business_id uuid references public.businesses (id) on delete set null;
create index posts_business_idx on public.posts (business_id, created_at desc, id desc) where business_id is not null;

create or replace function public.create_page_post(
  p_business       uuid,
  p_id             uuid,
  p_caption        text,
  p_visibility     public.visibility default 'public',
  p_martial_art_id uuid default null,
  p_location_label text default null,
  p_media          jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.business_members
                    where business_id = p_business and user_id = auth.uid() and status = 'active') then
    raise exception 'not_business_manager' using errcode = '42501';
  end if;
  if not exists (select 1 from public.businesses where id = p_business and status = 'active') then
    raise exception 'business_not_active' using errcode = '42501';
  end if;
  -- create_post valida autor, mídia (pasta do próprio usuário), marcações e rate limit pelo JWT.
  perform public.create_post(p_id, p_caption, p_visibility, p_martial_art_id, p_location_label, p_media);
  update public.posts set business_id = p_business where id = p_id and author_id = auth.uid();
  return p_id;
end;
$$;

-- post_cards ganha a página (colunas no fim: create or replace exige isso).
create or replace view public.post_cards with (security_invoker = true) as
select
  p.id,
  p.author_id,
  a.username::text           as author_username,
  a.display_name             as author_display_name,
  a.avatar_path              as author_avatar_path,
  p.kind,
  p.caption,
  p.visibility,
  p.location_label,
  p.martial_art_id,
  m.name                     as martial_art_name,
  p.like_count,
  p.comment_count,
  p.save_count,
  p.moderation_status,
  p.created_at,
  coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', pm.id, 'type', pm.type, 'path', pm.storage_path, 'thumbnail', pm.thumbnail_path,
             'width', pm.width, 'height', pm.height, 'duration_ms', pm.duration_ms, 'alt', pm.alt_text
           ) order by pm.position)
    from public.post_media pm where pm.post_id = p.id
  ), '[]'::jsonb)            as media,
  coalesce((
    select jsonb_agg(u.username::text order by u.username)
    from public.post_mentions mn join public.profiles u on u.id = mn.user_id
    where mn.post_id = p.id and mn.status = 'approved'
  ), '[]'::jsonb)            as mentions,
  exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid()))  as viewer_has_liked,
  exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())) as viewer_has_saved,
  p.academy_id,
  ac.name                    as academy_name,
  ac.slug                    as academy_slug,
  p.business_id,
  b.name                     as business_name,
  b.slug                     as business_slug,
  b.logo_path                as business_logo_path
from public.posts p
join public.profiles a on a.id = p.author_id
left join public.martial_arts m on m.id = p.martial_art_id
left join public.academies ac on ac.id = p.academy_id
left join public.businesses b on b.id = p.business_id and b.status = 'active'
where p.deleted_at is null;

revoke insert, update, delete, truncate, references, trigger on public.post_cards from anon, authenticated;

-- Perfil pessoal mostra só posts pessoais (os da página aparecem na página).
create or replace function public.get_profile_posts(
  p_author_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns setof public.post_cards
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.post_cards c
  where c.author_id = p_author_id
    and c.business_id is null
    and (p_before_created_at is null or (c.created_at, c.id) < (p_before_created_at, p_before_id))
  order by c.created_at desc, c.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.get_business_posts(
  p_business uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns setof public.post_cards
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.post_cards c
  where c.business_id = p_business
    and (p_before_created_at is null or (c.created_at, c.id) < (p_before_created_at, p_before_id))
  order by c.created_at desc, c.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Bucket covers: pastas de páginas
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_cover_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := storage.foldername(p_name);
begin
  if coalesce(array_length(v_parts, 1), 0) <> 2
     or v_parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  if v_parts[1] = 'academy' then
    return public.is_academy_manager(v_parts[2]::uuid);
  end if;
  if v_parts[1] = 'business' then
    return public.is_business_manager(v_parts[2]::uuid);
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_items enable row level security;
alter table public.business_promotions enable row level security;

revoke all on public.businesses, public.business_members, public.business_items, public.business_promotions from anon, authenticated;

grant select on public.businesses to anon, authenticated;
grant update (name, category, description, logo_path, cover_path, website, instagram, contact_email, contact_phone,
              city, state, martial_art_ids, status)
  on public.businesses to authenticated;
grant delete on public.businesses to authenticated;
grant select on public.business_members to authenticated;
grant select on public.business_items, public.business_promotions to anon, authenticated;
grant insert (business_id, kind, name, description, price_status, price_cents, url, image_path, is_active, position),
      update (kind, name, description, price_status, price_cents, url, image_path, is_active, position),
      delete
  on public.business_items to authenticated;
grant insert (business_id, title, description, coupon_code, url, starts_on, ends_on),
      update (title, description, coupon_code, url, starts_on, ends_on),
      delete
  on public.business_promotions to authenticated;

-- Colunas da própria linha (não consultar businesses por id dentro da política de businesses).
create policy businesses_select on public.businesses
  for select to anon, authenticated
  using (status = 'active' or public.is_business_manager(id) or public.has_role('moderator'));
create policy businesses_update on public.businesses
  for update to authenticated using (public.is_business_manager(id)) with check (public.is_business_manager(id));
create policy businesses_delete on public.businesses
  for delete to authenticated using (public.is_business_owner(id) or public.has_role('admin'));

-- Membros: a própria pessoa e a gestão da página veem (lista não é pública).
create policy business_members_select on public.business_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_manager(business_id));

create policy business_items_select on public.business_items
  for select to anon, authenticated
  using (public.is_business_visible(business_id) and (is_active or public.is_business_manager(business_id)));
create policy business_items_insert on public.business_items
  for insert to authenticated with check (public.is_business_manager(business_id));
create policy business_items_update on public.business_items
  for update to authenticated using (public.is_business_manager(business_id)) with check (public.is_business_manager(business_id));
create policy business_items_delete on public.business_items
  for delete to authenticated using (public.is_business_manager(business_id));

create policy business_promotions_select on public.business_promotions
  for select to anon, authenticated
  using (
    public.is_business_manager(business_id)
    or (public.is_business_visible(business_id)
        and starts_on <= (now() at time zone 'America/Sao_Paulo')::date
        and (ends_on is null or ends_on >= (now() at time zone 'America/Sao_Paulo')::date))
  );
create policy business_promotions_insert on public.business_promotions
  for insert to authenticated with check (public.is_business_manager(business_id));
create policy business_promotions_update on public.business_promotions
  for update to authenticated using (public.is_business_manager(business_id)) with check (public.is_business_manager(business_id));
create policy business_promotions_delete on public.business_promotions
  for delete to authenticated using (public.is_business_manager(business_id));

revoke execute on function
  public.businesses_before_update(), public.business_items_before_write(), public.business_promotions_before_write()
  from public, anon, authenticated;
revoke execute on function
  public.create_business(text, public.business_category), public.invite_business_admin(uuid, text),
  public.respond_business_invite(uuid, boolean), public.remove_business_member(uuid, uuid),
  public.create_page_post(uuid, uuid, text, public.visibility, uuid, text, jsonb)
  from public, anon;
grant execute on function
  public.create_business(text, public.business_category), public.invite_business_admin(uuid, text),
  public.respond_business_invite(uuid, boolean), public.remove_business_member(uuid, uuid),
  public.create_page_post(uuid, uuid, text, public.visibility, uuid, text, jsonb)
  to authenticated;
grant execute on function public.is_business_manager(uuid), public.is_business_owner(uuid), public.is_business_visible(uuid),
  public.business_catalog_limit(uuid), public.business_promotions_limit(uuid), public.get_business_posts(uuid, timestamptz, uuid, integer)
  to anon, authenticated;
