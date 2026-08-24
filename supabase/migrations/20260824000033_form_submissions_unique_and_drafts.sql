-- Los formularios guardan con upsert onConflict(application_id, template_id),
-- pero ese índice único NUNCA existió: el upsert fallaba en silencio y las
-- respuestas se perdían. Se depura y se crea el índice. Habilita además el
-- autoguardado de borradores (misma fila, submitted_at intacto).

delete from form_submissions fs
using form_submissions fs2
where fs.application_id = fs2.application_id
  and fs.template_id = fs2.template_id
  and fs.updated_at < fs2.updated_at;

delete from form_submissions fs
using form_submissions fs2
where fs.application_id = fs2.application_id
  and fs.template_id = fs2.template_id
  and fs.updated_at = fs2.updated_at
  and fs.id < fs2.id;

create unique index if not exists form_submissions_app_template_key
  on form_submissions (application_id, template_id);
