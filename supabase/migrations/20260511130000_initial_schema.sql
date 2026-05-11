-- =====================================================
-- PayefyKYC — Initial Schema
-- Migration: 0001_initial_schema
-- =====================================================

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

create type user_role as enum (
  'client',
  'sales_agent',
  'sales_director',
  'compliance',
  'onboarding',
  'accounting',
  'super_admin'
);

create type company_status as enum (
  'active',
  'archived',
  'rejected'
);

create type company_user_role as enum (
  'legal_representative',
  'operator',
  'beneficial_owner',
  'collaborator'
);

create type application_status as enum (
  'draft',
  'documents_pending',
  'in_compliance_review',
  'changes_requested',
  'approved_compliance',
  'in_provider_review',
  'provider_changes_requested',
  'approved_provider',
  'contracts_pending',
  'contracts_signed',
  'activation_pending',
  'activated',
  'rejected',
  'archived'
);

create type document_status as enum (
  'pending_upload',
  'pending_review',
  'approved',
  'rejected',
  'changes_requested'
);

create type cross_validation_status as enum (
  'pending',
  'matches',
  'mismatch',
  'not_applicable'
);

-- =====================================================
-- 2. UTILITY: updated_at trigger function
-- =====================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- 3. PROFILES (extends auth.users)
-- =====================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role user_role not null default 'client',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_email on public.profiles(email);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile when new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- 4. COMPANIES
-- =====================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  tax_id text not null,
  tax_regime text,
  tax_address jsonb,
  phone text,
  website text,
  operator_email text,
  operator_name text,
  status company_status not null default 'active',
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_companies_assigned_agent on public.companies(assigned_agent_id);
create index idx_companies_status on public.companies(status);
create index idx_companies_tax_id on public.companies(tax_id);

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- =====================================================
-- 5. COMPANY_USERS (vincula usuarios a empresas)
-- =====================================================

create table public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_in_company company_user_role not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(company_id, user_id, role_in_company)
);

create index idx_company_users_company on public.company_users(company_id);
create index idx_company_users_user on public.company_users(user_id);

-- =====================================================
-- 6. PRODUCTS
-- =====================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================
-- 7. DOCUMENT_TEMPLATES
-- =====================================================

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  max_age_days int,
  is_required boolean not null default true,
  is_form boolean not null default false,
  is_signature_required boolean not null default false,
  file_format text not null default 'pdf',
  max_size_mb int not null default 20,
  sort_order int not null default 0,
  cross_validation_fields jsonb,
  instructions text,
  created_at timestamptz not null default now(),
  unique(product_id, code)
);

create index idx_doc_templates_product on public.document_templates(product_id);

-- =====================================================
-- 8. APPLICATIONS
-- =====================================================

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id),
  status application_status not null default 'draft',
  assigned_reviewer_id uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  activated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, product_id)
);

create index idx_applications_company on public.applications(company_id);
create index idx_applications_status on public.applications(status);
create index idx_applications_assigned_reviewer on public.applications(assigned_reviewer_id);
create index idx_applications_product on public.applications(product_id);

create trigger applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- =====================================================
-- 9. DOCUMENTS
-- =====================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  template_id uuid not null references public.document_templates(id),
  storage_path text,
  file_name text,
  file_size int,
  mime_type text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz,
  status document_status not null default 'pending_upload',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  cross_validation_status cross_validation_status not null default 'pending',
  rejection_reasons text[],
  reviewer_notes text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_application on public.documents(application_id);
create index idx_documents_status on public.documents(status);
create index idx_documents_template on public.documents(template_id);

create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- =====================================================
-- 10. FORM_SUBMISSIONS
-- =====================================================

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  template_id uuid not null references public.document_templates(id),
  document_id uuid references public.documents(id) on delete set null,
  form_data jsonb not null,
  generated_pdf_path text,
  signed_pdf_path text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_form_submissions_application on public.form_submissions(application_id);

create trigger form_submissions_updated_at
  before update on public.form_submissions
  for each row execute function public.set_updated_at();

-- =====================================================
-- 11. NOTIFICATIONS
-- =====================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  related_application_id uuid references public.applications(id) on delete cascade,
  related_document_id uuid references public.documents(id) on delete cascade,
  is_read boolean not null default false,
  read_at timestamptz,
  email_sent boolean not null default false,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient_unread
  on public.notifications(recipient_id, is_read);
create index idx_notifications_created_at
  on public.notifications(created_at desc);

-- =====================================================
-- 12. AUDIT_LOGS
-- =====================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  changes jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_actor on public.audit_logs(actor_id);
create index idx_audit_created_at on public.audit_logs(created_at desc);
