-- En terminales se piden DOS constancias de situación fiscal:
-- la de la empresa y la del representante legal.
-- (Persona física no la necesita: su propia CSF es pf_tax_situation.)
INSERT INTO public.document_templates
  (product_id, code, name, description, is_form, is_required, field_type, file_format, instructions, sort_order)
SELECT p.id, 'legal_rep_tax_situation', 'Constancia de situación fiscal del representante legal',
  'CSF del representante legal, no mayor a 2 meses',
  false, true, 'upload', 'pdf',
  'Constancia de situación fiscal del representante legal, con antigüedad no mayor a 2 meses.',
  (SELECT sort_order + 1 FROM public.document_templates
   WHERE product_id = p.id AND code = 'tax_situation_certificate')
FROM public.products p
WHERE p.code = 'terminals'
  AND NOT EXISTS (
    SELECT 1 FROM public.document_templates dt
    WHERE dt.product_id = p.id AND dt.code = 'legal_rep_tax_situation'
  );

-- Crear el documento en las solicitudes de terminales de persona moral
INSERT INTO public.documents (application_id, template_id, status)
SELECT a.id, dt.id, 'pending_upload'
FROM public.applications a
JOIN public.companies c ON c.id = a.company_id
JOIN public.products p ON p.id = a.product_id
JOIN public.document_templates dt ON dt.product_id = p.id
WHERE p.code = 'terminals'
  AND dt.code = 'legal_rep_tax_situation'
  AND COALESCE(c.person_type, 'persona_moral') <> 'persona_fisica'
  AND NOT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.application_id = a.id AND d.template_id = dt.id
  );
