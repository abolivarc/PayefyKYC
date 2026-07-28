-- Términos OPM y Anexos son obligatorios en el expediente de tarjetas.
UPDATE public.document_templates dt
SET is_required = true
FROM public.products p
WHERE p.id = dt.product_id
  AND p.code = 'cards'
  AND dt.code IN ('terms_opm', 'annex');
