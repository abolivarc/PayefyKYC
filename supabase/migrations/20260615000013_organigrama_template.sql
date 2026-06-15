-- Migration: add organigrama document template for cards

DO $$
DECLARE cards_id uuid;
BEGIN
  SELECT id INTO cards_id FROM public.products WHERE code = 'cards';
  IF cards_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.document_templates
    (product_id, code, name, description, field_type, is_required,
     is_form, is_signature_required, file_format, sort_order, instructions)
  VALUES
    (cards_id, 'organigrama',
     'Organigrama corporativo',
     'Diagrama o documento que muestre la estructura accionaria y corporativa de la empresa.',
     'upload', false, false, false, 'pdf', 15,
     'Incluye accionistas, porcentaje de participación y estructura de control. Puede ser en PDF, imagen o Excel.')
  ON CONFLICT (product_id, code) DO NOTHING;
END $$;

-- GRANTs explícitos
GRANT ALL ON public.document_templates TO service_role;
GRANT SELECT ON public.document_templates TO authenticated;
