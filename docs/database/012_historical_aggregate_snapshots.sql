-- Migration 012 - Historical snapshots from broker-level source documents
-- Additive only: does not modify positions, current valuations, or existing snapshots.

begin;

alter table public.portfolio_snapshots
  add column if not exists source_note text;

create or replace function public.save_historical_portfolio_snapshot(
  p_snapshot_date date,
  p_total_value numeric,
  p_breakdown jsonb,
  p_source_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_snapshot_id uuid;
  v_breakdown_total numeric;
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;
  if p_snapshot_date is null or p_snapshot_date > current_date then
    raise exception 'La fecha del snapshot debe ser válida y no futura';
  end if;
  if p_total_value is null or p_total_value <= 0 then
    raise exception 'El valor del snapshot debe ser mayor que cero';
  end if;
  if pg_catalog.jsonb_typeof(p_breakdown) is distinct from 'object'
    or p_breakdown = '{}'::jsonb then
    raise exception 'El desglose por broker debe ser un objeto JSON no vacío';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_each(p_breakdown) as item(broker, value)
    where pg_catalog.btrim(item.broker) = ''
  ) then
    raise exception 'Cada importe debe tener un nombre de broker';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_each(p_breakdown) as item(broker, value)
    where pg_catalog.jsonb_typeof(item.value) is distinct from 'number'
  ) then
    raise exception 'Todos los importes del desglose deben ser números';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_each(p_breakdown) as item(broker, value)
    where (item.value #>> '{}')::numeric < 0
  ) then
    raise exception 'Los importes del desglose no pueden ser negativos';
  end if;
  if nullif(pg_catalog.btrim(p_source_note), '') is null or pg_catalog.length(p_source_note) > 500 then
    raise exception 'Indica una fuente válida de hasta 500 caracteres';
  end if;

  select pg_catalog.sum((item.value #>> '{}')::numeric)
  into v_breakdown_total
  from pg_catalog.jsonb_each(p_breakdown) as item(broker, value);

  if pg_catalog.round(v_breakdown_total, 2) <> pg_catalog.round(p_total_value, 2) then
    raise exception 'El total debe coincidir con la suma del desglose por broker';
  end if;

  insert into public.portfolio_snapshots (snapshot_date, total_value, breakdown, source_note)
  values (p_snapshot_date, p_total_value, p_breakdown, pg_catalog.btrim(p_source_note))
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$function$;

revoke all privileges on function public.save_historical_portfolio_snapshot(date, numeric, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_historical_portfolio_snapshot(date, numeric, jsonb, text) to authenticated;

comment on column public.portfolio_snapshots.source_note is
  'Optional source/provenance note for a snapshot; aggregate historical entries explain their limitations here.';
comment on function public.save_historical_portfolio_snapshot(date, numeric, jsonb, text) is
  'Owner-checked insert for dated broker-level snapshots; does not create or alter position records.';

commit;

-- Verification: run 002_inspect_supabase_read_only.sql and confirm the new
-- column and owner-only RPC before using the historical import form.
