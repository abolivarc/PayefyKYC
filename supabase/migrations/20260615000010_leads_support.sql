-- Soporte para flujo de leads: agente pre-crea la empresa e invita al cliente.

-- 1. Nuevo valor en company_status
ALTER TYPE public.company_status ADD VALUE IF NOT EXISTS 'lead' BEFORE 'active';

-- 2. Columnas de lead en companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS contact_email   text,
  ADD COLUMN IF NOT EXISTS lead_invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS lead_product_code text;

-- 3. RFC ahora opcional (leads pueden no tenerlo al pre-crear)
ALTER TABLE public.companies ALTER COLUMN tax_id DROP NOT NULL;

-- 4. GRANTs (cubiertos por migración 0008, se reiteran para seguridad)
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
