-- A) Agregar company_address_proof a CARDS (falta en cards, ya existe en terminals)
DO $$
DECLARE cards_id uuid;
BEGIN
  SELECT id INTO cards_id FROM public.products WHERE code = 'cards';

  INSERT INTO public.document_templates
    (product_id, code, name, description, is_required, is_form,
     is_signature_required, file_format, sort_order, instructions)
  VALUES
    (cards_id, 'company_address_proof', 'Comprobante de domicilio de la empresa',
     'Comprobante de domicilio de la empresa, no mayor a 2 meses.',
     true, false, false, 'pdf', 55,
     'CFE, Telmex, estados de cuenta bancarios. No mayor a 2 meses.')
  ON CONFLICT (product_id, code) DO NOTHING;
END $$;

-- B) Agregar terms_and_conditions a CARDS
DO $$
DECLARE cards_id uuid;
BEGIN
  SELECT id INTO cards_id FROM public.products WHERE code = 'cards';

  INSERT INTO public.document_templates
    (product_id, code, name, description, is_required, is_form,
     is_signature_required, file_format, sort_order, instructions)
  VALUES
    (cards_id, 'terms_and_conditions', 'Términos y condiciones firmados',
     'Términos y condiciones firmados de manera autógrafa.',
     true, false, true, 'pdf', 130,
     'Descarga el documento, fírmalo de manera autógrafa y sube el escaneo en PDF.')
  ON CONFLICT (product_id, code) DO NOTHING;
END $$;

-- C) Hacer legal_rep_id multi-upload en CARDS (agregar al set de MULTI_UPLOAD_CODES)
-- No requiere cambio en BD, solo en UI (ya se hará abajo)

-- D) Agregar templates de Terminales Persona Física
-- Nota: usamos el MISMO product (terminals), con un prefijo pf_ para distinguirlos
-- El sistema mostrará PF o PM según el tipo de persona de la empresa
DO $$
DECLARE terminals_id uuid;
BEGIN
  SELECT id INTO terminals_id FROM public.products WHERE code = 'terminals';

  INSERT INTO public.document_templates
    (product_id, code, name, description, is_required, is_form,
     is_signature_required, file_format, sort_order, instructions)
  VALUES
    (terminals_id, 'pf_official_id', 'Identificación oficial',
     'Identificación oficial vigente (INE, pasaporte).',
     true, false, false, 'pdf', 110,
     'Ambos lados en un solo PDF si es INE.'),
    (terminals_id, 'pf_address_proof', 'Comprobante de domicilio',
     'Comprobante de domicilio no mayor a 2 meses.',
     true, false, false, 'pdf', 120,
     'CFE, Telmex, estados de cuenta bancarios. No mayor a 2 meses.'),
    (terminals_id, 'pf_tax_situation', 'Constancia de situación fiscal',
     'Constancia de situación fiscal del SAT, no mayor a 2 meses.',
     true, false, false, 'pdf', 130,
     'Descárgala desde el portal del SAT. Debe tener fecha reciente.'),
    (terminals_id, 'pf_bank_statement', 'Estado de cuenta',
     'Estado de cuenta bancario, no mayor a 2 meses.',
     true, false, false, 'pdf', 140,
     'Estado de cuenta personal. No mayor a 2 meses.'),
    (terminals_id, 'pf_business_photos', 'Fotos del negocio',
     'Fotografías del interior y exterior del establecimiento.',
     false, false, false, 'jpg', 150,
     'Solo para modalidad Tarjeta Presente. Sube en ZIP o PDF.'),
    (terminals_id, 'pf_website_url', 'URL del sitio web',
     'Documento con la URL del sitio web de e-commerce.',
     false, false, false, 'pdf', 160,
     'Solo para modalidad E-commerce.')
  ON CONFLICT (product_id, code) DO NOTHING;
END $$;
