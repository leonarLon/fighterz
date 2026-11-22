-- Correção (auditoria em produção, 22/11/2026): a política academies_update só impedia a gestão de
-- *aplicar* "suspended"; o dono conseguia *tirar* a suspensão da moderação (suspended -> active/hidden).
-- Mesma regra das páginas comerciais (businesses_before_update): só a moderação mexe em suspensão.
create or replace function public.academies_guard_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and (old.status = 'suspended' or new.status = 'suspended')
     and auth.uid() is not null
     and not public.has_role('moderator') then
    raise exception 'academy_status_forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.academies_guard_status() from public, anon, authenticated;

create trigger academies_guard_status
  before update of status on public.academies
  for each row execute function public.academies_guard_status();
