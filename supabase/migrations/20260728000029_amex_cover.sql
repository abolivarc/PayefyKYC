-- Afiliación American Express en solicitudes de terminales.
-- Se pregunta al crear la solicitud; si acepta AMEX, se le pide la
-- "Carátula de afiliación AMEX" firmada de forma autógrafa.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS wants_amex boolean;

-- Condiciones comerciales de la carátula: las captura Payefy, no el comercio
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS amex_conditions jsonb;

-- Plantilla del documento (solo terminales, ambos tipos de persona)
INSERT INTO public.document_templates
  (product_id, code, name, description, is_form, is_required, field_type, file_format, instructions, sort_order)
SELECT p.id, 'amex_cover', 'Carátula de afiliación AMEX',
  'Carátula de afiliación al sistema de pago con tarjeta American Express',
  true, true, 'upload', 'pdf',
  'Contesta los datos, descarga la carátula, fírmala de forma autógrafa y súbela escaneada.',
  2
FROM public.products p
WHERE p.code = 'terminals'
  AND NOT EXISTS (
    SELECT 1 FROM public.document_templates dt
    WHERE dt.product_id = p.id AND dt.code = 'amex_cover'
  );
