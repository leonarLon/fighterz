-- Pós-evolução (22/11/2026, pedido do usuário): o aluno só pede confirmação de graduação a um professor
-- com quem tem vínculo ativo (teacher_students, migration 28). Antes, qualquer professor aprovado podia
-- ser indicado. Graduações já confirmadas continuam como estão.

create or replace function public.is_active_student_of(p_teacher uuid, p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Só responde para uma das partes (a lista de alunos não é pública); rotinas internas (sem JWT) passam.
  select (auth.uid() is null or auth.uid() in (p_teacher, p_student))
     and exists (select 1 from public.teacher_students
                 where teacher_id = p_teacher and student_id = p_student and status = 'active');
$$;

revoke execute on function public.is_active_student_of(uuid, uuid) from public, anon;
grant execute on function public.is_active_student_of(uuid, uuid) to authenticated;

create or replace function public.rank_promotions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uma public.user_martial_arts%rowtype;
  v_max smallint;
begin
  select * into v_uma from public.user_martial_arts where id = new.user_martial_art_id;
  if not found then
    raise exception 'user_martial_art_not_found' using errcode = 'P0002';
  end if;
  new.user_id := v_uma.user_id;

  select max_degrees into v_max
  from public.martial_art_ranks where id = new.rank_id and martial_art_id = v_uma.martial_art_id;
  if not found then
    raise exception 'rank_not_in_martial_art' using errcode = '23514';
  end if;
  if new.degree > v_max then
    raise exception 'degree_exceeds_max' using errcode = '23514', detail = format('max_degrees=%s', v_max);
  end if;
  if new.promoted_on > current_date then
    raise exception 'promoted_on_in_future' using errcode = '23514';
  end if;
  if new.teacher_id is not null and (new.teacher_id = new.user_id or not public.is_approved_teacher(new.teacher_id)) then
    raise exception 'teacher_not_approved' using errcode = '23514';
  end if;

  if auth.uid() is not null then
    -- Pedido de confirmação só para professor com vínculo ativo (migration 30). Correções que não mexem
    -- em faixa, grau, data ou professor (ex.: observações) não pedem nova confirmação, então não checam.
    if new.teacher_id is not null
       and (tg_op = 'INSERT'
            or new.rank_id is distinct from old.rank_id or new.degree is distinct from old.degree
            or new.promoted_on is distinct from old.promoted_on or new.teacher_id is distinct from old.teacher_id)
       and not public.is_active_student_of(new.teacher_id, new.user_id) then
      raise exception 'not_your_teacher' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' then
      new.verification := 'self_reported';
      new.confirmed_at := null;
    elsif new.rank_id is distinct from old.rank_id or new.degree is distinct from old.degree
       or new.promoted_on is distinct from old.promoted_on or new.teacher_id is distinct from old.teacher_id then
      -- Mudou o que foi confirmado: volta a ser autodeclarado.
      new.verification := 'self_reported';
      new.confirmed_at := null;
    end if;
  end if;
  return new;
end;
$$;


create or replace function public.confirm_promotion(p_promotion uuid, p_confirm boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.rank_promotions%rowtype;
begin
  select * into v_row from public.rank_promotions where id = p_promotion for update;
  if not found or v_row.teacher_id is distinct from v_uid then
    raise exception 'not_the_teacher' using errcode = '42501';
  end if;
  if not public.is_approved_teacher(v_uid) then
    raise exception 'teacher_not_approved' using errcode = '42501';
  end if;
  if v_row.verification = 'teacher_confirmed' then
    return;
  end if;
  if p_confirm and not public.is_active_student_of(v_uid, v_row.user_id) then
    raise exception 'not_your_student' using errcode = '42501';
  end if;

  if p_confirm then
    update public.rank_promotions
    set verification = 'teacher_confirmed', confirmed_at = now()
    where id = p_promotion;
    perform public.notify(v_row.user_id, v_uid, 'promotion_confirmed');
  else
    update public.rank_promotions set teacher_id = null where id = p_promotion;
  end if;
end;
$$;


-- Desfazer o vínculo cancela os pedidos de confirmação pendentes daquele aluno com aquele professor.
create or replace function public.teacher_students_clear_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'active' then
    update public.rank_promotions set teacher_id = null
    where user_id = old.student_id and teacher_id = old.teacher_id and verification = 'self_reported';
  end if;
  return null;
end;
$$;

revoke execute on function public.teacher_students_clear_requests() from public, anon, authenticated;

create trigger teacher_students_clear_requests
  after delete on public.teacher_students
  for each row execute function public.teacher_students_clear_requests();

-- Pedidos pendentes que já existiam com professor sem vínculo ativo deixam de aparecer na fila dele.
update public.rank_promotions rp set teacher_id = null
where rp.verification = 'self_reported' and rp.teacher_id is not null
  and not exists (select 1 from public.teacher_students ts
                  where ts.teacher_id = rp.teacher_id and ts.student_id = rp.user_id and ts.status = 'active');
