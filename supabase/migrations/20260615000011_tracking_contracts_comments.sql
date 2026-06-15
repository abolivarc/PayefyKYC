-- =====================================================
-- PayefyKYC — Migration 0011
-- Contratos, comentarios, transfer_status, field_type
-- Requerido por /admin/tracking dashboard (P·A·T dots,
-- columna proveedor, bitácora)
-- =====================================================

-- 1. document_templates → field_type
ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS field_type text NOT NULL DEFAULT 'upload'
    CHECK (field_type IN ('upload','form','check_or_upload'));

-- 2. documents → is_checked / check_note
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_checked boolean NOT NULL DEFAULT false;
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS check_note text;

-- 3. applications → transfer columns
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS transfer_status text
    CHECK (transfer_status IN ('not_sent','sent','changes_requested','approved'))
    DEFAULT 'not_sent';
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS transfer_sent_at timestamptz;
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS transfer_recipient_email text;

-- 4. application_contracts
CREATE TABLE IF NOT EXISTS public.application_contracts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN (
                      'payefy_service',
                      'transfer_increase_letter',
                      'transfer_contract'
                    )),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','sent','signed','not_applicable')),
  sign_method       text,
  sent_at           timestamptz,
  signed_at         timestamptz,
  signed_doc_path   text,
  external_link     text,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_app_contracts_app
  ON public.application_contracts(application_id);

-- 5. application_comments
CREATE TABLE IF NOT EXISTS public.application_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body            text NOT NULL,
  kind            text NOT NULL DEFAULT 'note'
                    CHECK (kind IN ('note','email_sent','status')),
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_comments_app
  ON public.application_comments(application_id, created_at DESC);

-- 6. updated_at trigger para application_contracts
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_contracts_updated_at ON public.application_contracts;
CREATE TRIGGER trg_app_contracts_updated_at
  BEFORE UPDATE ON public.application_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Ajustar templates de cards
DO $$
DECLARE cards_id uuid;
BEGIN
  SELECT id INTO cards_id FROM public.products WHERE code = 'cards';
  IF cards_id IS NULL THEN RETURN; END IF;

  -- power_of_attorney → check_or_upload, required
  UPDATE public.document_templates
    SET field_type = 'check_or_upload', is_required = true
    WHERE product_id = cards_id AND code = 'power_of_attorney';

  -- inscription_rpc para cards (si no existe)
  INSERT INTO public.document_templates
    (product_id, code, name, description, field_type, is_required,
     is_form, is_signature_required, file_format, sort_order, instructions)
  VALUES
    (cards_id, 'inscription_rpc',
     'Inscripción al RPP y C',
     'Boleta de inscripción en el Registro Público de la Propiedad y el Comercio.',
     'check_or_upload', true, false, false, 'pdf', 32,
     'Puede estar en el acta constitutiva (marca la casilla) o ser un documento separado.')
  ON CONFLICT (product_id, code) DO UPDATE
    SET field_type = 'check_or_upload', is_required = true;

  -- Renombrar tax_declaration
  UPDATE public.document_templates
    SET name = 'Declaración Anual del Ejercicio (acuse completo del SAT)',
        instructions = 'Descarga el acuse completo de tu última declaración anual desde el portal del SAT en PDF.'
    WHERE product_id = cards_id AND code = 'tax_declaration';
END $$;

-- 8. GRANTs explícitos
GRANT ALL ON public.application_contracts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_contracts TO authenticated;

GRANT ALL ON public.application_comments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_comments TO authenticated;

-- Columnas nuevas en tablas existentes
GRANT ALL ON public.document_templates TO service_role;
GRANT SELECT ON public.document_templates TO authenticated;

GRANT ALL ON public.documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

GRANT ALL ON public.applications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;

-- Default privileges para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
