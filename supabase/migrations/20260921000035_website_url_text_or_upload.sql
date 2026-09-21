-- "URL del sitio web o link de pago" era un casillero de solo archivo; el
-- cliente debe poder escribir la URL (www.ejemplo.com) o subir un archivo.
-- Nuevo field_type text_or_upload: el texto vive en documents.file_name
-- sin storage_path (igual que data_check), el archivo como cualquier upload.
alter table document_templates drop constraint if exists document_templates_field_type_check;
alter table document_templates
  add constraint document_templates_field_type_check
  check (field_type in ('upload', 'form', 'check_or_upload', 'data_check', 'text_or_upload'));

update document_templates
set field_type = 'text_or_upload'
where code in ('website_url', 'pf_website_url');
