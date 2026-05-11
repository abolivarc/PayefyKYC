-- =====================================================
-- PayefyKYC — Storage Buckets and Policies
-- Migration: 0003_storage_buckets
-- =====================================================

-- =====================================================
-- BUCKETS
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'kyc-documents',
    'kyc-documents',
    false,
    20971520,                       -- 20 MB
    array['application/pdf']
  ),
  (
    'generated-pdfs',
    'generated-pdfs',
    false,
    10485760,                       -- 10 MB
    array['application/pdf']
  )
on conflict (id) do nothing;

-- =====================================================
-- STORAGE POLICIES
-- Path convention:
--   kyc-documents/{company_id}/{application_id}/{document_id}/{filename}
--   generated-pdfs/{company_id}/{application_id}/{template_code}.pdf
-- =====================================================

-- KYC-DOCUMENTS: Members of a company can read/upload to their own paths
create policy "kyc_docs_select_member"
  on storage.objects for select
  using (
    bucket_id = 'kyc-documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

create policy "kyc_docs_insert_member"
  on storage.objects for insert
  with check (
    bucket_id = 'kyc-documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

create policy "kyc_docs_update_member"
  on storage.objects for update
  using (
    bucket_id = 'kyc-documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

create policy "kyc_docs_delete_member"
  on storage.objects for delete
  using (
    bucket_id = 'kyc-documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

-- KYC-DOCUMENTS: Sales agents can read/upload for assigned clients
create policy "kyc_docs_select_agent"
  on storage.objects for select
  using (
    bucket_id = 'kyc-documents'
    and public.current_user_role() = 'sales_agent'
    and public.is_assigned_agent((storage.foldername(name))[1]::uuid)
  );

create policy "kyc_docs_insert_agent"
  on storage.objects for insert
  with check (
    bucket_id = 'kyc-documents'
    and public.current_user_role() = 'sales_agent'
    and public.is_assigned_agent((storage.foldername(name))[1]::uuid)
  );

-- KYC-DOCUMENTS: Compliance reads card-related documents
create policy "kyc_docs_select_compliance"
  on storage.objects for select
  using (
    bucket_id = 'kyc-documents'
    and public.current_user_role() = 'compliance'
    and public.company_has_product((storage.foldername(name))[1]::uuid, 'cards')
  );

-- KYC-DOCUMENTS: Onboarding reads terminal-related documents
create policy "kyc_docs_select_onboarding"
  on storage.objects for select
  using (
    bucket_id = 'kyc-documents'
    and public.current_user_role() = 'onboarding'
    and public.company_has_product((storage.foldername(name))[1]::uuid, 'terminals')
  );

-- KYC-DOCUMENTS: Directors/super-admin see all
create policy "kyc_docs_select_director"
  on storage.objects for select
  using (
    bucket_id = 'kyc-documents'
    and public.user_has_role(array['sales_director', 'super_admin']::user_role[])
  );

-- GENERATED-PDFS: Members and staff can read; writes are server-side
create policy "generated_pdfs_select_member"
  on storage.objects for select
  using (
    bucket_id = 'generated-pdfs'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

create policy "generated_pdfs_select_staff"
  on storage.objects for select
  using (
    bucket_id = 'generated-pdfs'
    and public.user_has_role(array[
      'sales_agent', 'sales_director', 'compliance',
      'onboarding', 'super_admin'
    ]::user_role[])
  );
