-- Migracion 010 - Traspasos atomicos y correcciones auditables del ledger
-- Requiere 009_property_cash_flows.sql.
-- No borra ni modifica movimientos existentes. Aplicar con respaldo previo.

begin;

alter table public.portfolio_transactions
  add column if not exists transfer_group_id uuid,
  add column if not exists reversal_of_transaction_id uuid references public.portfolio_transactions(id) on delete restrict;

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_operation_type_check;
alter table public.portfolio_transactions
  add constraint portfolio_transactions_operation_type_check
  check (operation_type in (
    'opening_position', 'opening_cash', 'buy', 'sell', 'deposit', 'withdrawal',
    'dividend', 'interest', 'fee', 'transfer_in', 'transfer_out', 'fx_update',
    'rental_income', 'property_expense', 'mortgage_payment', 'reversal'
  ));

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_reversal_shape_check;
alter table public.portfolio_transactions
  add constraint portfolio_transactions_reversal_shape_check check (
    (operation_type = 'reversal' and reversal_of_transaction_id is not null)
    or (operation_type <> 'reversal' and reversal_of_transaction_id is null)
  );

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_transfer_group_shape_check;
alter table public.portfolio_transactions
  add constraint portfolio_transactions_transfer_group_shape_check check (
    (operation_type in ('transfer_in', 'transfer_out') and transfer_group_id is not null)
    or (operation_type not in ('transfer_in', 'transfer_out') and transfer_group_id is null)
    or (operation_type = 'reversal' and transfer_group_id is not null)
  );

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
      operation_type = 'reversal'
      and reversal_of_transaction_id is not null
    )
    or (
      operation_type not in ('rental_income', 'property_expense', 'mortgage_payment', 'reversal')
      and property_id is null and mortgage_id is null
      and principal_amount = 0 and flow_category is null
    )
  );

create unique index if not exists portfolio_transactions_transfer_group_operation_unique
  on public.portfolio_transactions (transfer_group_id, operation_type)
  where operation_type in ('transfer_in', 'transfer_out');
create unique index if not exists portfolio_transactions_one_reversal_idx
  on public.portfolio_transactions (reversal_of_transaction_id)
  where reversal_of_transaction_id is not null;
create index if not exists portfolio_transactions_transfer_group_idx
  on public.portfolio_transactions (transfer_group_id)
  where transfer_group_id is not null;

create or replace function public.guard_atomic_cash_transfer()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.operation_type in ('transfer_in', 'transfer_out') and new.transfer_group_id is null then
    raise exception 'Registra los traspasos desde la acción Traspaso entre cuentas para guardar ambas partes juntas';
  end if;
  return new;
end;
$function$;

drop trigger if exists portfolio_transactions_guard_atomic_transfer on public.portfolio_transactions;
create trigger portfolio_transactions_guard_atomic_transfer
  before insert on public.portfolio_transactions
  for each row execute function public.guard_atomic_cash_transfer();

create or replace function public.record_cash_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_operation_date date,
  p_fx_rate_to_eur numeric,
  p_fx_as_of date,
  p_fx_source text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_group_id uuid := gen_random_uuid();
  v_from public.portfolio_cash_accounts%rowtype;
  v_to public.portfolio_cash_accounts%rowtype;
  v_rate numeric;
  v_fx_date date;
  v_fx_source text;
  v_source_balance numeric;
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;
  if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then
    raise exception 'Selecciona dos cuentas distintas';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El importe debe ser mayor que cero'; end if;
  if p_operation_date is null then raise exception 'Indica la fecha del traspaso'; end if;

  perform 1
  from public.portfolio_cash_accounts
  where id in (p_from_account_id, p_to_account_id)
  order by id
  for update;
  if (select count(*) from public.portfolio_cash_accounts where id in (p_from_account_id, p_to_account_id)) <> 2 then
    raise exception 'No se encontraron las dos cuentas';
  end if;

  select * into v_from from public.portfolio_cash_accounts where id = p_from_account_id;
  select * into v_to from public.portfolio_cash_accounts where id = p_to_account_id;
  if v_from.currency <> v_to.currency then
    raise exception 'Los traspasos deben ser entre cuentas de la misma moneda; registra un cambio de divisa aparte';
  end if;
  select coalesce(sum(cash_amount), 0)
  into v_source_balance
  from public.portfolio_transactions
  where cash_account_id = p_from_account_id;
  if p_amount > v_source_balance then
    raise exception 'El traspaso supera el saldo de caja disponible';
  end if;

  if v_from.currency = 'EUR' then
    v_rate := 1;
    v_fx_date := null;
    v_fx_source := null;
  else
    if p_fx_rate_to_eur is null or p_fx_rate_to_eur <= 0 or p_fx_as_of is null or nullif(btrim(p_fx_source), '') is null then
      raise exception 'Para cuentas en moneda extranjera indica un cambio EUR, fecha y fuente';
    end if;
    v_rate := p_fx_rate_to_eur;
    v_fx_date := p_fx_as_of;
    v_fx_source := btrim(p_fx_source);
    update public.portfolio_cash_accounts
    set current_fx_rate_to_eur = v_rate,
        fx_as_of = v_fx_date,
        fx_source = v_fx_source,
        updated_at = now()
    where id in (p_from_account_id, p_to_account_id)
      and (fx_as_of is null or fx_as_of <= v_fx_date);
  end if;

  insert into public.portfolio_transactions (
    cash_account_id, broker, operation_type, operation_date, amount, currency,
    fx_rate_to_eur, fx_as_of, fx_source, cash_amount, notes, transfer_group_id
  ) values (
    p_from_account_id, v_from.broker, 'transfer_out', p_operation_date, p_amount, v_from.currency,
    v_rate, v_fx_date, v_fx_source, -p_amount, nullif(btrim(p_notes), ''), v_group_id
  );

  insert into public.portfolio_transactions (
    cash_account_id, broker, operation_type, operation_date, amount, currency,
    fx_rate_to_eur, fx_as_of, fx_source, cash_amount, notes, transfer_group_id
  ) values (
    p_to_account_id, v_to.broker, 'transfer_in', p_operation_date, p_amount, v_to.currency,
    v_rate, v_fx_date, v_fx_source, p_amount, nullif(btrim(p_notes), ''), v_group_id
  );

  return v_group_id;
end;
$function$;

revoke all privileges on function public.record_cash_transfer(uuid, uuid, numeric, date, numeric, date, text, text) from public, anon, authenticated;
grant execute on function public.record_cash_transfer(uuid, uuid, numeric, date, numeric, date, text, text) to authenticated;

create or replace function public.reverse_portfolio_transaction(p_transaction_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_original public.portfolio_transactions%rowtype;
  v_leg public.portfolio_transactions%rowtype;
  v_mortgage public.mortgage_liabilities%rowtype;
  v_reversal_id uuid;
  v_reversal_group uuid;
  v_reversal_date date := current_date;
  v_group_count integer;
  v_out_count integer;
  v_in_count integer;
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'Escribe el motivo de la corrección'; end if;

  select * into v_original
  from public.portfolio_transactions
  where id = p_transaction_id
  for update;
  if not found then raise exception 'No se encontró el movimiento'; end if;
  if exists (
    select 1 from public.portfolio_transactions
    where reversal_of_transaction_id = p_transaction_id
  ) then raise exception 'Este movimiento ya tiene una reversión'; end if;

  if v_original.operation_type in ('buy', 'sell', 'opening_position', 'opening_cash', 'fx_update', 'reversal') then
    raise exception 'Este tipo de movimiento no se puede revertir desde aquí';
  end if;
  if v_original.operation_type not in (
    'deposit', 'withdrawal', 'dividend', 'interest', 'fee', 'transfer_in', 'transfer_out',
    'rental_income', 'property_expense', 'mortgage_payment'
  ) then raise exception 'Este tipo de movimiento no se puede revertir'; end if;

  if v_original.operation_type in ('transfer_in', 'transfer_out') then
    if v_original.transfer_group_id is null then
      raise exception 'Este traspaso antiguo no tiene pareja; no puede revertirse automáticamente';
    end if;
    select count(*), count(*) filter (where operation_type = 'transfer_out'), count(*) filter (where operation_type = 'transfer_in')
    into v_group_count, v_out_count, v_in_count
    from public.portfolio_transactions
    where transfer_group_id = v_original.transfer_group_id
      and operation_type in ('transfer_in', 'transfer_out');
    if v_group_count <> 2 or v_out_count <> 1 or v_in_count <> 1 then
      raise exception 'El traspaso no tiene exactamente dos partes; solicita revisión manual';
    end if;

    v_reversal_group := gen_random_uuid();
    for v_leg in
      select * from public.portfolio_transactions
      where transfer_group_id = v_original.transfer_group_id
        and operation_type in ('transfer_in', 'transfer_out')
      order by id
      for update
    loop
      if exists (select 1 from public.portfolio_transactions where reversal_of_transaction_id = v_leg.id) then
        raise exception 'Una parte de este traspaso ya está revertida';
      end if;
      insert into public.portfolio_transactions (
        cash_account_id, broker, operation_type, operation_date, amount, fees, currency,
        fx_rate_to_eur, fx_as_of, fx_source, cash_amount, realized_pnl_native,
        realized_pnl_eur, cost_basis_eur_change, notes, transfer_group_id,
        reversal_of_transaction_id
      ) values (
        v_leg.cash_account_id, v_leg.broker, 'reversal', v_reversal_date, v_leg.amount,
        v_leg.fees, v_leg.currency, v_leg.fx_rate_to_eur, v_leg.fx_as_of, v_leg.fx_source,
        -v_leg.cash_amount, -v_leg.realized_pnl_native, -v_leg.realized_pnl_eur,
        0, 'Reversión de traspaso: ' || btrim(p_reason), v_reversal_group, v_leg.id
      ) returning id into v_reversal_id;
    end loop;
    return v_reversal_id;
  end if;

  if v_original.operation_type = 'mortgage_payment' and v_original.principal_amount > 0 then
    select * into v_mortgage
    from public.mortgage_liabilities
    where id = v_original.mortgage_id
    for update;
    if not found then raise exception 'No se encontró la hipoteca asociada'; end if;
    if v_mortgage.balance_as_of <> v_original.operation_date or exists (
      select 1 from public.portfolio_transactions as later
      where later.mortgage_id = v_original.mortgage_id
        and later.operation_type = 'mortgage_payment'
        and (later.operation_date > v_original.operation_date
          or (later.operation_date = v_original.operation_date and later.created_at > v_original.created_at))
    ) then
      raise exception 'Revierte primero los pagos hipotecarios posteriores o actualiza el saldo desde el banco';
    end if;
    update public.mortgage_liabilities
    set current_balance = current_balance + v_original.principal_amount,
        balance_as_of = v_reversal_date,
        balance_source = 'Reversión auditada de un pago registrado en Cartera',
        fx_rate_to_eur = case when currency = 'EUR' then null else v_original.fx_rate_to_eur end,
        fx_as_of = case when currency = 'EUR' then null else v_original.fx_as_of end,
        fx_source = case when currency = 'EUR' then null else v_original.fx_source end
    where id = v_original.mortgage_id;
  end if;

  insert into public.portfolio_transactions (
    cash_account_id, broker, operation_type, operation_date, quantity, unit_price,
    amount, fees, currency, fx_rate_to_eur, fx_as_of, fx_source, cash_amount,
    realized_pnl_native, realized_pnl_eur, notes, property_id, mortgage_id,
    principal_amount, flow_category, reversal_of_transaction_id
  ) values (
    v_original.cash_account_id, v_original.broker, 'reversal', v_reversal_date,
    null, null, v_original.amount, v_original.fees, v_original.currency,
    v_original.fx_rate_to_eur, v_original.fx_as_of, v_original.fx_source,
    -v_original.cash_amount, -v_original.realized_pnl_native, -v_original.realized_pnl_eur,
    'Reversión de ' || v_original.operation_type || ': ' || btrim(p_reason),
    v_original.property_id, v_original.mortgage_id, 0, v_original.flow_category,
    v_original.id
  ) returning id into v_reversal_id;

  return v_reversal_id;
end;
$function$;

revoke all privileges on function public.reverse_portfolio_transaction(uuid, text) from public, anon, authenticated;
grant execute on function public.reverse_portfolio_transaction(uuid, text) to authenticated;

commit;
