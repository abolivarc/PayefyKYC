-- En la solicitud de Terminales (TPV) no se pide CURP ni RFC de accionistas.
-- Se eliminan las plantillas del producto terminals y los documentos ya
-- generados a partir de ellas en solicitudes existentes.
DELETE FROM public.documents
WHERE template_id IN (
  SELECT dt.id FROM public.document_templates dt
  JOIN public.products p ON p.id = dt.product_id
  WHERE p.code = 'terminals'
    AND dt.code IN ('shareholders_curp', 'shareholders_rfc')
);

DELETE FROM public.document_templates dt
USING public.products p
WHERE p.id = dt.product_id
  AND p.code = 'terminals'
  AND dt.code IN ('shareholders_curp', 'shareholders_rfc');
