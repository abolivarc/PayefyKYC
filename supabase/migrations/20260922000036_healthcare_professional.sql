-- Comercios de giro médico en solicitudes de terminales.
-- Los MCC de médicos y dentistas tienen intercambio casi cero (piso 0.6),
-- pero para ofrecer esa tasa Payefy necesita acreditar la actividad: se
-- pregunta en el alta y, si es profesional de la salud, se le pide su
-- cédula profesional.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_healthcare_professional boolean;

-- Plantilla del documento (solo terminales, ambos tipos de persona)
INSERT INTO public.document_templates
  (product_id, code, name, description, is_form, is_required, field_type, file_format, instructions, sort_order)
SELECT p.id, 'professional_license', 'Cédula profesional',
  'Cédula profesional del titular, para acreditar la actividad médica',
  false, true, 'upload', 'pdf',
  'Cédula profesional vigente emitida por la SEP. Con ella acreditamos tu actividad médica para darte la tasa preferencial de tu giro.',
  3
FROM public.products p
WHERE p.code = 'terminals'
  AND NOT EXISTS (
    SELECT 1 FROM public.document_templates dt
    WHERE dt.product_id = p.id AND dt.code = 'professional_license'
  );
