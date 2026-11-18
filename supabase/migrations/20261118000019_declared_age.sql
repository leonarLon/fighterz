-- Feedback de produção (18/11/2026): o seletor de data de nascimento confundia no celular.
-- O cadastro passa a pedir só a idade (autodeclarada, como a data já era). A regra 18+ continua no banco.
-- Contas antigas mantêm birth_date; contas novas gravam declared_age. Uma das duas é obrigatória.

alter table public.user_settings alter column birth_date drop not null;
alter table public.user_settings
  add column declared_age smallint constraint user_settings_declared_age_range check (declared_age between 18 and 120);
alter table public.user_settings
  add constraint user_settings_age_present check (birth_date is not null or declared_age is not null);
-- O usuário não altera a idade depois do cadastro: as colunas atualizáveis são concedidas uma a uma
-- (migration 02), e declared_age não entra na lista.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta         jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username     text  := lower(btrim(v_meta ->> 'username'));
  v_display_name text  := btrim(v_meta ->> 'display_name');
  v_birth_date   date;
  v_age          integer;
begin
  if v_meta ? 'age' then
    -- Cadastro atual: idade em anos, inteira.
    if coalesce(v_meta ->> 'age', '') !~ '^\d{1,3}$' then
      raise exception 'invalid_age' using errcode = '22023';
    end if;
    v_age := (v_meta ->> 'age')::integer;
    if v_age < 18 then
      raise exception 'age_requirement_not_met' using errcode = '23514';
    end if;
    if v_age > 120 then
      raise exception 'invalid_age' using errcode = '22023';
    end if;
  else
    -- Compatibilidade: data de nascimento (seed local, testes e clientes antigos).
    begin
      v_birth_date := (v_meta ->> 'birth_date')::date;
    exception when others then
      raise exception 'invalid_birth_date' using errcode = '22007';
    end;
    if v_birth_date is null or v_birth_date > (current_date - interval '18 years')::date then
      raise exception 'age_requirement_not_met' using errcode = '23514';
    end if;
    if v_birth_date < date '1900-01-01' then
      raise exception 'invalid_birth_date' using errcode = '22007';
    end if;
  end if;

  if coalesce((v_meta ->> 'accepted_terms')::boolean, false) is not true then
    raise exception 'terms_not_accepted' using errcode = '23514';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, coalesce(nullif(v_display_name, ''), v_username));

  insert into public.user_settings (user_id, birth_date, declared_age, terms_accepted_at, privacy_accepted_at)
  values (new.id, v_birth_date, v_age, now(), now());

  return new;
end;
$$;
