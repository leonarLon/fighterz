-- Fase 2 · Rate limit no banco (SECURITY.md §4).
-- Janela fixa por chave. Só funções security definer do próprio banco chamam isto:
-- o cliente não pode consultar nem "gastar" a cota de outra pessoa.

create table public.rate_limits (
  key          text not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  count        integer not null default 0 check (count >= 0),
  primary key (key, window_start)
);

create index rate_limits_window_start_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Registra uma tentativa e devolve true se ainda está dentro do limite.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window interval)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_seconds      double precision := extract(epoch from p_window);
  v_window_start timestamptz;
  v_count        integer;
begin
  if p_max < 1 or v_seconds <= 0 then
    raise exception 'invalid_rate_limit_args' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start) do update set count = rl.count + 1
  returning rl.count into v_count;

  return v_count <= p_max;
end;
$$;

-- Versão que interrompe a operação. Uso típico em triggers: perform public.enforce_rate_limit(...).
create or replace function public.enforce_rate_limit(p_key text, p_max integer, p_window interval)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.check_rate_limit(p_key, p_max, p_window) then
    raise exception 'rate_limit_exceeded' using errcode = 'P0429', hint = p_key;
  end if;
end;
$$;

-- Limpeza de janelas antigas (agendar com pg_cron quando houver ambiente persistente).
create or replace function public.purge_rate_limits(p_older_than interval default interval '2 days')
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.rate_limits where window_start < now() - p_older_than returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke execute on function public.check_rate_limit(text, integer, interval)   from public, anon, authenticated;
revoke execute on function public.enforce_rate_limit(text, integer, interval) from public, anon, authenticated;
revoke execute on function public.purge_rate_limits(interval)                 from public, anon, authenticated;
