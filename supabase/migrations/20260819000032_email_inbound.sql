-- Fase 2 de la bandeja de correos: capturar ENTRANTES (Resend Receiving).
-- Nota: email_log se creó vía MCP sin migración versionada; esta migración
-- solo AGREGA columnas sobre la tabla existente.

alter table email_log
  add column if not exists direction text not null default 'outbound',
  add column if not exists from_email text,
  add column if not exists message_id text,
  add column if not exists in_reply_to text,
  add column if not exists raw_meta jsonb;

alter table email_log
  add constraint email_log_direction_check
  check (direction in ('outbound','inbound'));

-- Idempotencia: Resend reintenta webhooks; un entrante por Message-ID.
create unique index if not exists email_log_inbound_message_id_key
  on email_log (message_id)
  where direction = 'inbound' and message_id is not null;

-- Lookups por remitente y listado por dirección
create index if not exists email_log_from_email_lower_idx
  on email_log (lower(from_email));
create index if not exists email_log_direction_sent_at_idx
  on email_log (direction, sent_at desc);

-- Matching remitente → empresa (no existían índices lower())
create index if not exists companies_contact_email_lower_idx
  on companies (lower(contact_email));
create index if not exists companies_operator_email_lower_idx
  on companies (lower(operator_email));
