-- 20260630000000_datos_sin_doc_tarjetas.sql
-- Propósito: agregar 4 plantillas data_check al producto Tarjetas
-- y backfill de documents para expedientes existentes.
-- field_type='data_check': sin subida de archivo; el admin valida los datos internamente.
--
-- Producto Tarjetas: 0335e6a0-f4bc-4243-8b5e-f1dce581e5ee
-- Es ADITIVA: no toca RLS, rutas ni plantillas existentes.

begin;

-- 0. Ampliar el check constraint de field_type para admitir 'data_check'
alter table public.document_templates
  drop constraint document_templates_field_type_check;

alter table public.document_templates
  add constraint document_templates_field_type_check
  check (field_type = any(array['upload'::text, 'form'::text, 'check_or_upload'::text, 'data_check'::text]));

-- 1. CURP de accionistas
insert into public.document_templates
  (id, product_id, code, name, description, is_required, is_form,
   is_signature_required, field_type, file_format, sort_order)
select gen_random_uuid(),
       '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee',
       'shareholders_curp',
       'CURP de accionistas',
       'CURP de cada accionista con participación significativa.',
       true, false, false, 'data_check', 'none', 210
where not exists (
  select 1 from public.document_templates
  where product_id = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee' and code = 'shareholders_curp'
);

-- 2. RFC de accionistas
insert into public.document_templates
  (id, product_id, code, name, description, is_required, is_form,
   is_signature_required, field_type, file_format, sort_order)
select gen_random_uuid(),
       '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee',
       'shareholders_rfc',
       'RFC de accionistas',
       'RFC de cada accionista con participación significativa.',
       true, false, false, 'data_check', 'none', 220
where not exists (
  select 1 from public.document_templates
  where product_id = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee' and code = 'shareholders_rfc'
);

-- 3. CURP de representantes legales
insert into public.document_templates
  (id, product_id, code, name, description, is_required, is_form,
   is_signature_required, field_type, file_format, sort_order)
select gen_random_uuid(),
       '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee',
       'legal_reps_curp',
       'CURP de representantes legales',
       'CURP de cada representante legal registrado.',
       true, false, false, 'data_check', 'none', 230
where not exists (
  select 1 from public.document_templates
  where product_id = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee' and code = 'legal_reps_curp'
);

-- 4. RFC de representantes legales
insert into public.document_templates
  (id, product_id, code, name, description, is_required, is_form,
   is_signature_required, field_type, file_format, sort_order)
select gen_random_uuid(),
       '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee',
       'legal_reps_rfc',
       'RFC de representantes legales',
       'RFC de cada representante legal registrado.',
       true, false, false, 'data_check', 'none', 240
where not exists (
  select 1 from public.document_templates
  where product_id = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee' and code = 'legal_reps_rfc'
);

-- 5. Backfill: crear documents para applications de Tarjetas ya existentes
-- status='pending_review' porque el cliente no sube nada; Payefy valida internamente.
insert into public.documents (application_id, template_id, status)
select a.id, dt.id, 'pending_review'
from public.applications a
join public.document_templates dt
  on dt.product_id = a.product_id
  and dt.field_type = 'data_check'
where a.product_id = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee'
and not exists (
  select 1 from public.documents d
  where d.application_id = a.id
  and d.template_id = dt.id
);

commit;

-- Verificación (correr aparte):
--   select code, name, is_required, field_type, sort_order
--   from public.document_templates
--   where product_id='0335e6a0-f4bc-4243-8b5e-f1dce581e5ee'
--   order by sort_order;
