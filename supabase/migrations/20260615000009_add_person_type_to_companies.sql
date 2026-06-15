-- Agrega tipo de persona jurídica a la empresa.
-- Necesario para filtrar plantillas PF/PM en terminales.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS person_type text
    CHECK (person_type IN ('persona_fisica', 'persona_moral'));

-- Los GRANTs globales ya los cubre la migración 0008 (ALTER DEFAULT PRIVILEGES),
-- pero se garantizan explícitamente aquí por si se ejecuta en orden distinto.
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
