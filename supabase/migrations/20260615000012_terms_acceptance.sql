-- =====================================================
-- PayefyKYC — Migration 0012
-- Aceptación de Términos y Condiciones de la plataforma
-- Columnas en companies; gate en flujo cliente
-- =====================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS terms_accepted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS terms_accepted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terms_version      text;

-- GRANTs (por si acaso)
GRANT ALL ON public.companies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
