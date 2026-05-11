-- =====================================================
-- PayefyKYC — Row Level Security Policies
-- Migration: 0002_rls_policies
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's role
create or replace function public.current_user_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid()
$$ language sql stable security definer;

-- Check if current user has any of given roles
create or replace function public.user_has_role(roles user_role[])
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = any(roles)
    and is_active = true
  )
$$ language sql stable security definer;

-- Check if current user is assigned agent for a company
create or replace function public.is_assigned_agent(target_company_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.companies
    where id = target_company_id
    and assigned_agent_id = auth.uid()
  )
$$ language sql stable security definer;

-- Check if current user belongs to a company (as client/legal rep/etc)
create or replace function public.is_company_member(target_company_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.company_users
    where company_id = target_company_id
    and user_id = auth.uid()
  )
$$ language sql stable security definer;

-- Check if company has an application for given product code
create or replace function public.company_has_product(
  target_company_id uuid,
  product_code text
)
returns boolean as $$
  select exists (
    select 1 from public.applications a
    join public.products p on p.id = a.product_id
    where a.company_id = target_company_id
    and p.code = product_code
  )
$$ language sql stable security definer;

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.profiles            enable row level security;
alter table public.companies           enable row level security;
alter table public.company_users       enable row level security;
alter table public.products            enable row level security;
alter table public.document_templates  enable row level security;
alter table public.applications        enable row level security;
alter table public.documents           enable row level security;
alter table public.form_submissions    enable row level security;
alter table public.notifications       enable row level security;
alter table public.audit_logs          enable row level security;

-- =====================================================
-- PROFILES
-- =====================================================

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_select_staff"
  on public.profiles for select
  using (user_has_role(array[
    'sales_agent', 'sales_director', 'compliance',
    'onboarding', 'accounting', 'super_admin'
  ]::user_role[]));

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  );

create policy "profiles_update_admin"
  on public.profiles for update
  using (user_has_role(array['sales_director', 'super_admin']::user_role[]));

-- =====================================================
-- PRODUCTS  (read-only for everyone authenticated)
-- =====================================================

create policy "products_select_all"
  on public.products for select
  to authenticated
  using (true);

-- =====================================================
-- DOCUMENT_TEMPLATES  (read-only for authenticated)
-- =====================================================

create policy "doc_templates_select_all"
  on public.document_templates for select
  to authenticated
  using (true);

-- =====================================================
-- COMPANIES
-- =====================================================

-- Clients see only their own company
create policy "companies_select_member"
  on public.companies for select
  using (is_company_member(id));

-- Sales agent sees only assigned clients
create policy "companies_select_agent"
  on public.companies for select
  using (
    current_user_role() = 'sales_agent'
    and assigned_agent_id = auth.uid()
  );

-- Compliance sees companies with card applications
create policy "companies_select_compliance"
  on public.companies for select
  using (
    current_user_role() = 'compliance'
    and company_has_product(id, 'cards')
  );

-- Onboarding sees companies with terminal applications
create policy "companies_select_onboarding"
  on public.companies for select
  using (
    current_user_role() = 'onboarding'
    and company_has_product(id, 'terminals')
  );

-- Directors and super-admin see all
create policy "companies_select_director"
  on public.companies for select
  using (user_has_role(array['sales_director', 'super_admin']::user_role[]));

-- Accounting sees companies in activated state (later flow)
create policy "companies_select_accounting"
  on public.companies for select
  using (current_user_role() = 'accounting');

-- INSERT: clients (creating their own), agents, directors
create policy "companies_insert_self"
  on public.companies for insert
  with check (created_by = auth.uid());

-- UPDATE: members can update their own; agents their assigned; directors all
create policy "companies_update_member"
  on public.companies for update
  using (is_company_member(id));

create policy "companies_update_agent"
  on public.companies for update
  using (
    current_user_role() = 'sales_agent'
    and assigned_agent_id = auth.uid()
  );

create policy "companies_update_director"
  on public.companies for update
  using (user_has_role(array['sales_director', 'super_admin']::user_role[]));

-- =====================================================
-- COMPANY_USERS
-- =====================================================

create policy "company_users_select_member"
  on public.company_users for select
  using (user_id = auth.uid() or is_company_member(company_id));

create policy "company_users_select_staff"
  on public.company_users for select
  using (user_has_role(array[
    'sales_agent', 'sales_director', 'compliance',
    'onboarding', 'super_admin'
  ]::user_role[]));

create policy "company_users_insert_self"
  on public.company_users for insert
  with check (user_id = auth.uid() or is_company_member(company_id));

create policy "company_users_insert_staff"
  on public.company_users for insert
  with check (user_has_role(array[
    'sales_agent', 'sales_director', 'super_admin'
  ]::user_role[]));

-- =====================================================
-- APPLICATIONS
-- =====================================================

create policy "applications_select_member"
  on public.applications for select
  using (is_company_member(company_id));

create policy "applications_select_agent"
  on public.applications for select
  using (
    current_user_role() = 'sales_agent'
    and is_assigned_agent(company_id)
  );

create policy "applications_select_compliance"
  on public.applications for select
  using (
    current_user_role() = 'compliance'
    and exists (
      select 1 from public.products p
      where p.id = applications.product_id and p.code = 'cards'
    )
  );

create policy "applications_select_onboarding"
  on public.applications for select
  using (
    current_user_role() = 'onboarding'
    and exists (
      select 1 from public.products p
      where p.id = applications.product_id and p.code = 'terminals'
    )
  );

create policy "applications_select_director"
  on public.applications for select
  using (user_has_role(array['sales_director', 'super_admin']::user_role[]));

create policy "applications_select_accounting"
  on public.applications for select
  using (current_user_role() = 'accounting');

create policy "applications_insert_member"
  on public.applications for insert
  with check (is_company_member(company_id));

create policy "applications_insert_staff"
  on public.applications for insert
  with check (user_has_role(array[
    'sales_agent', 'sales_director', 'super_admin'
  ]::user_role[]));

create policy "applications_update_member_draft"
  on public.applications for update
  using (
    is_company_member(company_id)
    and status in ('draft', 'documents_pending', 'changes_requested')
  );

create policy "applications_update_reviewer_cards"
  on public.applications for update
  using (
    current_user_role() = 'compliance'
    and exists (
      select 1 from public.products p
      where p.id = applications.product_id and p.code = 'cards'
    )
  );

create policy "applications_update_reviewer_terminals"
  on public.applications for update
  using (
    current_user_role() = 'onboarding'
    and exists (
      select 1 from public.products p
      where p.id = applications.product_id and p.code = 'terminals'
    )
  );

create policy "applications_update_director"
  on public.applications for update
  using (user_has_role(array['sales_director', 'super_admin']::user_role[]));

-- =====================================================
-- DOCUMENTS
-- =====================================================

create policy "documents_select_member"
  on public.documents for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = documents.application_id and is_company_member(a.company_id)
    )
  );

create policy "documents_select_agent"
  on public.documents for select
  using (
    current_user_role() = 'sales_agent'
    and exists (
      select 1 from public.applications a
      where a.id = documents.application_id and is_assigned_agent(a.company_id)
    )
  );

create policy "documents_select_reviewer"
  on public.documents for select
  using (
    user_has_role(array['compliance', 'onboarding']::user_role[])
    and exists (
      select 1 from public.applications a
      join public.products p on p.id = a.product_id
      where a.id = documents.application_id
      and (
        (current_user_role() = 'compliance' and p.code = 'cards') or
        (current_user_role() = 'onboarding' and p.code = 'terminals')
      )
    )
  );

create policy "documents_select_director"
  on public.documents for select
  using (user_has_role(array['sales_director', 'super_admin']::user_role[]));

create policy "documents_insert_member"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = documents.application_id and is_company_member(a.company_id)
    )
  );

create policy "documents_insert_agent"
  on public.documents for insert
  with check (
    current_user_role() = 'sales_agent'
    and exists (
      select 1 from public.applications a
      where a.id = documents.application_id and is_assigned_agent(a.company_id)
    )
  );

create policy "documents_update_member_pending"
  on public.documents for update
  using (
    exists (
      select 1 from public.applications a
      where a.id = documents.application_id and is_company_member(a.company_id)
    )
    and status in ('pending_upload', 'changes_requested')
  );

create policy "documents_update_reviewer"
  on public.documents for update
  using (
    user_has_role(array['compliance', 'onboarding']::user_role[])
    and exists (
      select 1 from public.applications a
      join public.products p on p.id = a.product_id
      where a.id = documents.application_id
      and (
        (current_user_role() = 'compliance' and p.code = 'cards') or
        (current_user_role() = 'onboarding' and p.code = 'terminals')
      )
    )
  );

create policy "documents_update_director"
  on public.documents for update
  using (user_has_role(array['sales_director', 'super_admin']::user_role[]));

-- =====================================================
-- FORM_SUBMISSIONS
-- =====================================================

create policy "form_submissions_select_member"
  on public.form_submissions for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = form_submissions.application_id and is_company_member(a.company_id)
    )
  );

create policy "form_submissions_select_staff"
  on public.form_submissions for select
  using (user_has_role(array[
    'sales_agent', 'sales_director', 'compliance',
    'onboarding', 'super_admin'
  ]::user_role[]));

create policy "form_submissions_insert_member"
  on public.form_submissions for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = form_submissions.application_id and is_company_member(a.company_id)
    )
  );

create policy "form_submissions_update_member"
  on public.form_submissions for update
  using (
    exists (
      select 1 from public.applications a
      where a.id = form_submissions.application_id and is_company_member(a.company_id)
    )
  );

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- INSERT is done from server-side with service_role (bypasses RLS)

-- =====================================================
-- AUDIT_LOGS
-- =====================================================

create policy "audit_select_director"
  on public.audit_logs for select
  using (user_has_role(array['sales_director', 'super_admin']::user_role[]));

create policy "audit_select_agent_own"
  on public.audit_logs for select
  using (
    current_user_role() = 'sales_agent'
    and entity_type in ('company', 'application', 'document')
    and exists (
      select 1 from public.companies c
      where (
        (audit_logs.entity_type = 'company' and c.id = audit_logs.entity_id) or
        (audit_logs.entity_type = 'application' and c.id = (
          select company_id from public.applications where id = audit_logs.entity_id
        )) or
        (audit_logs.entity_type = 'document' and c.id = (
          select a.company_id from public.applications a
          join public.documents d on d.application_id = a.id
          where d.id = audit_logs.entity_id
        ))
      )
      and c.assigned_agent_id = auth.uid()
    )
  );

create policy "audit_select_reviewer"
  on public.audit_logs for select
  using (user_has_role(array['compliance', 'onboarding']::user_role[]));

-- Audit logs are inserted from server side via service_role (bypasses RLS)
