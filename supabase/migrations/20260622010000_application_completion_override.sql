alter table public.applications add column if not exists completion_override boolean not null default false;
