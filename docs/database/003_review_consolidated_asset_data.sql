-- Revisión de solo lectura antes de consolidar activos.
-- Devuelve un único resultado resumido, sin nombres, brokers, cantidades
-- ni valores por fila. No modifica datos ni estructura.

with summary as (
  select
    'Activos consolidados'::text as seccion,
    'Total · con objetivo · sin ISIN ni ticker'::text as detalle,
    count(*)::text || ' · ' || count(target_weight)::text || ' · ' ||
      count(*) filter (where isin is null and ticker is null)::text as resultado
  from public.investment_assets

  union all

  select
    'Categoría: ' || category,
    'Activos · con objetivo · suma de objetivos (puede ser parcial)',
    count(*)::text || ' · ' || count(target_weight)::text || ' · ' ||
      coalesce(sum(target_weight), 0)::text
  from public.investment_assets
  group by category

  union all

  select
    'Posiciones por broker',
    'Total · vinculadas · sin vincular',
    count(*)::text || ' · ' || count(investment_asset_id)::text || ' · ' ||
      count(*) filter (where investment_asset_id is null)::text
  from public.assets

  union all

  select
    'Clave foránea',
    'Nombre · regla al borrar',
    coalesce(
      string_agg(
        con.conname || ' · ' ||
          case con.confdeltype
            when 'a' then 'NO ACTION'
            when 'r' then 'RESTRICT'
            when 'c' then 'CASCADE'
            when 'n' then 'SET NULL'
            when 'd' then 'SET DEFAULT'
            else con.confdeltype::text
          end,
        '; '
      ),
      'No encontrada'
    )
  from pg_constraint con
  where con.contype = 'f'
    and con.conrelid = 'public.assets'::regclass
    and con.confrelid = 'public.investment_assets'::regclass
)
select seccion, detalle, resultado
from summary
order by seccion;
