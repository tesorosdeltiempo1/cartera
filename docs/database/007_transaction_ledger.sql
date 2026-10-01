-- Migración 007 · Registro de operaciones, coste base y caja por broker
--
-- Debe ejecutarse una sola vez DESPUÉS de 006. Añade un ledger aditivo:
--   * las posiciones existentes NO se convierten en compras históricas;
--   * cantidad y coste actuales se conservan;
--   * se registran como saldo inicial solo cuando el usuario lo solicita;
--   * el punto de inicio define desde cuándo la app mide rentabilidad realizada.
--
-- Compras/ventas y posición actual se actualizan en una transacción SQL atómica
-- mediante public.record_portfolio_operation(jsonb). Las tablas ledger son
-- append-only desde la API de cliente (SELECT solamente); nunca insertar/editar
-- operaciones directamente desde el navegador.
--
-- La conversión de una operación se registra con el cambio EUR por unidad del
-- día de esa operación. El cambio vigente de caja se almacena por broker/moneda.
-- Los movimientos de caja no son rentabilidad, salvo dividendos, intereses y
-- comisiones. Se permiten saldos de caja negativos (descubiertos documentados).

begin;

alter table public.assets
  add column if not exists cost_basis_eur numeric,
  add column if not exists ledger_started_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assets'::regclass and conname = 'assets_cost_basis_eur_nonnegative_check'
  ) then
    alter table public.assets add constraint assets_cost_basis_eur_nonnegative_check
      check (cost_basis_eur is null or cost_basis_eur >= 0);
  end if;
end;
$$;

create or replace function public.guard_ledger_managed_position_fields()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_setting('aureum.record_portfolio_operation', true) = 'on' then
    return new;
  end if;

  if (old.ledger_started_at is not null or new.ledger_started_at is not null)
     and (
       new.quantity is distinct from old.quantity
       or new.avg_price is distinct from old.avg_price
       or new.cost_basis_eur is distinct from old.cost_basis_eur
       or new.ledger_started_at is distinct from old.ledger_started_at
       or new.currency is distinct from old.currency
       or new.broker is distinct from old.broker
     ) then
    raise exception 'Cantidad, coste base, moneda y broker se gestionan desde el registro de operaciones una vez iniciado';
  end if;
  return new;
end;
$function$;

drop trigger if exists assets_guard_ledger_managed_fields on public.assets;
create trigger assets_guard_ledger_managed_fields
  before update on public.assets
  for each row execute function public.guard_ledger_managed_position_fields();

create table if not exists public.portfolio_cash_accounts (
  id uuid primary key default gen_random_uuid(),
  broker text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  current_fx_rate_to_eur numeric not null,
  fx_as_of date,
  fx_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_cash_accounts_broker_currency_unique unique (broker, currency),
  constraint portfolio_cash_accounts_fx_positive_check check (current_fx_rate_to_eur > 0),
  constraint portfolio_cash_accounts_fx_provenance_check check (
    (currency = 'EUR' and current_fx_rate_to_eur = 1)
    or (currency <> 'EUR' and fx_as_of is not null and nullif(btrim(fx_source), '') is not null)
  ),
  constraint portfolio_cash_accounts_broker_not_blank_check check (btrim(broker) <> '')
);

create table if not exists public.portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  position_id uuid references public.assets(id) on delete restrict,
  cash_account_id uuid not null references public.portfolio_cash_accounts(id) on delete restrict,
  broker text not null,
  operation_type text not null check (operation_type in (
    'opening_position', 'opening_cash', 'buy', 'sell', 'deposit', 'withdrawal',
    'dividend', 'interest', 'fee', 'transfer_in', 'transfer_out', 'fx_update'
  )),
  operation_date date not null,
  quantity numeric,
  unit_price numeric,
  price_as_of date,
  price_source text,
  amount numeric,
  fees numeric not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  fx_rate_to_eur numeric not null,
  fx_as_of date,
  fx_source text,
  cash_amount numeric not null,
  realized_pnl_native numeric not null default 0,
  realized_pnl_eur numeric not null default 0,
  cost_basis_eur_change numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint portfolio_transactions_fx_positive_check check (fx_rate_to_eur > 0),
  constraint portfolio_transactions_fx_provenance_check check (
    (currency = 'EUR' and fx_rate_to_eur = 1)
    or (currency <> 'EUR' and fx_as_of is not null and nullif(btrim(fx_source), '') is not null)
  ),
  constraint portfolio_transactions_fees_nonnegative_check check (fees >= 0),
  constraint portfolio_transactions_quantity_nonnegative_check check (quantity is null or quantity >= 0),
  constraint portfolio_transactions_unit_price_nonnegative_check check (unit_price is null or unit_price >= 0),
  constraint portfolio_transactions_price_provenance_pair_check check (
    (price_as_of is null and price_source is null)
    or (price_as_of is not null and nullif(btrim(price_source), '') is not null)
  ),
  constraint portfolio_transactions_amount_nonnegative_check check (amount is null or amount >= 0),
  constraint portfolio_transactions_operation_shape_check check (
    (operation_type in ('opening_position', 'buy', 'sell') and position_id is not null and quantity is not null and unit_price is not null)
    or (operation_type not in ('opening_position', 'buy', 'sell') and position_id is null)
  )
);

create index if not exists portfolio_transactions_position_date_idx
  on public.portfolio_transactions (position_id, operation_date, created_at);
create index if not exists portfolio_transactions_cash_date_idx
  on public.portfolio_transactions (cash_account_id, operation_date, created_at);

alter table public.portfolio_cash_accounts enable row level security;
alter table public.portfolio_transactions enable row level security;

drop policy if exists cartera_owner_select on public.portfolio_cash_accounts;
create policy cartera_owner_select on public.portfolio_cash_accounts
  for select to authenticated using (public.is_cartera_owner());
drop policy if exists cartera_owner_select on public.portfolio_transactions;
create policy cartera_owner_select on public.portfolio_transactions
  for select to authenticated using (public.is_cartera_owner());

revoke all privileges on table public.portfolio_cash_accounts from public, anon, authenticated;
revoke all privileges on table public.portfolio_transactions from public, anon, authenticated;
grant select on table public.portfolio_cash_accounts to authenticated;
grant select on table public.portfolio_transactions to authenticated;

create or replace function public.record_portfolio_operation(p_operation jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
  v_position_id uuid;
  v_account_id uuid;
  v_asset record;
  v_type text;
  v_broker text;
  v_currency text;
  v_operation_date date;
  v_quantity numeric;
  v_unit_price numeric;
  v_price_as_of date;
  v_price_source text;
  v_amount numeric;
  v_fees numeric;
  v_fx_rate numeric;
  v_fx_as_of date;
  v_fx_source text;
  v_cash_amount numeric := 0;
  v_realized_native numeric := 0;
  v_realized_eur numeric := 0;
  v_basis_change numeric := 0;
  v_old_quantity numeric;
  v_old_avg_price numeric;
  v_old_basis_eur numeric;
  v_new_quantity numeric;
  v_gross numeric;
begin
  if not public.is_cartera_owner() then
    raise exception 'Acceso denegado';
  end if;
  perform set_config('aureum.record_portfolio_operation', 'on', true);
  if p_operation is null or jsonb_typeof(p_operation) <> 'object' then
    raise exception 'La operación debe ser un objeto JSON';
  end if;

  v_type := nullif(p_operation->>'operation_type', '');
  v_operation_date := coalesce(nullif(p_operation->>'operation_date', '')::date, current_date);
  v_fees := coalesce(nullif(p_operation->>'fees', '')::numeric, 0);
  v_amount := nullif(p_operation->>'amount', '')::numeric;
  v_quantity := nullif(p_operation->>'quantity', '')::numeric;
  v_unit_price := nullif(p_operation->>'unit_price', '')::numeric;
  v_price_as_of := nullif(p_operation->>'price_as_of', '')::date;
  v_price_source := nullif(btrim(p_operation->>'price_source'), '');
  v_fx_rate := nullif(p_operation->>'fx_rate_to_eur', '')::numeric;
  v_fx_as_of := nullif(p_operation->>'fx_as_of', '')::date;
  v_fx_source := nullif(btrim(p_operation->>'fx_source'), '');
  v_position_id := nullif(p_operation->>'position_id', '')::uuid;
  v_currency := upper(nullif(btrim(p_operation->>'currency'), ''));

  if v_type not in ('opening_position', 'opening_cash', 'buy', 'sell', 'deposit', 'withdrawal',
                    'dividend', 'interest', 'fee', 'transfer_in', 'transfer_out', 'fx_update') then
    raise exception 'Tipo de operación no reconocido';
  end if;
  if v_fees < 0 then raise exception 'La comisión no puede ser negativa'; end if;

  if v_position_id is not null then
    select * into v_asset from public.assets where id = v_position_id for update;
    if not found then raise exception 'No se encontró la posición'; end if;
    v_broker := coalesce(nullif(btrim(v_asset.broker), ''), 'Broker sin especificar');
    if v_currency is null then v_currency := upper(v_asset.currency); end if;
    if v_currency is distinct from upper(v_asset.currency) then
      raise exception 'La moneda de la operación debe coincidir con la moneda de la posición';
    end if;
  else
    v_broker := nullif(btrim(p_operation->>'broker'), '');
    if v_broker is null then raise exception 'Indica el broker o cuenta de efectivo'; end if;
  end if;

  if v_currency is null or v_currency !~ '^[A-Z]{3}$' or v_currency in ('XXX', 'XTS', 'ZZZ') then
    raise exception 'Selecciona un código de moneda válido';
  end if;
  if v_currency = 'EUR' then
    v_fx_rate := 1;
    v_fx_as_of := null;
    v_fx_source := null;
  elsif v_fx_rate is null or v_fx_rate <= 0 or v_fx_as_of is null or v_fx_source is null then
    raise exception 'Para moneda extranjera indica EUR por unidad, fecha y origen del cambio';
  end if;

  insert into public.portfolio_cash_accounts (broker, currency, current_fx_rate_to_eur, fx_as_of, fx_source)
  values (v_broker, v_currency, v_fx_rate, v_fx_as_of, v_fx_source)
  on conflict (broker, currency) do update
    set current_fx_rate_to_eur = case
          when excluded.fx_as_of is not null
            and (portfolio_cash_accounts.fx_as_of is null or excluded.fx_as_of >= portfolio_cash_accounts.fx_as_of)
          then excluded.current_fx_rate_to_eur
          else portfolio_cash_accounts.current_fx_rate_to_eur
        end,
        fx_as_of = case
          when excluded.fx_as_of is not null
            and (portfolio_cash_accounts.fx_as_of is null or excluded.fx_as_of >= portfolio_cash_accounts.fx_as_of)
          then excluded.fx_as_of
          else portfolio_cash_accounts.fx_as_of
        end,
        fx_source = case
          when excluded.fx_as_of is not null
            and (portfolio_cash_accounts.fx_as_of is null or excluded.fx_as_of >= portfolio_cash_accounts.fx_as_of)
          then excluded.fx_source
          else portfolio_cash_accounts.fx_source
        end,
        updated_at = now()
  returning id into v_account_id;

  if v_type = 'opening_position' then
    if v_asset.ledger_started_at is not null then raise exception 'El seguimiento de esta posición ya está iniciado'; end if;
    v_quantity := v_asset.quantity;
    v_unit_price := coalesce(v_asset.avg_price, 0);
    if v_quantity > 0 and (v_asset.avg_price is null or v_asset.avg_price < 0) then
      raise exception 'Falta un coste medio válido para establecer el saldo inicial';
    end if;
    v_basis_change := v_quantity * v_unit_price * v_fx_rate;
    update public.assets
      set cost_basis_eur = v_basis_change,
          ledger_started_at = now()
      where id = v_position_id;
    v_cash_amount := 0;

  elsif v_type in ('buy', 'sell') then
    if v_asset.ledger_started_at is null then raise exception 'Inicia primero el seguimiento con un saldo inicial'; end if;
    if v_quantity is null or v_quantity <= 0 or v_unit_price is null or v_unit_price <= 0 then
      raise exception 'Cantidad y precio deben ser mayores que cero';
    end if;
    if v_price_as_of is null or v_price_source is null then
      raise exception 'Indica la fecha y el origen del precio de la operación';
    end if;
    if v_asset.currency is null then raise exception 'Primero confirma la moneda de la posición'; end if;
    v_old_quantity := v_asset.quantity;
    v_old_avg_price := coalesce(v_asset.avg_price, 0);
    v_old_basis_eur := coalesce(v_asset.cost_basis_eur, 0);
    v_gross := v_quantity * v_unit_price;

    if v_type = 'buy' then
      v_new_quantity := v_old_quantity + v_quantity;
      v_cash_amount := -(v_gross + v_fees);
      v_basis_change := (v_gross + v_fees) * v_fx_rate;
      update public.assets
        set quantity = v_new_quantity,
            avg_price = case when v_new_quantity = 0 then null else ((v_old_quantity * v_old_avg_price) + v_gross + v_fees) / v_new_quantity end,
            cost_basis_eur = v_old_basis_eur + v_basis_change
        where id = v_position_id;
    else
      if v_quantity > v_old_quantity then raise exception 'No puedes vender más unidades de las registradas'; end if;
      if v_gross < v_fees then raise exception 'La comisión supera el importe bruto de venta'; end if;
      v_new_quantity := v_old_quantity - v_quantity;
      v_basis_change := -v_old_basis_eur * (v_quantity / v_old_quantity);
      v_cash_amount := v_gross - v_fees;
      v_realized_native := (v_quantity * (v_unit_price - v_old_avg_price)) - v_fees;
      v_realized_eur := (v_cash_amount * v_fx_rate) + v_basis_change;
      update public.assets
        set quantity = v_new_quantity,
            avg_price = case when v_new_quantity = 0 then null else v_old_avg_price end,
            cost_basis_eur = greatest(0, v_old_basis_eur + v_basis_change)
        where id = v_position_id;
    end if;

  elsif v_type = 'opening_cash' then
    if v_amount is null or v_amount < 0 then raise exception 'El saldo inicial de efectivo no puede ser negativo'; end if;
    if exists (select 1 from public.portfolio_transactions where cash_account_id = v_account_id) then
      raise exception 'Esta cuenta ya tiene operaciones; usa un ingreso o retirada en lugar de otro saldo inicial';
    end if;
    v_cash_amount := v_amount;

  elsif v_type = 'deposit' or v_type = 'transfer_in' then
    if v_amount is null or v_amount <= 0 then raise exception 'El ingreso debe ser mayor que cero'; end if;
    v_cash_amount := v_amount;

  elsif v_type = 'withdrawal' or v_type = 'transfer_out' then
    if v_amount is null or v_amount <= 0 then raise exception 'La retirada debe ser mayor que cero'; end if;
    v_cash_amount := -v_amount;

  elsif v_type = 'dividend' or v_type = 'interest' then
    if v_amount is null or v_amount <= 0 or v_amount < v_fees then raise exception 'El importe debe cubrir las comisiones'; end if;
    v_cash_amount := v_amount - v_fees;
    v_realized_native := v_cash_amount;
    v_realized_eur := v_cash_amount * v_fx_rate;

  elsif v_type = 'fee' then
    if v_amount is null or v_amount <= 0 then raise exception 'La comisión debe ser mayor que cero'; end if;
    v_cash_amount := -v_amount;
    v_realized_native := -v_amount;
    v_realized_eur := -v_amount * v_fx_rate;

  elsif v_type = 'fx_update' then
    v_cash_amount := 0;
  end if;

  insert into public.portfolio_transactions (
    position_id, cash_account_id, broker, operation_type, operation_date,
    quantity, unit_price, price_as_of, price_source, amount, fees, currency, fx_rate_to_eur, fx_as_of,
    fx_source, cash_amount, realized_pnl_native, realized_pnl_eur,
    cost_basis_eur_change, notes
  ) values (
    v_position_id, v_account_id, v_broker, v_type, v_operation_date,
    v_quantity, v_unit_price, v_price_as_of, v_price_source, v_amount, v_fees, v_currency, v_fx_rate, v_fx_as_of,
    v_fx_source, v_cash_amount, v_realized_native, v_realized_eur,
    v_basis_change, nullif(btrim(p_operation->>'notes'), '')
  ) returning id into v_id;

  perform set_config('aureum.record_portfolio_operation', 'off', true);
  return v_id;
end;
$function$;

revoke all privileges on function public.record_portfolio_operation(jsonb) from public, anon, authenticated;
grant execute on function public.record_portfolio_operation(jsonb) to authenticated;

create or replace function public.get_portfolio_ledger_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;

  select jsonb_build_object(
    'transaction_count', (select count(*) from public.portfolio_transactions),
    'realized_total_eur', coalesce((select sum(realized_pnl_eur) from public.portfolio_transactions), 0),
    'realized_by_position', coalesce((
      select jsonb_agg(jsonb_build_object('position_id', ledger.position_id, 'realized_eur', ledger.realized_eur))
      from (
        select position_id, sum(realized_pnl_eur) as realized_eur
        from public.portfolio_transactions
        where position_id is not null
        group by position_id
      ) as ledger
    ), '[]'::jsonb),
    'cash_accounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', account.id,
        'broker', account.broker,
        'currency', account.currency,
        'current_fx_rate_to_eur', account.current_fx_rate_to_eur,
        'fx_as_of', account.fx_as_of,
        'fx_source', account.fx_source,
        'balance', coalesce(balance.cash_balance, 0),
        'balance_eur', coalesce(balance.cash_balance, 0) * account.current_fx_rate_to_eur
      ) order by account.broker, account.currency)
      from public.portfolio_cash_accounts as account
      left join lateral (
        select sum(tx.cash_amount) as cash_balance
        from public.portfolio_transactions as tx
        where tx.cash_account_id = account.id
      ) as balance on true
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

revoke all privileges on function public.get_portfolio_ledger_summary() from public, anon, authenticated;
grant execute on function public.get_portfolio_ledger_summary() to authenticated;

alter table public.portfolio_snapshots
  add column if not exists cash_breakdown jsonb not null default '[]'::jsonb;

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
    snapshot_id, investment_asset_id, asset_name, category, value, target_weight, valuation_detail
  )
  select
    v_snapshot_id,
    snapshot_asset.investment_asset_id,
    snapshot_asset.asset_name,
    snapshot_asset.category,
    snapshot_asset.value,
    snapshot_asset.target_weight,
    coalesce(snapshot_asset.valuation_detail, '[]'::jsonb)
  from pg_catalog.jsonb_to_recordset(p_snapshot_assets) as snapshot_asset(
    investment_asset_id uuid,
    asset_name text,
    category text,
    value numeric,
    target_weight numeric,
    valuation_detail jsonb
  );

  return v_snapshot_id;
end;
$function$;

revoke all privileges on function public.save_portfolio_snapshot(numeric, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_portfolio_snapshot(numeric, jsonb, jsonb, jsonb) to authenticated;

comment on column public.assets.cost_basis_eur is
  'Remaining EUR cost basis tracked from ledger start; opening baseline uses the explicitly entered EUR conversion at ledger start.';
comment on column public.assets.ledger_started_at is
  'Timestamp when the position was initialized in the transaction ledger; historical transactions before this are not reconstructed.';
comment on table public.portfolio_transactions is
  'Append-only owner transaction ledger; use record_portfolio_operation RPC. Cash amounts are signed in account currency.';
comment on table public.portfolio_cash_accounts is
  'Cash sub-ledger grouped by broker and currency; balance is derived from portfolio_transactions.';
comment on column public.portfolio_snapshots.cash_breakdown is
  'Cash balances by broker/currency and valuation inputs at snapshot creation.';
comment on function public.save_portfolio_snapshot(numeric, jsonb, jsonb, jsonb) is
  'Atomically stores one portfolio snapshot and its per-asset detail for the authenticated owner.';

commit;

-- Verificación: ejecutar 002_inspect_supabase_read_only.sql y confirmar las
-- tablas/columnas nuevas, RLS y grants. La migración crea funciones/policies;
-- no crea saldos iniciales ni modifica cantidades o importes existentes.
