-- 20260630120000_documentos_adicionales.sql
-- Propósito: habilitar "Documentos adicionales / sin título" en el expediente.
-- Es ADITIVA: afloja restricciones y agrega columna; no borra ni modifica filas existentes.

begin;

-- 1. Permitir documentos sin plantilla (los extra no pertenecen a ningún requisito)
alter table public.documents alter column template_id drop not null;

-- 2. Título libre para extra; las plantillas tienen su propio nombre.
alter table public.documents add column if not exists title text;

-- 3. Aceptar cualquier tipo MIME en el bucket (validación de tipo sigue en código para docs formales)
update storage.buckets set allowed_mime_types = null where id = 'kyc-documents';

-- 4. GRANTs defensivos (sin DELETE — nada se borra)
grant select, insert, update on public.documents to authenticated, service_role;

commit;

-- Verificación (correr aparte):
--   select column_name, is_nullable, data_type
--   from information_schema.columns
--   where table_name = 'documents' and column_name in ('template_id', 'title');
--
--   select id, allowed_mime_types from storage.buckets where id = 'kyc-documents';
