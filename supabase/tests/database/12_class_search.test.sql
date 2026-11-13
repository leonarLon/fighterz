begin;
\ir _helpers.psql

select plan(10);

-- O seed local também tem aulas em Curitiba: as contagens filtram as academias deste teste ('Academia N').
-- Aceite da Fase 4: professor em 3 academias vê a grade unificada; visitante consulta grade e mapa.
select tests.create_user('itinerante') as prof \gset
insert into public.teacher_profiles (user_id, professional_name) values (:'prof', 'Professor Itinerante');
update public.teacher_profiles set status = 'approved' where user_id = :'prof';
select id as bjj from public.martial_arts where slug = 'jiu-jitsu' \gset
select id as mt from public.martial_arts where slug = 'muay-thai' \gset

do $$
declare
  v_prof uuid := (select id from public.profiles where username = 'itinerante');
  v_owner uuid;
  v_acad uuid;
  v_unit uuid;
  v_bjj uuid := (select id from public.martial_arts where slug = 'jiu-jitsu');
  v_mt  uuid := (select id from public.martial_arts where slug = 'muay-thai');
  -- Centro de Curitiba, Batel (≈2,3 km) e Santa Felicidade (≈6,6 km)
  v_coords double precision[][] := array[[-25.4284, -49.2733], [-25.4420, -49.2900], [-25.4040, -49.3330]];
  v_hoods text[] := array['Centro', 'Batel', 'Santa Felicidade'];
begin
  for i in 1..3 loop
    v_owner := tests.create_user('dona_' || i);
    insert into public.academies (name, created_by) values ('Academia ' || i, v_owner) returning id into v_acad;
    insert into public.academy_units (academy_id, name, neighborhood, city, state, latitude, longitude)
    values (v_acad, 'Unidade ' || i, v_hoods[i], 'Curitiba', 'PR', v_coords[i][1], v_coords[i][2]) returning id into v_unit;
    insert into public.academy_memberships (academy_id, user_id, role, status, requested_by)
    values (v_acad, v_prof, 'teacher', 'active', 'academy');
    insert into public.class_schedules (academy_id, unit_id, teacher_id, martial_art_id, name, weekday, starts_at, ends_at, accepts_trial, level)
    values (v_acad, v_unit, v_prof, case when i = 3 then v_mt else v_bjj end, 'Aula ' || i, i, make_time(6 + i * 4, 0, 0), make_time(7 + i * 4, 0, 0), i = 1,
            case when i = 2 then 'beginner' else 'all' end::public.class_level);
  end loop;
end;
$$;

select tests.as_anon();
select is((select count(*)::int from public.get_teacher_schedule(:'prof')), 3, 'grade unificada com as 3 academias');
select is((select count(distinct academy_id)::int from public.get_teacher_schedule(:'prof')), 3, 'uma aula de cada academia');

-- Distância
select is((select count(*)::int from public.search_classes(-25.4284, -49.2733, 3) where (class).academy_name like 'Academia _'), 2, 'raio de 3 km: Centro e Batel');
select is((select (class).academy_name from public.search_classes(-25.4284, -49.2733, 20) where (class).academy_name like 'Academia _' limit 1), 'Academia 1', 'mais perto primeiro');
select ok((select distance_km between 6 and 7 from public.search_classes(-25.4284, -49.2733, 20) where (class).neighborhood = 'Santa Felicidade'),
  'distância calculada em km');

-- Filtros
select is((select count(*)::int from public.search_classes(p_martial_art => :'mt') where (class).academy_name like 'Academia _'), 1, 'filtro por modalidade');
select is((select count(*)::int from public.search_classes(p_trial_only => true) where (class).academy_name like 'Academia _'), 1, 'só aula experimental');
select is((select count(*)::int from public.search_classes(p_period => 'evening') where (class).academy_name like 'Academia _'), 1, 'período noite (18h+)');
select is((select count(*)::int from public.search_classes(p_city => 'curitiba', p_neighborhood => 'batel') where (class).academy_name like 'Academia _'), 1, 'cidade e bairro sem acento/caixa');
select is((select count(*)::int from public.search_classes(p_level => 'beginner') where (class).academy_name like 'Academia _'), 3, 'iniciante inclui aulas "todos os níveis"');

select * from finish();
rollback;
