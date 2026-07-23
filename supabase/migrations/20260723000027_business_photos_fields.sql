-- Las fotos del negocio ahora se suben en campos individuales
-- (2 exterior, 2 interior + adicionales), ya no en un solo ZIP/PDF.
UPDATE public.document_templates dt
SET instructions = 'Sube 2 fotos del exterior y 2 del interior de tu comercio. Puedes agregar más si lo necesitas.'
FROM public.products p
WHERE p.id = dt.product_id
  AND p.code = 'terminals'
  AND dt.code IN ('business_photos', 'pf_business_photos');
