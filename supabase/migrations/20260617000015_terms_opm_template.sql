-- Migration: add terms_opm document template (Términos y Condiciones OPM)

DO $$
DECLARE cards_id uuid;
BEGIN
  SELECT id INTO cards_id FROM public.products WHERE code = 'cards';
  IF cards_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.document_templates
    (product_id, code, name, description, field_type, is_required,
     is_form, is_signature_required, file_format, sort_order, instructions)
  VALUES
    (cards_id, 'terms_opm',
     'Términos y Condiciones OPM',
     'Términos y condiciones de Operadora de Pagos Móviles de México que deben ser firmados por el representante legal de la empresa.',
     'upload', true, true, true, 'docx', 25,
     'Genera el documento, descárgalo, imprímelo, fírmalo a mano, escanéalo y súbelo firmado.')
  ON CONFLICT (product_id, code) DO NOTHING;
END $$;

GRANT ALL ON public.document_templates TO service_role;
GRANT SELECT ON public.document_templates TO authenticated;
