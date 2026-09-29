-- =====================================================================
-- Migración 001 · Activos consolidados
--
-- Artefacto manual de revisión para el SQL Editor de Supabase.
-- NO se ejecuta durante el build ni forma parte de una migración automática.
-- ESTADO (2026-09-29): esta migración ya fue ejecutada por el propietario
-- con ROLLBACK de prueba y después con COMMIT en el proyecto activo. Este
-- archivo se conserva como referencia; NO volver a ejecutarlo. Para cambios
-- futuros, inspeccionar el estado real y preparar una migración nueva.
-- ARCHIVO HISTÓRICO: conserva el SQL de la instalación inicial para auditoría.
-- No ejecutar este archivo ni cambiar ROLLBACK por COMMIT: la migración ya
-- fue aplicada en el proyecto activo. Los comentarios operativos del cuerpo
-- describen el procedimiento original y no son instrucciones vigentes.
-- Para cambios futuros, inspeccionar el esquema actual y crear otra migración.
-- =====================================================================

begin;

-- Marcador conservado para no versionar el UID real del propietario.
create or replace function public.is_cartera_owner()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() = 'REPLACE_WITH_OWNER_USER_UUID'::uuid
$$;

-- ---------------------------------------------------------------------
-- 0. Trigger propio de esta migración para mantener updated_at
-- ---------------------------------------------------------------------
create or replace function set_investment_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Tabla maestra de activos consolidados
--    Identidad: ISIN si existe; canonical_id explícito para instrumentos
--    sin ISIN (BTC, ETH, oro físico); ticker + mercado como alternativa.
-- ---------------------------------------------------------------------
create table if not exists investment_assets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  ticker        text,
  market        text,
  isin          text,
  canonical_id  text,
  category      text not null,
  target_weight numeric,
  thesis        text,
  last_reviewed date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Por si la tabla ya existía de un intento anterior
alter table investment_assets add column if not exists market text;
alter table investment_assets add column if not exists canonical_id text;

-- Cinco categorías (Activos Duros como categoría propia)
alter table investment_assets drop constraint if exists investment_assets_category_check;
alter table investment_assets add constraint investment_assets_category_check
  check (category in ('Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Activos Duros', 'Especulativo'));

alter table investment_assets drop constraint if exists investment_assets_target_weight_check;
alter table investment_assets add constraint investment_assets_target_weight_check
  check (target_weight is null or (target_weight >= 0 and target_weight <= 100));

-- Los identificadores no pueden ser cadenas vacías: null o un valor real.
-- Así un '' que se cuele desde un formulario falla de forma visible.
alter table investment_assets drop constraint if exists investment_assets_identifiers_not_blank;
alter table investment_assets add constraint investment_assets_identifiers_not_blank
  check (
    (isin         is null or btrim(isin)         <> '') and
    (canonical_id is null or btrim(canonical_id) <> '') and
    (ticker       is null or btrim(ticker)       <> '') and
    (market       is null or btrim(market)       <> '')
  );

-- Unicidad de identidad, solo cuando el dato existe
create unique index if not exists investment_assets_isin_unique
  on investment_assets (isin) where isin is not null;
create unique index if not exists investment_assets_canonical_unique
  on investment_assets (canonical_id) where canonical_id is not null;
create unique index if not exists investment_assets_ticker_market_unique
  on investment_assets (ticker, market) where ticker is not null and market is not null;

drop trigger if exists investment_assets_set_updated_at on investment_assets;
create trigger investment_assets_set_updated_at
  before update on investment_assets
  for each row execute function set_investment_assets_updated_at();

alter table investment_assets enable row level security;
drop policy if exists "Allow all for anon" on investment_assets;

-- ---------------------------------------------------------------------
-- 2. Posiciones: vínculo (nullable) y quinta categoría
--    La FK actual es NO ACTION: impide borrar un activo consolidado mientras
--    tenga posiciones vinculadas. Se conserva si ya existe.
-- ---------------------------------------------------------------------
alter table assets
  add column if not exists investment_asset_id uuid
  references investment_assets (id) on delete restrict;

-- Asegurar la FK también cuando la columna ya existía sin referencia.
do $$
declare
  assets_table oid := to_regclass('public.assets');
  investment_assets_table oid := to_regclass('public.investment_assets');
  position_column smallint;
  master_column smallint;
  matching_fk boolean;
  conflicting_fk boolean;
begin
  select attnum into position_column
  from pg_attribute
  where attrelid = assets_table and attname = 'investment_asset_id' and not attisdropped;

  select attnum into master_column
  from pg_attribute
  where attrelid = investment_assets_table and attname = 'id' and not attisdropped;

  if position_column is null or master_column is null then
    raise exception 'No se encontró assets.investment_asset_id o investment_assets.id';
  end if;

  select exists (
    select 1 from pg_constraint
    where contype = 'f'
      and conrelid = assets_table
      and confrelid = investment_assets_table
      and conkey = array[position_column]::smallint[]
      and confkey = array[master_column]::smallint[]
      and confdeltype in ('a', 'r')
  ) into matching_fk;

  if not matching_fk then
    select exists (
      select 1 from pg_constraint
      where contype = 'f'
        and conrelid = assets_table
        and conkey @> array[position_column]::smallint[]
    ) into conflicting_fk;

    if conflicting_fk then
      raise exception 'investment_asset_id ya participa en otra FK; revisar antes de migrar';
    end if;

    alter table public.assets
      add constraint assets_investment_asset_id_fkey
      foreign key (investment_asset_id)
      references public.investment_assets (id) on delete restrict;
  end if;
end;
$$;

create index if not exists assets_investment_asset_id_idx
  on assets (investment_asset_id);

alter table assets drop constraint if exists assets_category_check;
alter table assets add constraint assets_category_check
  check (category in ('Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Activos Duros', 'Especulativo'));

-- Campos duplicados: siguen existiendo hasta verificar los datos,
-- pero dejan de ser la fuente de verdad. No se borran en esta migración.
comment on column assets.target_weight is
  'DEPRECADO: el objetivo vive en investment_assets.target_weight. No editar desde la UI. Retirar tras verificar.';
comment on column assets.category is
  'TRANSITORIO: la categoría de política vive en investment_assets.category. Retirar tras verificar.';

-- ---------------------------------------------------------------------
-- 3. Detalle de snapshots por activo consolidado (solo hacia delante)
--    Los snapshots antiguos conservan su desglose por categoría en
--    portfolio_snapshots.breakdown y NO se recalculan.
--    Se guardan nombre y categoría tal como eran en ese momento, para
--    que renombrar o recategorizar un activo no altere el pasado.
--    Las posiciones sin vincular se registran con investment_asset_id
--    nulo y un asset_name que lo indique.
-- ---------------------------------------------------------------------
create table if not exists portfolio_snapshot_assets (
  id                  uuid primary key default gen_random_uuid(),
  snapshot_id         uuid not null references portfolio_snapshots (id) on delete cascade,
  investment_asset_id uuid references investment_assets (id) on delete set null,
  asset_name          text not null,
  category            text not null,
  value               numeric not null,
  target_weight       numeric,
  created_at          timestamptz default now()
);

create index if not exists portfolio_snapshot_assets_snapshot_idx
  on portfolio_snapshot_assets (snapshot_id);
create index if not exists portfolio_snapshot_assets_investment_asset_idx
  on portfolio_snapshot_assets (investment_asset_id);

alter table portfolio_snapshot_assets enable row level security;

-- ---------------------------------------------------------------------
-- 4. Cerrar acceso anónimo y limitar tablas a un único usuario autenticado
-- ---------------------------------------------------------------------
alter table public.assets enable row level security;
alter table public.investment_assets enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.portfolio_snapshot_assets enable row level security;

-- Elimina políticas existentes de estas tablas antes de reconstruir el acceso;
-- en PostgreSQL, las políticas permisivas se combinan con OR.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('assets', 'investment_assets', 'portfolio_snapshots', 'portfolio_snapshot_assets')
  loop
    execute format('drop policy %I on %I.%I', existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  end loop;
end;
$$;

revoke all privileges on table public.assets from public, anon, authenticated;
revoke all privileges on table public.investment_assets from public, anon, authenticated;
revoke all privileges on table public.portfolio_snapshots from public, anon, authenticated;
revoke all privileges on table public.portfolio_snapshot_assets from public, anon, authenticated;

grant select, insert, update, delete on table public.assets to authenticated;
grant select, insert, update, delete on table public.investment_assets to authenticated;
grant select, insert, update, delete on table public.portfolio_snapshots to authenticated;
grant select, insert, update, delete on table public.portfolio_snapshot_assets to authenticated;

revoke all privileges on function public.is_cartera_owner() from public, anon, authenticated;
grant execute on function public.is_cartera_owner() to authenticated;

create policy cartera_owner_all on public.assets
  for all to authenticated
  using (public.is_cartera_owner())
  with check (public.is_cartera_owner());
create policy cartera_owner_all on public.investment_assets
  for all to authenticated
  using (public.is_cartera_owner())
  with check (public.is_cartera_owner());
create policy cartera_owner_all on public.portfolio_snapshots
  for all to authenticated
  using (public.is_cartera_owner())
  with check (public.is_cartera_owner());
create policy cartera_owner_all on public.portfolio_snapshot_assets
  for all to authenticated
  using (public.is_cartera_owner())
  with check (public.is_cartera_owner());

rollback;  -- cambiar a `commit;` solo tras aprobar la prueba

-- =====================================================================
-- Comprobaciones tras ejecutar con commit (ejecutar aparte, una a una)
-- =====================================================================

-- a) Posiciones sin vincular (deben quedar visibles en la app)
-- select id, name, category, broker, quantity from assets where investment_asset_id is null;

-- b) Posiciones cuya categoría no coincide con la de su activo consolidado
-- select a.name as posicion, a.category as cat_posicion, i.name as activo, i.category as cat_activo
-- from assets a join investment_assets i on i.id = a.investment_asset_id
-- where a.category <> i.category;

-- c) Suma de objetivos (informativo; no tiene por qué ser 100 mientras cargas datos)
-- select coalesce(sum(target_weight), 0) as suma_objetivos from investment_assets;

-- d) Objetivo por categoría
-- select category, sum(target_weight) as objetivo, count(*) as activos
-- from investment_assets group by category order by category;

-- e) Restricciones aplicadas
-- select conrelid::regclass as tabla, conname from pg_constraint
-- where conname in ('assets_category_check','investment_assets_category_check',
--                   'investment_assets_target_weight_check','investment_assets_identifiers_not_blank');
