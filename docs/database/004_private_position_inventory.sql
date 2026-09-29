-- Inventario privado para preparar el mapeo manual posición → activo.
-- Solo lectura: no modifica datos ni estructura.
-- IMPORTANTE: el resultado contiene información financiera identificable.
-- Revísalo dentro de tu sesión de Supabase; no lo compartas sin borrar nombres,
-- tickers, brokers e identificadores que prefieras mantener privados.

select
  id as position_id,
  name as position_name,
  ticker,
  category as current_category,
  broker,
  target_weight as legacy_position_target_weight,
  investment_asset_id
from public.assets
order by coalesce(nullif(btrim(ticker), ''), name), name, broker;
