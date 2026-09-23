-- Dos tarifarios de pisos comerciales.
--
-- El agente comercial cobra comisión, así que su piso tiene que traer ese
-- margen dentro: si cotizara con los pisos internos, la venta saldría sin
-- margen para Payefy. Cada usuario del panel queda marcado como interno
-- (equipo Payefy) o externo (agente), y el generador de propuestas le sirve
-- la columna de pisos que le corresponde.
alter table public.profiles
  add column if not exists agent_type text
    check (agent_type in ('interno', 'externo'));

comment on column public.profiles.agent_type is
  'Tarifario de pisos comerciales: interno = equipo Payefy, externo = agente con comisión.';

-- Reparto inicial: el equipo Payefy y los agentes con correo de la casa se
-- quedan en el tarifario interno; los agentes de fuera pasan al de agente.
update public.profiles
   set agent_type = case
     when role = 'sales_agent' and email not ilike '%@payefy.me' then 'externo'
     else 'interno'
   end
 where role <> 'client'
   and agent_type is null;
