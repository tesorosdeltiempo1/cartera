-- Migration 013 - Direct EUR estimates for day-to-day position tracking.
--
-- Estimates are stored separately from quote/FX inputs. Existing positions and
-- historical snapshots are not reclassified or recalculated by this migration.
-- Apply manually in Supabase after a current backup; do not run against production
-- until the corresponding application version is ready.

begin;

alter table public.assets
  add column if not exists estimated_value_eur numeric,
  add column if not exists estimated_value_as_of date;

alter table public.assets alter column quantity drop not null;

alter table public.portfolio_snapshot_assets
  add column if not exists confirmed_value numeric,
  add column if not exists estimated_value numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_estimated_value_nonnegative_check'
  ) then
    alter table public.assets
      add constraint assets_estimated_value_nonnegative_check
      check (estimated_value_eur is null or estimated_value_eur >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_estimated_value_date_pair_check'
  ) then
    alter table public.assets
      add constraint assets_estimated_value_date_pair_check
      check (
        (estimated_value_eur is null and estimated_value_as_of is null)
        or (estimated_value_eur is not null and estimated_value_as_of is not null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_quoted_price_requires_quantity_check'
  ) then
    alter table public.assets
      add constraint assets_quoted_price_requires_quantity_check
      check (current_price is null or quantity is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_ledger_requires_quantity_check'
  ) then
    alter table public.assets
      add constraint assets_ledger_requires_quantity_check
      check (ledger_started_at is null or quantity is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portfolio_snapshot_assets'::regclass
      and conname = 'portfolio_snapshot_assets_valuation_split_check'
  ) then
    alter table public.portfolio_snapshot_assets
      add constraint portfolio_snapshot_assets_valuation_split_check
      check (
        (confirmed_value is null or confirmed_value >= 0)
        and (estimated_value is null or estimated_value >= 0)
      );
  end if;
end;
$$;

comment on column public.assets.estimated_value_eur is
  'Direct user-entered whole-position estimate in EUR; separate from confirmed quote and FX inputs.';
comment on column public.assets.estimated_value_as_of is
  'Date the direct EUR estimate was entered or reviewed.';
comment on column public.assets.quantity is
  'Can be NULL for an estimate-only position; quote-based valuations and ledger-managed positions require units.';
comment on column public.portfolio_snapshot_assets.confirmed_value is
  'Confirmed portion of this position-group value in a portfolio snapshot; NULL denotes a legacy snapshot without a recorded quality split.';
comment on column public.portfolio_snapshot_assets.estimated_value is
  'Estimated portion of this position-group value in a portfolio snapshot; NULL denotes a legacy snapshot without a recorded quality split.';

create or replace function public.save_portfolio_snapshot(
  p_total_value numeric,
  p_breakdown jsonb,
  p_cash_breakdown jsonb,
  p_snapshot_assets jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_snapshot_id uuid;
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;
  if p_total_value is null or p_total_value < 0 then raise exception 'El valor del snapshot no puede ser negativo'; end if;
  if pg_catalog.jsonb_typeof(p_breakdown) is distinct from 'object' then raise exception 'El desglose debe ser un objeto JSON'; end if;
  if pg_catalog.jsonb_typeof(p_cash_breakdown) is distinct from 'array' then raise exception 'El desglose de caja debe ser un array JSON'; end if;
  if pg_catalog.jsonb_typeof(p_snapshot_assets) is distinct from 'array' then raise exception 'El detalle por activo debe ser un array JSON'; end if;

  insert into public.portfolio_snapshots (total_value, breakdown, cash_breakdown)
  values (p_total_value, p_breakdown, p_cash_breakdown)
  returning id into v_snapshot_id;

  insert into public.portfolio_snapshot_assets (
    snapshot_id, investment_asset_id, asset_name, category, value, target_weight,
    valuation_detail, confirmed_value, estimated_value
  )
  select
    v_snapshot_id,
    snapshot_asset.investment_asset_id,
    snapshot_asset.asset_name,
    snapshot_asset.category,
    snapshot_asset.value,
    snapshot_asset.target_weight,
    coalesce(snapshot_asset.valuation_detail, '[]'::jsonb),
    snapshot_asset.confirmed_value,
    snapshot_asset.estimated_value
  from pg_catalog.jsonb_to_recordset(p_snapshot_assets) as snapshot_asset(
    investment_asset_id uuid,
    asset_name text,
    category text,
    value numeric,
    target_weight numeric,
    valuation_detail jsonb,
    confirmed_value numeric,
    estimated_value numeric
  );

  return v_snapshot_id;
end;
$function$;

revoke all privileges on function public.save_portfolio_snapshot(numeric, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_portfolio_snapshot(numeric, jsonb, jsonb, jsonb) to authenticated;

commit;

-- Existing snapshots retain NULL quality splits and are not recalculated.
-- Verify the new columns and function signature before deploying the UI.
