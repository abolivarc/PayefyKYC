-- Fotos del negocio y URL del sitio dejan de ser opcionales: la modalidad de
-- la terminal define cuál aplica (tarjeta presente → fotos; e-commerce/link →
-- URL; ambas → las dos). El filtrado por modalidad se hace al crear la
-- solicitud (filterTerminalTemplates); aquí se marcan como obligatorias.
UPDATE public.document_templates dt
SET is_required = true
FROM public.products p
WHERE p.id = dt.product_id
  AND p.code = 'terminals'
  AND dt.code IN ('business_photos', 'website_url', 'pf_business_photos', 'pf_website_url');

-- Limpieza de solicitudes existentes: quitar el documento que no aplica
-- según la modalidad ya elegida por la empresa.
DELETE FROM public.documents d
USING public.applications a, public.companies c, public.products p, public.document_templates dt
WHERE d.application_id = a.id
  AND a.company_id = c.id
  AND a.product_id = p.id
  AND d.template_id = dt.id
  AND p.code = 'terminals'
  AND (
    (c.terminal_type = 'card_present' AND dt.code IN ('website_url', 'pf_website_url'))
    OR
    (c.terminal_type = 'ecommerce' AND dt.code IN ('business_photos', 'pf_business_photos'))
  );
