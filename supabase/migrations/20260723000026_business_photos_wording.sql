-- Aclarar que son 2 fotos del exterior y 2 del interior del negocio.
UPDATE public.document_templates dt
SET name = 'Fotos del negocio (2 exterior y 2 interior)',
    instructions = 'Sube 2 fotos del exterior y 2 del interior de tu comercio, en un solo ZIP o PDF.'
FROM public.products p
WHERE p.id = dt.product_id
  AND p.code = 'terminals'
  AND dt.code IN ('business_photos', 'pf_business_photos');
