-- Los ZIP de expediente (descarga admin y enlace del correo a Transfer) se
-- guardan en generated-pdfs/expedientes-zip/, pero el bucket solo aceptaba
-- PDF y DOCX: la subida fallaba con "mime type application/zip is not
-- supported". Se permite ZIP y se sube el tope a 200 MB (ya hay expedientes
-- de 80+ MB crudos).
update storage.buckets
set allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed'
    ],
    file_size_limit = 209715200
where id = 'generated-pdfs';
