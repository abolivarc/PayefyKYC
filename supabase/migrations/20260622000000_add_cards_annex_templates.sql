-- 20260622000000_add_cards_annex_templates.sql
-- Propósito: dar "casa" a documentos reales que hoy NO tienen slot en el
-- expediente de Tarjetas (documents.template_id es NOT NULL, así que no se
-- pueden colgar anexos sueltos). Se añaden 2 plantillas al producto Tarjetas
-- y se permite docx en el bucket kyc-documents.
--
-- Es ADITIVA: no toca rutas, RLS, ni plantillas existentes. is_required=false
-- en ambas para no romper el cálculo de completitud de expedientes ya creados.
--
-- Producto Tarjetas: 0335e6a0-f4bc-4243-8b5e-f1dce581e5ee

begin;

-- 1) Estado de cuenta / carátula bancaria (faltaba en Tarjetas; sí existe en Terminales)
insert into public.document_templates
  (id, product_id, code, name, description, is_required, is_form,
   is_signature_required, field_type, file_format, sort_order)
select gen_random_uuid(),
       '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee',
       'bank_statement',
       'Estado de cuenta / carátula bancaria',
       'Estado de cuenta, carátula bancaria o solicitud de subcuenta del comercio.',
       false, false, false, 'upload', 'pdf', 62
where not exists (
  select 1 from public.document_templates
  where product_id = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee' and code = 'bank_statement'
);

-- 2) Anexo genérico (CURP, constancias PF, cartas de aumento de límite, formatos
--    de proveedor, etc.). Admite varias filas (varios archivos) por expediente.
insert into public.document_templates
  (id, product_id, code, name, description, is_required, is_form,
   is_signature_required, field_type, file_format, sort_order)
select gen_random_uuid(),
       '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee',
       'annex',
       'Anexos / otros documentos',
       'Documentos de soporte sin slot propio: CURP, constancia fiscal de personas '
       || 'físicas, cartas de aumento de límite, formatos KYC de proveedor, etc.',
       false, false, false, 'upload', 'pdf', 200
where not exists (
  select 1 from public.document_templates
  where product_id = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee' and code = 'annex'
);

-- 3) Permitir .docx en kyc-documents (Yushu trae 2 archivos .docx sueltos).
--    El bucket generated-pdfs ya lo permitía; lo igualamos aquí.
update storage.buckets
set allowed_mime_types = (
  select array(
    select distinct unnest(
      allowed_mime_types
      || array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    )
  )
)
where id = 'kyc-documents'
  and not ('application/vnd.openxmlformats-officedocument.wordprocessingml.document'
           = any(allowed_mime_types));

commit;

-- Verificación rápida (correr aparte):
--   select code, name, is_required, sort_order from public.document_templates
--   where product_id='0335e6a0-f4bc-4243-8b5e-f1dce581e5ee' order by sort_order;
--   select id, allowed_mime_types from storage.buckets where id='kyc-documents';
