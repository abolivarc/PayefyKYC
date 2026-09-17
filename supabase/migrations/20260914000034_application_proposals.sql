-- Propuestas comerciales adjuntas al expediente.
--
-- La propuesta que se le hizo al cliente es un artefacto comercial interno:
-- no es un documento de KYC (el cliente no debe verla en su checklist ni
-- reemplazarla) y no debe viajar en el ZIP que se manda al proveedor. Por eso
-- vive en su propia tabla, como los contratos firmados, y no en `documents`.
-- Se permite más de una por expediente para conservar el historial de
-- versiones negociadas.

create table if not exists public.application_proposals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text,
  notes text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists application_proposals_application_idx
  on public.application_proposals (application_id, created_at desc);

alter table public.application_proposals enable row level security;

-- Solo personal interno. Sin política para clientes: no pueden leerla.
create policy "application_proposals_staff_select"
  on public.application_proposals for select
  using (public.current_user_role() <> 'client');

create policy "application_proposals_staff_insert"
  on public.application_proposals for insert
  with check (public.current_user_role() <> 'client');

create policy "application_proposals_staff_delete"
  on public.application_proposals for delete
  using (public.current_user_role() <> 'client');
