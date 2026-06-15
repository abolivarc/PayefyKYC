-- =====================================================
-- PayefyKYC — Product Orders (B5)
-- =====================================================

create table public.product_orders (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  product_code  text not null,
  quantity      int not null default 1 check (quantity > 0),
  shipping_address text not null,
  notes         text,
  invoice_path  text,
  status        text not null
    check (status in ('requested','invoiced','shipped','closed'))
    default 'requested',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_product_orders_company on public.product_orders(company_id);
create index idx_product_orders_status  on public.product_orders(status);

create trigger product_orders_updated_at
  before update on public.product_orders
  for each row execute function public.set_updated_at();

-- RLS
alter table public.product_orders enable row level security;

-- Clients see only their own company's orders
create policy "product_orders_select_member"
  on public.product_orders for select
  using (public.is_company_member(company_id));

-- Clients can create orders for their own company
create policy "product_orders_insert_member"
  on public.product_orders for insert
  with check (public.is_company_member(company_id));

-- Staff sees all orders
create policy "product_orders_select_staff"
  on public.product_orders for select
  using (public.user_has_role(array[
    'sales_agent','sales_director','compliance','onboarding','accounting','super_admin'
  ]::user_role[]));

-- Staff can update orders (status changes, invoice attachment)
create policy "product_orders_update_staff"
  on public.product_orders for update
  using (public.user_has_role(array[
    'sales_agent','sales_director','compliance','onboarding','accounting','super_admin'
  ]::user_role[]));

-- GRANTs
grant select, insert on public.product_orders to authenticated;
grant update on public.product_orders to authenticated;
grant usage on sequence public.product_orders_id_seq to authenticated;
