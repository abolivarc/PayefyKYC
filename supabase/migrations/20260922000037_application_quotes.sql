-- Cotización dentro del KYC.
-- Hasta ahora la tasa se acordaba por fuera (chat o trato directo). Un
-- comercio que llega por redes se da de alta y sube documentos sin que nadie
-- haya hablado de precio con él. Esta tabla guarda la propuesta que el equipo
-- arma desde el propio expediente: el MCC asignado, las tasas y el PDF que se
-- le envía al cliente.
create table if not exists public.application_quotes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,

  -- Giro asignado por Payefy (el comercio no sabe su MCC)
  mcc_code text not null,
  sector_name text,
  sector_debit_floor numeric(5,2),
  sector_credit_floor numeric(5,2),

  -- Tasas cotizadas (sin IVA)
  debit_rate numeric(5,2) not null,
  credit_rate numeric(5,2) not null,
  amex_rate numeric(5,2),
  international_rate numeric(5,2),
  monthly_volume numeric(14,2),

  -- Snapshot completo del generador: permite regenerar el PDF sin pérdida
  proposal_type text not null default 'general' check (proposal_type in ('general','comparative')),
  proposal_data jsonb not null default '{}',

  -- PDF tal como se le mandó al cliente
  pdf_storage_path text,
  pdf_file_name text,

  sent_at timestamptz,
  sent_to text,
  sent_by uuid references public.profiles(id),

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una cotización vigente por expediente (se actualiza si se recotiza)
create unique index if not exists application_quotes_application_key
  on public.application_quotes (application_id);

alter table public.application_quotes enable row level security;

-- Staff ve y escribe; el cliente ve la suya solo cuando ya se le envió
create policy "staff_manage_quotes" on public.application_quotes
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'client')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role <> 'client')
  );

create policy "client_reads_sent_quote" on public.application_quotes
  for select to authenticated
  using (
    sent_at is not null
    and exists (
      select 1
      from public.applications a
      join public.company_users cu on cu.company_id = a.company_id
      where a.id = application_quotes.application_id
        and cu.user_id = auth.uid()
    )
  );
