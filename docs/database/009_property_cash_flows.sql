-- Migracion 009 - Flujos reales de inmuebles y pagos hipotecarios
--
-- Extiende el ledger existente; no crea un segundo libro de caja.
-- rentas y gastos alteran caja, pero no la rentabilidad de inversiones.
-- En mortgage_payment, principal reduce caja y saldo de deuda por igual;
-- el interes restante es gasto de caja y no se suma al P&L bursatil.
-- Ejecutar despues de 008, tras respaldo, y verificar despues con 002.

begin;

alter table public.portfolio_transactions
  add column if not exists property_id uuid references public.real_estate_assets(id) on delete restrict,
  add column if not exists mortgage_id uuid references public.mortgage_liabilities(id) on delete restrict,
  add column if not exists principal_amount numeric not null default 0,
  add column if not exists flow_category text;

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_operation_type_check;
alter table public.portfolio_transactions
  add constraint portfolio_transactions_operation_type_check
  check (operation_type in (
    'opening_position', 'opening_cash', 'buy', 'sell', 'deposit', 'withdrawal',
    'dividend', 'interest', 'fee', 'transfer_in', 'transfer_out', 'fx_update',
    'rental_income', 'property_expense', 'mortgage_payment'
  ));

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_property_flow_shape_check;
alter table public.portfolio_transactions
  add constraint portfolio_transactions_property_flow_shape_check check (
    (
      operation_type = 'rental_income'
      and property_id is not null and mortgage_id is null
      and amount is not null and amount > 0 and principal_amount = 0 and flow_category is null
    )
    or (
      operation_type = 'property_expense'
      and property_id is not null and mortgage_id is null
      and amount is not null and amount > 0 and principal_amount = 0
      and flow_category is not null and flow_category in ('maintenance', 'tax', 'insurance', 'community', 'other')
    )
    or (
      operation_type = 'mortgage_payment'
      and property_id is not null and mortgage_id is not null
      and amount is not null and amount > 0
      and principal_amount is not null and principal_amount >= 0 and principal_amount <= amount
      and flow_category is null
    )
    or (
      operation_type not in ('rental_income', 'property_expense', 'mortgage_payment')
      and property_id is null and mortgage_id is null
      and principal_amount = 0 and flow_category is null
    )
  );

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_principal_nonnegative_check;
alter table public.portfolio_transactions
  add constraint portfolio_transactions_principal_nonnegative_check
  check (principal_amount >= 0);

create index if not exists portfolio_transactions_property_date_idx
  on public.portfolio_transactions (property_id, operation_date desc, created_at desc)
  where property_id is not null;

create or replace function public.record_property_cash_flow(p_flow jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
  v_property_id uuid;
  v_mortgage_id uuid;
  v_property record;
  v_mortgage record;
  v_operation_type text;
  v_operation_date date;
  v_cash_broker text;
  v_currency text;
  v_amount numeric;
  v_principal_amount numeric := 0;
  v_fx_rate numeric;
  v_fx_as_of date;
  v_fx_source text;
  v_flow_category text;
  v_cash_account_id uuid;
  v_cash_amount numeric;
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;
  if p_flow is null or pg_catalog.jsonb_typeof(p_flow) <> 'object' then
    raise exception 'El movimiento debe ser un objeto JSON';
  end if;

  v_property_id := nullif(p_flow->>'property_id', '')::uuid;
  v_mortgage_id := nullif(p_flow->>'mortgage_id', '')::uuid;
  v_operation_type := nullif(p_flow->>'operation_type', '');
  v_operation_date := nullif(p_flow->>'operation_date', '')::date;
  v_cash_broker := nullif(btrim(p_flow->>'cash_broker'), '');
  v_currency := upper(nullif(btrim(p_flow->>'currency'), ''));
  v_amount := nullif(p_flow->>'amount', '')::numeric;
  v_principal_amount := coalesce(nullif(p_flow->>'principal_amount', '')::numeric, 0);
  v_fx_rate := nullif(p_flow->>'fx_rate_to_eur', '')::numeric;
  v_fx_as_of := nullif(p_flow->>'fx_as_of', '')::date;
  v_fx_source := nullif(btrim(p_flow->>'fx_source'), '');
  v_flow_category := nullif(btrim(p_flow->>'flow_category'), '');

  if v_operation_type is null or v_operation_type not in ('rental_income', 'property_expense', 'mortgage_payment') then
    raise exception 'Tipo de movimiento inmobiliario no reconocido';
  end if;
  if v_property_id is null then raise exception 'Selecciona un inmueble'; end if;
  select * into v_property from public.real_estate_assets where id = v_property_id for update;
  if not found then raise exception 'No se encontró el inmueble'; end if;
  if v_operation_date is null then raise exception 'Indica la fecha del movimiento'; end if;
  if v_cash_broker is null then raise exception 'Indica la cuenta o banco donde se produjo el movimiento'; end if;
  if v_amount is null or v_amount <= 0 then raise exception 'El importe debe ser mayor que cero'; end if;

  if v_operation_type = 'property_expense' then
    if v_flow_category is null or v_flow_category not in ('maintenance', 'tax', 'insurance', 'community', 'other') then
      raise exception 'Selecciona una categoría de gasto';
    end if;
  elsif v_flow_category is not null then
    raise exception 'Este tipo de movimiento no admite categoría de gasto';
  end if;

  if v_operation_type = 'mortgage_payment' then
    if v_mortgage_id is null then raise exception 'Selecciona la hipoteca pagada'; end if;
    select * into v_mortgage
    from public.mortgage_liabilities
    where id = v_mortgage_id and property_id = v_property_id
    for update;
    if not found then raise exception 'La hipoteca no corresponde a este inmueble'; end if;
    if v_principal_amount < 0 or v_principal_amount > v_amount then
      raise exception 'El principal debe estar entre cero y el total pagado';
    end if;
    if v_operation_date < v_mortgage.balance_as_of then
      raise exception 'Registra los pagos posteriores a la fecha del saldo hipotecario';
    end if;
  elsif v_mortgage_id is not null or v_principal_amount <> 0 then
    raise exception 'Solo un pago hipotecario puede incluir hipoteca o amortización de principal';
  end if;

  if v_currency is null or v_currency !~ '^[A-Z]{3}$' or v_currency in ('XXX', 'XTS', 'ZZZ') then
    raise exception 'Selecciona un código de moneda válido';
  end if;
  if v_operation_type = 'mortgage_payment' and v_currency <> upper(v_mortgage.currency) then
    raise exception 'La moneda del pago debe coincidir con la de la hipoteca';
  end if;
  if v_currency = 'EUR' then
    v_fx_rate := 1;
    v_fx_as_of := null;
    v_fx_source := null;
  elsif v_fx_rate is null or v_fx_rate <= 0 or v_fx_as_of is null or v_fx_source is null then
    raise exception 'Para moneda extranjera indica cambio a EUR, fecha y fuente';
  end if;

  insert into public.portfolio_cash_accounts (broker, currency, current_fx_rate_to_eur, fx_as_of, fx_source)
  values (v_cash_broker, v_currency, v_fx_rate, v_fx_as_of, v_fx_source)
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
  returning id into v_cash_account_id;

  if v_operation_type = 'rental_income' then
    v_cash_amount := v_amount;
  else
    v_cash_amount := -v_amount;
  end if;

  if v_operation_type = 'mortgage_payment' and v_principal_amount > 0 then
    if v_principal_amount > v_mortgage.current_balance then
      raise exception 'El principal pagado no puede superar el saldo hipotecario';
    end if;
    update public.mortgage_liabilities
    set current_balance = current_balance - v_principal_amount,
        balance_as_of = v_operation_date,
        balance_source = 'Saldo calculado desde pagos registrados en Cartera',
        fx_rate_to_eur = case when currency = 'EUR' then null else v_fx_rate end,
        fx_as_of = case when currency = 'EUR' then null else v_fx_as_of end,
        fx_source = case when currency = 'EUR' then null else v_fx_source end
    where id = v_mortgage_id;
  end if;

  insert into public.portfolio_transactions (
    position_id, cash_account_id, broker, operation_type, operation_date,
    amount, fees, currency, fx_rate_to_eur, fx_as_of, fx_source,
    cash_amount, realized_pnl_native, realized_pnl_eur, notes,
    property_id, mortgage_id, principal_amount, flow_category
  ) values (
    null, v_cash_account_id, v_cash_broker, v_operation_type, v_operation_date,
    v_amount, 0, v_currency, v_fx_rate, v_fx_as_of, v_fx_source,
    v_cash_amount, 0, 0, nullif(btrim(p_flow->>'notes'), ''),
    v_property_id, v_mortgage_id, v_principal_amount, v_flow_category
  ) returning id into v_id;

  return v_id;
end;
$function$;

revoke all privileges on function public.record_property_cash_flow(jsonb) from public, anon, authenticated;
grant execute on function public.record_property_cash_flow(jsonb) to authenticated;

comment on column public.portfolio_transactions.property_id is
  'Property associated with a real-estate cash flow; null for investment and unrelated cash entries.';
comment on column public.portfolio_transactions.mortgage_id is
  'Mortgage associated with a principal/interest payment; null for non-mortgage movements.';
comment on column public.portfolio_transactions.principal_amount is
  'Principal component of a mortgage payment, in transaction currency; excluded from realized investment P&L.';
comment on column public.portfolio_transactions.flow_category is
  'Real-estate expense class: maintenance, tax, insurance, community, or other.';

commit;
