-- =====================================================
-- PayefyKYC — Migration 0005
-- Actualiza document_templates con requisitos oficiales
-- Agrega terminal_type a companies
-- Agrega internal_reviewer_email a products
-- Actualiza bucket kyc-documents para aceptar más tipos
-- =====================================================

-- 1. Columnas nuevas en tablas existentes
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS terminal_type text
    CHECK (terminal_type IN ('card_present','ecommerce','both'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS internal_reviewer_email text;

UPDATE public.products SET internal_reviewer_email = 'francisco.sosa@payefy.me'
  WHERE code = 'cards';
UPDATE public.products SET internal_reviewer_email = 'e.lopez@payefy.me'
  WHERE code = 'terminals';

-- 2. Actualizar bucket kyc-documents (aceptar PDF, JPG, XLSX, ZIP)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed'
]
WHERE id = 'kyc-documents';

-- 3. Limpiar templates incorrectos de CARDS
DO $$
DECLARE cards_id uuid;
BEGIN
  SELECT id INTO cards_id FROM public.products WHERE code = 'cards';

  DELETE FROM public.document_templates
    WHERE product_id = cards_id
      AND code IN ('tax_situation_certificate','legal_rep_address_proof');

  UPDATE public.document_templates
    SET is_required = false
    WHERE product_id = cards_id AND code = 'power_of_attorney';

  UPDATE public.document_templates
    SET is_required = false
    WHERE product_id = cards_id AND code = 'incorporation_act_update'
    OR  (product_id = cards_id AND code = 'power_of_attorney');

  -- Agregar templates faltantes de CARDS
  INSERT INTO public.document_templates
    (product_id, code, name, description, is_required, is_form,
     is_signature_required, file_format, sort_order, instructions)
  VALUES
    (cards_id,'incorporation_act_update','Última actualización del acta',
     'Última modificación del acta constitutiva, si aplica.',
     false,false,false,'pdf',25,
     'Solo si el acta ha sido modificada. Incluye todas las modificaciones previas.'),
    (cards_id,'efirma','Constancia e.firma de la empresa',
     'Archivo .cer o .key de la e.firma de la empresa ante el SAT.',
     true,false,false,'pdf',40,
     'Descarga tu constancia de e.firma desde el portal del SAT y súbela en PDF.'),
    (cards_id,'cif','CIF de la empresa',
     'Cédula de Identificación Fiscal de la empresa.',
     true,false,false,'pdf',50,
     'Descárgalo desde el portal del SAT → RFC → Generar CIF.'),
    (cards_id,'shareholder_id','ID oficial de accionistas (25%+)',
     'Identificación oficial vigente de cada accionista con 25% o más de participación.',
     true,false,false,'pdf',70,
     'Sube una identificación por cada accionista. Puedes agregar más usando el botón "+".'),
    (cards_id,'legal_rep_selfie','Prueba de vida — representante legal',
     'Selfie del representante legal sosteniendo su identificación oficial.',
     true,false,false,'jpg',90,
     'Foto tipo selfie con tu identificación vigente. Formato JPG o PNG.'),
    (cards_id,'tax_declaration','Declaración anual o mensual',
     'Última declaración anual o declaración mensual más reciente.',
     true,false,false,'pdf',100,
     'Descárgala desde el portal del SAT en PDF.'),
    (cards_id,'sat_compliance','Opinión de cumplimiento del SAT',
     'Opinión positiva de cumplimiento de obligaciones fiscales del SAT.',
     true,false,false,'pdf',110,
     'Solicítala en sat.gob.mx → Trámites → Opinión del cumplimiento.'),
    (cards_id,'administrator_id','ID oficial de administradores',
     'Identificación oficial vigente de cada miembro del consejo de administración.',
     true,false,false,'pdf',120,
     'Sube una identificación por cada administrador. Puedes agregar más usando el botón "+".')
  ON CONFLICT (product_id, code) DO NOTHING;
END $$;

-- 4. Agregar templates de TERMINALS (Persona Moral)
DO $$
DECLARE terminals_id uuid;
BEGIN
  SELECT id INTO terminals_id FROM public.products WHERE code = 'terminals';

  INSERT INTO public.document_templates
    (product_id, code, name, description, is_required, is_form,
     is_signature_required, file_format, sort_order, instructions)
  VALUES
    (terminals_id,'incorporation_act','Acta constitutiva',
     'Acta constitutiva con inscripción al Registro Público de Comercio.',
     true,false,false,'pdf',10,
     'Acta completa con todas sus modificaciones. Debe estar inscrita en el RPC.'),
    (terminals_id,'inscription_rpc','Inscripción al Reg. Público de Comercio',
     'Boleta de inscripción en el Registro Público de la Propiedad y el Comercio.',
     true,false,false,'pdf',20,
     'Documento separado del acta que acredita la inscripción al RPC.'),
    (terminals_id,'legal_rep_id','Identificación del representante legal',
     'Identificación oficial vigente del representante legal (INE, pasaporte).',
     true,false,false,'pdf',30,
     'Ambos lados en un solo PDF si es INE.'),
    (terminals_id,'company_address_proof','Comprobante de domicilio de la empresa',
     'Comprobante de domicilio no mayor a 2 meses.',
     true,false,false,'pdf',40,
     'CFE, Telmex, estados de cuenta bancarios. No mayor a 2 meses.'),
    (terminals_id,'tax_situation_certificate','Constancia de situación fiscal',
     'Constancia de situación fiscal del SAT, no mayor a 2 meses.',
     true,false,false,'pdf',50,
     'Descárgala desde el portal del SAT. Debe tener fecha reciente.'),
    (terminals_id,'bank_statement','Estado de cuenta bancario',
     'Estado de cuenta bancario de la empresa, no mayor a 2 meses.',
     true,false,false,'pdf',60,
     'Estado de cuenta de la cuenta de la empresa. No mayor a 2 meses.'),
    (terminals_id,'business_photos','Fotos del negocio (interior y exterior)',
     'Fotografías del interior y exterior del establecimiento físico.',
     false,false,false,'jpg',70,
     'Solo para modalidad Tarjeta Presente. Sube las fotos en un ZIP o PDF.'),
    (terminals_id,'website_url','URL del sitio web (e-commerce)',
     'Documento con la URL de tu sitio web de comercio electrónico.',
     false,false,false,'pdf',80,
     'Solo para modalidad E-commerce. Sube un documento con la URL de tu tienda.')
  ON CONFLICT (product_id, code) DO NOTHING;
END $$;
