begin;
\ir _helpers.psql

select plan(14);

select tests.create_user('mestre') as mestre \gset
select tests.create_user('curioso') as curioso \gset
select tests.create_user('chefe') as chefe \gset
insert into public.user_roles (user_id, role) values (:'chefe', 'admin');

-- Pedido nasce pendente, mesmo tentando forçar
select tests.authenticate_as(:'mestre');
select throws_ok(
  format($$ insert into public.teacher_profiles (user_id, professional_name, status) values (%L, 'Mestre X', 'approved') $$, :'mestre'),
  '42501', null, 'cliente não envia status'
);
select lives_ok(
  format($$ insert into public.teacher_profiles (user_id, professional_name, contact_email, contact_phone, show_contact, social_links)
            values (%L, 'Mestre Xavier', 'mestre@exemplo.com', '+55 41 99999-0000', false, '["https://instagram.com/mestre"]') $$, :'mestre'),
  'pedido de perfil profissional'
);
select is((select status::text from public.teacher_profiles where user_id = :'mestre'), 'pending', 'pedido pendente');
select throws_ok(
  $$ update public.teacher_profiles set social_links = '["http://inseguro.com"]' where user_id = auth.uid() $$,
  '23514', null, 'links sociais só https'
);
select throws_ok(format($$ select public.review_teacher(%L, 'approved') $$, :'mestre'), '42501', 'forbidden',
  'professor não se aprova');
select is(public.is_approved_teacher(:'mestre'), false, 'ainda não é professor');

-- Outro usuário não lê o pedido nem a página pública antes da aprovação
select tests.authenticate_as(:'curioso');
select is((select count(*)::int from public.teacher_profiles), 0, 'terceiros não leem pedidos');
select is((select count(*)::int from public.teacher_cards where user_id = :'mestre'), 0, 'não aprovado não aparece');

-- Admin aprova, com auditoria
select tests.authenticate_as(:'chefe');
select lives_ok(format($$ select public.review_teacher(%L, 'approved', 'Documentação ok') $$, :'mestre'), 'admin aprova');
select ok((select count(*) from public.admin_audit_log where action = 'teacher_approved' and target_id = :'mestre') = 1,
  'aprovação auditada');

-- Contato só com consentimento
select tests.as_anon();
select is((select contact_email from public.teacher_cards where user_id = :'mestre'), null, 'contato oculto sem show_contact');
select tests.as_postgres();
update public.teacher_profiles set show_contact = true where user_id = :'mestre';
select tests.as_anon();
select is((select contact_email from public.teacher_cards where user_id = :'mestre'), 'mestre@exemplo.com', 'contato visível com consentimento');

-- Recusado que edita volta para pendente
select tests.authenticate_as(:'chefe');
select public.review_teacher(:'mestre', 'rejected', 'Faltou certificado');
select tests.authenticate_as(:'mestre');
update public.teacher_profiles set lineage = 'Linhagem Y' where user_id = auth.uid();
select is((select status::text from public.teacher_profiles where user_id = auth.uid()), 'pending', 'reenviar volta para pendente');
select tests.as_anon();
select is((select count(*)::int from public.teacher_cards where user_id = :'mestre'), 0, 'recusado/pendente sai da página pública');

select * from finish();
rollback;
