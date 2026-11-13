begin;
\ir _helpers.psql

select plan(13);

select tests.create_user('chefe') as chefe \gset
select tests.create_user('mod') as mod \gset
select tests.create_user('comum') as comum \gset

insert into public.user_roles (user_id, role) values (:'chefe', 'superadmin');

-- Usuário comum não se promove
select tests.authenticate_as(:'comum');
select throws_ok(
  format($$ insert into public.user_roles (user_id, role, granted_by) values (%L, 'admin', %L) $$, :'comum', :'comum'),
  '42501', null, 'usuário comum não concede papel a si mesmo'
);
select is(public.has_role('moderator'), false, 'usuário comum não é moderador');
select is((select count(*)::int from public.admin_audit_log), 0, 'usuário comum não lê a auditoria');
select throws_ok($$ update public.user_roles set role = 'superadmin' $$, '42501', null, 'ninguém faz UPDATE em user_roles');

-- Superadmin concede moderador
select tests.authenticate_as(:'chefe');
select lives_ok(
  format($$ insert into public.user_roles (user_id, role, granted_by) values (%L, 'moderator', %L) $$, :'mod', :'chefe'),
  'superadmin concede papel'
);
select throws_ok(
  format($$ insert into public.user_roles (user_id, role, granted_by) values (%L, 'admin', %L) $$, :'comum', :'comum'),
  '42501', null, 'granted_by precisa ser quem concede'
);
select ok((select count(*) from public.admin_audit_log where target_type = 'user_roles' and actor_id = :'chefe') >= 1,
  'concessão registrada na auditoria');

-- Hierarquia
select tests.authenticate_as(:'mod');
select is(public.has_role('moderator'), true, 'moderador tem papel de moderador');
select is(public.has_role('admin'), false, 'moderador não é admin');
select is((select count(*)::int from public.user_roles), 1, 'moderador vê só o próprio papel');
select throws_ok($$ delete from public.admin_audit_log $$, '42501', null, 'auditoria não pode ser apagada');

select tests.authenticate_as(:'chefe');
select is(public.has_role('admin'), true, 'superadmin herda admin');

-- Suspensão desliga o papel
select tests.as_postgres();
update public.profiles set status = 'suspended' where id = :'mod';
select tests.authenticate_as(:'mod');
select is(public.has_role('moderator'), false, 'moderador suspenso perde o papel');

select * from finish();
rollback;
