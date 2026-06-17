-- Última actualización del acta: check_or_upload permite al cliente
-- marcar "No aplica" si no ha habido modificaciones, o subir el documento si sí las hay.
UPDATE public.document_templates
SET
  field_type    = 'check_or_upload',
  is_required   = true,
  instructions  = 'Si tu acta constitutiva ha sido modificada, sube la última versión aquí. Si no ha habido modificaciones, marca la casilla "No aplica".'
WHERE code = 'incorporation_act_update';
