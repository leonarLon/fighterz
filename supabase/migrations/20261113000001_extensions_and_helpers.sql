-- Fase 2 · Extensões e funções utilitárias compartilhadas por todas as migrations.

create extension if not exists postgis  with schema extensions;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext   with schema extensions;

-- Mantém updated_at em toda tabela mutável (DATA_MODEL.md §1).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- unaccent() não é IMMUTABLE, então não pode ser usado em índices nem em colunas geradas.
-- Este wrapper fixa o dicionário e pode ser marcado como IMMUTABLE com segurança.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;

-- Normalização usada em buscas: minúsculas e sem acentos.
create or replace function public.search_normalize(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select lower(public.immutable_unaccent($1));
$$;
