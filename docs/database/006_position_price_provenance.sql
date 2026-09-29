-- Migración 006 · Divisa y procedencia de precios por posición
--
-- Aditiva: solo añade columnas opcionales y restricciones compatibles con las
-- filas existentes. No asigna monedas, no convierte precios, no altera snapshots
-- y no cambia las políticas RLS/grants ya aplicadas.
--
-- EJECUTAR una sola vez en Supabase SQL Editor, tras descargar un respaldo.
-- No copiar aquí UID, claves ni datos patrimoniales. Las filas existentes quedan
-- con currency/precio/FX pendientes; deben revisarse manualmente en la app.

begin;

alter table public.assets
  add column if not exists currency text,
  add column if not exists price_as_of date,
  add column if not exists price_source text,
  add column if not exists fx_rate_to_eur numeric,
  add column if not exists fx_as_of date,
  add column if not exists fx_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_currency_iso4217_check'
  ) then
    alter table public.assets
      add constraint assets_currency_iso4217_check
      check (currency is null or currency ~ '^[A-Z]{3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_fx_rate_positive_check'
  ) then
    alter table public.assets
      add constraint assets_fx_rate_positive_check
      check (fx_rate_to_eur is null or fx_rate_to_eur > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_price_provenance_pair_check'
  ) then
    alter table public.assets
      add constraint assets_price_provenance_pair_check
      check (
        (price_as_of is null and price_source is null)
        or (price_as_of is not null and nullif(btrim(price_source), '') is not null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_fx_provenance_pair_check'
  ) then
    alter table public.assets
      add constraint assets_fx_provenance_pair_check
      check (
        (fx_rate_to_eur is null and fx_as_of is null and fx_source is null)
        or (
          fx_rate_to_eur is not null
          and fx_as_of is not null
          and nullif(btrim(fx_source), '') is not null
        )
      );
  end if;
end;
$$;

-- Cada posición consolidada conserva las entradas que formaron su valor EUR.
-- Las filas históricas existentes reciben [] y no se reescriben.
alter table public.portfolio_snapshot_assets
  add column if not exists valuation_detail jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portfolio_snapshot_assets'::regclass
      and conname = 'portfolio_snapshot_assets_valuation_detail_array_check'
  ) then
    alter table public.portfolio_snapshot_assets
      add constraint portfolio_snapshot_assets_valuation_detail_array_check
      check (jsonb_typeof(valuation_detail) = 'array');
  end if;
end;
$$;

comment on column public.assets.currency is
  'ISO 4217 currency of avg_price/current_price; null means unreviewed, never assumed EUR.';
comment on column public.assets.price_as_of is
  'Date the manually entered current_price refers to.';
comment on column public.assets.price_source is
  'Human-readable origin of current_price (for example broker statement or manual quote).';
comment on column public.assets.fx_rate_to_eur is
  'EUR per one unit of currency, manually reviewed for the quoted price date.';
comment on column public.assets.fx_as_of is
  'Date of the applied conversion rate.';
comment on column public.assets.fx_source is
  'Human-readable origin of the applied conversion rate.';
comment on column public.portfolio_snapshot_assets.valuation_detail is
  'Position-level quote and FX inputs used for this consolidated EUR snapshot; historical rows remain empty arrays.';

commit;

-- Comprobación posterior, ejecutar aparte con 002_inspect_supabase_read_only.sql.
-- Tras aplicar, las seis columnas aparecen en assets; valores existentes quedan NULL.
-- portfolio_snapshot_assets.valuation_detail aparece como [] en datos antiguos.
