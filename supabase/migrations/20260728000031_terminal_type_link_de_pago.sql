-- "Link de pago" pasa a ser una modalidad propia (antes caía dentro de
-- e-commerce). Se comporta igual para efectos de documentos: pide URL del
-- sitio y no fotos del negocio.
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_terminal_type_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_terminal_type_check
  CHECK (terminal_type = ANY (ARRAY['card_present', 'ecommerce', 'link_de_pago', 'both']));
