-- Cuestionario "Datos operativos del comercio" para el alta de terminales.
-- El comercio responde en la plataforma; se genera un PDF que viaja en el
-- ZIP del expediente para revisión de e.lopez.
INSERT INTO public.document_templates
  (product_id, code, name, description, is_form, is_required, field_type, file_format, instructions, sort_order)
SELECT p.id, v.code, 'Datos operativos del comercio',
  'Cuestionario de operación para el alta de la terminal',
  true, true, 'upload', 'pdf',
  'Responde el cuestionario de operación; se generará el archivo para tu alta.',
  1
FROM public.products p
CROSS JOIN (VALUES ('operational_info'), ('pf_operational_info')) AS v(code)
WHERE p.code = 'terminals'
  AND NOT EXISTS (
    SELECT 1 FROM public.document_templates dt
    WHERE dt.product_id = p.id AND dt.code = v.code
  );

-- Crear el documento en las solicitudes de terminales existentes,
-- respetando el tipo de persona de la empresa.
INSERT INTO public.documents (application_id, template_id, status)
SELECT a.id, dt.id, 'pending_upload'
FROM public.applications a
JOIN public.companies c ON c.id = a.company_id
JOIN public.products p ON p.id = a.product_id
JOIN public.document_templates dt ON dt.product_id = p.id
WHERE p.code = 'terminals'
  AND dt.code = CASE
    WHEN c.person_type = 'persona_fisica' THEN 'pf_operational_info'
    ELSE 'operational_info'
  END
  AND NOT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.application_id = a.id AND d.template_id = dt.id
  );
