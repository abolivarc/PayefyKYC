-- La Inscripción al Registro Público de Comercio a veces viene dentro del
-- acta constitutiva: en terminales debe permitir marcar "Está en el acta /
-- No aplica", igual que en tarjetas (field_type check_or_upload).
UPDATE public.document_templates dt
SET field_type = 'check_or_upload'
FROM public.products p
WHERE p.id = dt.product_id
  AND p.code = 'terminals'
  AND dt.code = 'inscription_rpc';
