-- Flag para forzar/sugerir cambio de contraseña en el primer ingreso
-- (usuarios staff creados por un admin con contraseña temporal)
-- Aplicada en producción el 2026-07-20 vía MCP.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
