-- Permitir al creador ver su propia empresa inmediatamente después de crearla
create policy "companies_select_creator"
  on public.companies for select
  using (created_by = auth.uid());
