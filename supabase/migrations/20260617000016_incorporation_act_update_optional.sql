-- Última actualización del acta es opcional: no todas las empresas tienen modificaciones
UPDATE public.document_templates
SET is_required = false
WHERE code = 'incorporation_act_update';
