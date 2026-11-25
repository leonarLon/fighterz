-- Professor sem fila de aprovação (25/11/2026, pedido do usuário): o pedido ia para o admin e ninguém era
-- avisado; com milhares de professores, aprovar um por um não escala. Critério objetivo, decidido no banco:
--   * em cada modalidade com graduação, a graduação informada precisa ser faixa preta ou equivalente
--     (Capoeira: a partir da Corda Vermelha "Professor"; Muay Thai: Kruang Preto);
--   * modalidades sem graduação (Boxe, MMA, Luta Olímpica, Outra) não exigem nada;
--   * com pelo menos uma modalidade que atende ao critério, o perfil fica aprovado na hora.
-- O admin continua podendo revogar (e reativar). Revogado não volta sozinho.

-- ---------------------------------------------------------------------------
-- Graduação mínima por modalidade
-- ---------------------------------------------------------------------------
alter table public.martial_arts add column teacher_min_ordinal smallint check (teacher_min_ordinal >= 1);
comment on column public.martial_arts.teacher_min_ordinal is
  'Ordem mínima (track adult) para ser professor. Nulo: a primeira graduação com "pret" no nome; sem isso, a mais alta.';

alter table public.martial_arts disable trigger martial_arts_audit;
update public.martial_arts set teacher_min_ordinal = (
  select r.ordinal from public.martial_art_ranks r
  where r.martial_art_id = martial_arts.id and r.track = 'adult' and r.name like 'Corda Vermelha (Professor)%'
) where slug = 'capoeira';
alter table public.martial_arts enable trigger martial_arts_audit;

create or replace function public.teacher_min_rank_ordinal(p_art uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select case when not m.has_ranks then null else coalesce(
    m.teacher_min_ordinal,
    (select min(r.ordinal) from public.martial_art_ranks r
      where r.martial_art_id = m.id and r.track = 'adult' and r.name ilike '%pret%'),
    (select max(r.ordinal) from public.martial_art_ranks r where r.martial_art_id = m.id and r.track = 'adult')
  ) end
  from public.martial_arts m where m.id = p_art;
$$;

-- Uma linha de teacher_martial_arts atende ao critério?
create or replace function public.teacher_art_qualifies(p_art uuid, p_rank uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not m.has_ranks then true
    when p_rank is null then false
    else coalesce((select r.ordinal >= public.teacher_min_rank_ordinal(m.id)
                   from public.martial_art_ranks r where r.id = p_rank and r.martial_art_id = m.id), false)
  end
  from public.martial_arts m where m.id = p_art;
$$;

create or replace function public.teacher_qualifies(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.teacher_martial_arts tm
                 where tm.teacher_id = p_user and public.teacher_art_qualifies(tm.martial_art_id, tm.rank_id));
$$;

-- Quem preenche o formulário não consegue gravar graduação abaixo do mínimo. Seeds e rotinas (sem JWT) passam.
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
  if auth.uid() is not null and not public.teacher_art_qualifies(new.martial_art_id, new.rank_id) then
    raise exception 'rank_below_teacher_min' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status automático
-- ---------------------------------------------------------------------------
create or replace function public.refresh_teacher_status(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new public.teacher_status := case when public.teacher_qualifies(p_user) then 'approved' else 'pending' end;
begin
  update public.teacher_profiles
  set status = v_new, review_notes = case when v_new = 'approved' then null else review_notes end
  where user_id = p_user and status <> 'revoked' and status is distinct from v_new;
end;
$$;

create or replace function public.teacher_martial_arts_refresh_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_teacher_status(coalesce(new.teacher_id, old.teacher_id));
  return null;
end;
$$;

create trigger teacher_martial_arts_refresh_status
  after insert or update or delete on public.teacher_martial_arts
  for each row execute function public.teacher_martial_arts_refresh_status();

revoke execute on function
  public.teacher_min_rank_ordinal(uuid), public.teacher_art_qualifies(uuid, uuid), public.teacher_qualifies(uuid),
  public.refresh_teacher_status(uuid), public.teacher_martial_arts_refresh_status()
  from public, anon, authenticated;
-- O trigger de checagem roda com as permissões de quem grava.
grant execute on function public.teacher_art_qualifies(uuid, uuid) to authenticated;

-- Perfis que estavam na fila (pendentes ou recusados) e já atendem ao critério são aprovados agora.
-- Aprovados pelo admin que não atendem continuam aprovados até a próxima edição das modalidades.
do $$
declare
  v_user uuid;
begin
  for v_user in select user_id from public.teacher_profiles where status in ('pending', 'rejected') loop
    perform public.refresh_teacher_status(v_user);
  end loop;
end;
$$;
