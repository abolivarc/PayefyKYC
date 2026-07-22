-- Leads comerciales: prospectos cotizados con el generador de propuestas.
-- Un lead puede "casarse" después con un cliente KYC real vía company_id.
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  -- Prospecto
  business_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  entity_type text,
  product_type text,
  mcc_code text,
  sector_name text,
  monthly_volume numeric,
  average_ticket numeric,
  -- Propuesta (tasas, competidor, dispersión — snapshot completo del wizard)
  proposal_type text,
  proposal_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Pipeline
  status text NOT NULL DEFAULT 'propuesta'
    CHECK (status IN ('propuesta', 'negociacion', 'ganado', 'perdido')),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  notes text
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_company_idx ON public.leads (company_id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_staff_select ON public.leads;
CREATE POLICY leads_staff_select ON public.leads FOR SELECT
  USING (user_has_role(ARRAY['sales_agent','sales_director','compliance','onboarding','accounting','super_admin']::user_role[]));

DROP POLICY IF EXISTS leads_staff_insert ON public.leads;
CREATE POLICY leads_staff_insert ON public.leads FOR INSERT
  WITH CHECK (user_has_role(ARRAY['sales_agent','sales_director','compliance','onboarding','accounting','super_admin']::user_role[]));

DROP POLICY IF EXISTS leads_staff_update ON public.leads;
CREATE POLICY leads_staff_update ON public.leads FOR UPDATE
  USING (user_has_role(ARRAY['sales_agent','sales_director','compliance','onboarding','accounting','super_admin']::user_role[]));

DROP POLICY IF EXISTS leads_staff_delete ON public.leads;
CREATE POLICY leads_staff_delete ON public.leads FOR DELETE
  USING (user_has_role(ARRAY['sales_agent','sales_director','compliance','onboarding','accounting','super_admin']::user_role[]));
