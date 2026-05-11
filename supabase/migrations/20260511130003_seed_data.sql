-- =====================================================
-- PayefyKYC — Seed Data
-- Migration: 0004_seed_data
-- Note: Document templates here are PRELIMINARY.
-- Final list pending official PDF of requirements.
-- =====================================================

-- =====================================================
-- PRODUCTS
-- =====================================================

insert into public.products (code, name, description, is_active)
values
  ('cards',     'Tarjetas',          'Tarjetas de crédito empresariales Payefy',     true),
  ('terminals', 'Terminales (TPV)',  'Terminales punto de venta Payefy',             true)
on conflict (code) do nothing;

-- =====================================================
-- DOCUMENT TEMPLATES — CARDS (preliminary)
-- =====================================================

do $$
declare
  cards_product_id uuid;
begin
  select id into cards_product_id from public.products where code = 'cards';

  insert into public.document_templates (
    product_id, code, name, description,
    max_age_days, is_required, is_form, is_signature_required,
    sort_order, cross_validation_fields, instructions
  )
  values
    (
      cards_product_id, 'complementary_info',
      'Información Complementaria',
      'Formulario con datos generales de la empresa, organigrama, PEP, clientes/proveedores.',
      null, true, true, false, 10,
      '["legal_name", "tax_id"]'::jsonb,
      'Llena el formulario directamente en el portal. El PDF se genera automáticamente.'
    ),
    (
      cards_product_id, 'beneficial_owner',
      'Constancia de Beneficiario Controlador',
      'Declaración del beneficiario controlador. SIEMPRE debe descargarse, imprimirse y firmarse, exista o no beneficiario controlador.',
      null, true, true, true, 20,
      '["legal_name", "legal_representative_name"]'::jsonb,
      'Llena el formulario, descarga el PDF generado, imprímelo, fírmalo a mano y vuelve a subirlo. La firma del representante legal es obligatoria en TODOS los casos.'
    ),
    (
      cards_product_id, 'incorporation_act',
      'Acta Constitutiva',
      'Acta constitutiva de la empresa con boletas de inscripción al Registro Público de Comercio.',
      null, true, false, false, 30,
      '["legal_name", "tax_id"]'::jsonb,
      'Acta constitutiva completa, incluyendo todas sus modificaciones si existen.'
    ),
    (
      cards_product_id, 'power_of_attorney',
      'Poder del Representante Legal',
      'Documento que acredita las facultades del representante legal (si están separadas del acta constitutiva).',
      null, false, false, false, 40,
      '["legal_representative_name", "legal_name"]'::jsonb,
      'Solo si las facultades del representante legal no están en el acta constitutiva.'
    ),
    (
      cards_product_id, 'tax_situation_certificate',
      'Constancia de Situación Fiscal',
      'Constancia de situación fiscal (CSF) emitida por el SAT.',
      60, true, false, false, 50,
      '["legal_name", "tax_id", "tax_regime"]'::jsonb,
      'Descarga la CSF más reciente desde el portal del SAT. Antigüedad máxima: 60 días.'
    ),
    (
      cards_product_id, 'company_address_proof',
      'Comprobante de Domicilio Fiscal',
      'Comprobante de domicilio fiscal de la empresa.',
      60, true, false, false, 60,
      '["legal_name"]'::jsonb,
      'Recibo de luz, agua, predial, o teléfono fijo a nombre de la empresa. Antigüedad máxima: 60 días.'
    ),
    (
      cards_product_id, 'legal_rep_id',
      'Identificación Oficial del Representante Legal',
      'INE, pasaporte o cédula profesional vigente del representante legal.',
      null, true, false, false, 70,
      '["legal_representative_name"]'::jsonb,
      'Identificación oficial vigente (INE, pasaporte o cédula profesional).'
    ),
    (
      cards_product_id, 'legal_rep_address_proof',
      'Comprobante de Domicilio del Representante Legal',
      'Comprobante de domicilio personal del representante legal.',
      60, true, false, false, 80,
      '["legal_representative_name"]'::jsonb,
      'Recibo de luz, agua, predial, o teléfono fijo a nombre del representante legal. Antigüedad máxima: 60 días.'
    )
  on conflict (product_id, code) do nothing;
end $$;
