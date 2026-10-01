-- Migracion 008 - Inmuebles, hipotecas y snapshots de patrimonio neto
--
-- Aditiva y separada del modelo de posiciones por broker. No modifica datos
-- financieros existentes ni crea valoraciones o deudas automaticamente.
-- Ejecutar despues de proteger un respaldo y revisar en un entorno aislado.

begin;

create table if not exists public.real_estate_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  property_type text not null check (property_type in ('home', 'rental', 'land', 'other')),
  ownership_percentage numeric not null default 100,
  mortgage_status text not null default 'unreviewed' check (mortgage_status in ('unreviewed', 'none', 'registered')),
  current_value numeric not null,
  currency text not null,
  valuation_as_of date not null,
  valuation_source text not null,
  fx_rate_to_eur numeric,
  fx_as_of date,
  fx_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint real_estate_assets_name_not_blank_check check (btrim(name) <> ''),
  constraint real_estate_assets_ownership_percentage_check check (ownership_percentage > 0 and ownership_percentage <= 100),
  constraint real_estate_assets_current_value_nonnegative_check check (current_value >= 0),
  constraint real_estate_assets_currency_iso4217_check check (currency ~ '^[A-Z]{3}$' and currency not in ('XXX', 'XTS', 'ZZZ')),
  constraint real_estate_assets_valuation_source_not_blank_check check (btrim(valuation_source) <> ''),
  constraint real_estate_assets_fx_provenance_check check (
    (currency = 'EUR' and fx_rate_to_eur is null and fx_as_of is null and fx_source is null)
    or (currency <> 'EUR' and fx_rate_to_eur is not null and fx_rate_to_eur > 0 and fx_as_of is not null and nullif(btrim(fx_source), '') is not null)
  )
);

create table if not exists public.mortgage_liabilities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.real_estate_assets(id) on delete restrict,
  name text not null,
  ownership_percentage numeric not null default 100,
  current_balance numeric not null,
  currency text not null,
  balance_as_of date not null,
  balance_source text not null,
  fx_rate_to_eur numeric,
  fx_as_of date,
  fx_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mortgage_liabilities_name_not_blank_check check (btrim(name) <> ''),
  constraint mortgage_liabilities_ownership_percentage_check check (ownership_percentage > 0 and ownership_percentage <= 100),
  constraint mortgage_liabilities_current_balance_nonnegative_check check (current_balance >= 0),
  constraint mortgage_liabilities_currency_iso4217_check check (currency ~ '^[A-Z]{3}$' and currency not in ('XXX', 'XTS', 'ZZZ')),
  constraint mortgage_liabilities_balance_source_not_blank_check check (btrim(balance_source) <> ''),
  constraint mortgage_liabilities_fx_provenance_check check (
    (currency = 'EUR' and fx_rate_to_eur is null and fx_as_of is null and fx_source is null)
    or (currency <> 'EUR' and fx_rate_to_eur is not null and fx_rate_to_eur > 0 and fx_as_of is not null and nullif(btrim(fx_source), '') is not null)
  )
);

create index if not exists mortgage_liabilities_property_id_idx
  on public.mortgage_liabilities (property_id);

create or replace function public.set_wealth_asset_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists real_estate_assets_set_updated_at on public.real_estate_assets;
create trigger real_estate_assets_set_updated_at
  before update on public.real_estate_assets
  for each row execute function public.set_wealth_asset_updated_at();

drop trigger if exists mortgage_liabilities_set_updated_at on public.mortgage_liabilities;
create trigger mortgage_liabilities_set_updated_at
  before update on public.mortgage_liabilities
  for each row execute function public.set_wealth_asset_updated_at();

create or replace function public.guard_real_estate_mortgage_status()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.mortgage_status = 'none' and exists (
    select 1 from public.mortgage_liabilities where property_id = new.id
  ) then
    raise exception 'No se puede marcar sin hipoteca mientras haya una deuda registrada';
  end if;
  if new.mortgage_status = 'registered' and not exists (
    select 1 from public.mortgage_liabilities where property_id = new.id
  ) then
    raise exception 'Registra la hipoteca antes de marcar el inmueble con deuda';
  end if;
  if new.mortgage_status = 'unreviewed' and exists (
    select 1 from public.mortgage_liabilities where property_id = new.id
  ) then
    raise exception 'Revisa el estado de la hipoteca registrada';
  end if;
  return new;
end;
$function$;

drop trigger if exists real_estate_assets_guard_mortgage_status on public.real_estate_assets;
create trigger real_estate_assets_guard_mortgage_status
  before insert or update on public.real_estate_assets
  for each row execute function public.guard_real_estate_mortgage_status();

create table if not exists public.wealth_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  financial_assets_eur numeric not null,
  cash_eur numeric not null,
  real_estate_eur numeric not null,
  mortgage_debt_eur numeric not null,
  net_worth_eur numeric not null,
  property_detail jsonb not null default '[]'::jsonb,
  mortgage_detail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint wealth_snapshots_property_detail_array_check check (jsonb_typeof(property_detail) = 'array'),
  constraint wealth_snapshots_mortgage_detail_array_check check (jsonb_typeof(mortgage_detail) = 'array')
);

alter table public.real_estate_assets enable row level security;
alter table public.mortgage_liabilities enable row level security;
alter table public.wealth_snapshots enable row level security;

drop policy if exists cartera_owner_all on public.real_estate_assets;
create policy cartera_owner_all on public.real_estate_assets
  for all to authenticated
  using (public.is_cartera_owner())
  with check (public.is_cartera_owner());

drop policy if exists cartera_owner_select on public.mortgage_liabilities;
create policy cartera_owner_select on public.mortgage_liabilities
  for select to authenticated using (public.is_cartera_owner());

drop policy if exists cartera_owner_select on public.wealth_snapshots;
create policy cartera_owner_select on public.wealth_snapshots
  for select to authenticated using (public.is_cartera_owner());

revoke all privileges on table public.real_estate_assets from public, anon, authenticated;
revoke all privileges on table public.mortgage_liabilities from public, anon, authenticated;
revoke all privileges on table public.wealth_snapshots from public, anon, authenticated;
grant select, insert, update, delete on table public.real_estate_assets to authenticated;
grant select on table public.mortgage_liabilities to authenticated;
grant select on table public.wealth_snapshots to authenticated;

create or replace function public.save_mortgage_liability(
  p_mortgage_id uuid,
  p_property_id uuid,
  p_name text,
  p_ownership_percentage numeric,
  p_current_balance numeric,
  p_currency text,
  p_balance_as_of date,
  p_balance_source text,
  p_fx_rate_to_eur numeric,
  p_fx_as_of date,
  p_fx_source text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_mortgage_id uuid;
  v_currency text;
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;
  if p_property_id is null then raise exception 'Selecciona un inmueble registrado'; end if;
  perform 1 from public.real_estate_assets where id = p_property_id for update;
  if not found then raise exception 'Selecciona un inmueble registrado'; end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Indica un nombre para la hipoteca'; end if;
  if p_ownership_percentage is null or p_ownership_percentage <= 0 or p_ownership_percentage > 100 then
    raise exception 'El porcentaje de deuda debe estar entre 0 y 100';
  end if;
  if p_current_balance is null or p_current_balance < 0 then raise exception 'El saldo pendiente no puede ser negativo'; end if;
  if p_balance_as_of is null or nullif(btrim(p_balance_source), '') is null then
    raise exception 'Indica la fecha y fuente del saldo pendiente';
  end if;

  v_currency := upper(nullif(btrim(p_currency), ''));
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' or v_currency in ('XXX', 'XTS', 'ZZZ') then
    raise exception 'Selecciona un código de moneda válido';
  end if;
  if v_currency = 'EUR' then
    p_fx_rate_to_eur := null;
    p_fx_as_of := null;
    p_fx_source := null;
  elsif p_fx_rate_to_eur is null or p_fx_rate_to_eur <= 0 or p_fx_as_of is null or nullif(btrim(p_fx_source), '') is null then
    raise exception 'Para moneda extranjera indica cambio a EUR, fecha y fuente';
  end if;

  if p_mortgage_id is null then
    insert into public.mortgage_liabilities (
      property_id, name, ownership_percentage, current_balance, currency,
      balance_as_of, balance_source, fx_rate_to_eur, fx_as_of, fx_source
    ) values (
      p_property_id, btrim(p_name), p_ownership_percentage, p_current_balance, v_currency,
      p_balance_as_of, btrim(p_balance_source), p_fx_rate_to_eur, p_fx_as_of, nullif(btrim(p_fx_source), '')
    ) returning id into v_mortgage_id;
  else
    update public.mortgage_liabilities
    set name = btrim(p_name),
        ownership_percentage = p_ownership_percentage,
        current_balance = p_current_balance,
        currency = v_currency,
        balance_as_of = p_balance_as_of,
        balance_source = btrim(p_balance_source),
        fx_rate_to_eur = p_fx_rate_to_eur,
        fx_as_of = p_fx_as_of,
        fx_source = nullif(btrim(p_fx_source), ''),
        updated_at = now()
    where id = p_mortgage_id and property_id = p_property_id
    returning id into v_mortgage_id;
    if v_mortgage_id is null then raise exception 'No se encontró la hipoteca en este inmueble'; end if;
  end if;

  update public.real_estate_assets
  set mortgage_status = 'registered', updated_at = now()
  where id = p_property_id;

  return v_mortgage_id;
end;
$function$;

revoke all privileges on function public.save_mortgage_liability(uuid, uuid, text, numeric, numeric, text, date, text, numeric, date, text) from public, anon, authenticated;
grant execute on function public.save_mortgage_liability(uuid, uuid, text, numeric, numeric, text, date, text, numeric, date, text) to authenticated;

create or replace function public.confirm_property_has_no_mortgage(p_property_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;
  perform 1 from public.real_estate_assets where id = p_property_id for update;
  if not found then raise exception 'No se encontró el inmueble'; end if;
  if exists (select 1 from public.mortgage_liabilities where property_id = p_property_id) then
    raise exception 'Este inmueble tiene hipotecas registradas';
  end if;
  update public.real_estate_assets
  set mortgage_status = 'none', updated_at = now()
  where id = p_property_id;
end;
$function$;

revoke all privileges on function public.confirm_property_has_no_mortgage(uuid) from public, anon, authenticated;
grant execute on function public.confirm_property_has_no_mortgage(uuid) to authenticated;

create or replace function public.save_wealth_snapshot()
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_financial_total numeric;
  v_cash_total numeric;
  v_property_total numeric;
  v_mortgage_total numeric;
  v_property_detail jsonb;
  v_mortgage_detail jsonb;
  v_id uuid;
begin
  if not public.is_cartera_owner() then raise exception 'Acceso denegado'; end if;
  lock table public.assets, public.mortgage_liabilities, public.portfolio_cash_accounts,
    public.portfolio_transactions, public.real_estate_assets in share mode;
  if exists (
    select 1
    from public.assets as position
    where position.currency is null
      or position.currency !~ '^[A-Z]{3}$'
      or position.currency in ('XXX', 'XTS', 'ZZZ')
      or position.current_price is null
      or position.current_price < 0
      or position.price_as_of is null
      or nullif(btrim(position.price_source), '') is null
      or (position.currency <> 'EUR' and (
        position.fx_rate_to_eur is null or position.fx_rate_to_eur <= 0
        or position.fx_as_of is null or nullif(btrim(position.fx_source), '') is null
      ))
  ) then raise exception 'Confirma la moneda, precio, fecha y fuente de todas las posiciones antes de guardar'; end if;

  select coalesce(sum(
    position.quantity * position.current_price
      * case when position.currency = 'EUR' then 1 else position.fx_rate_to_eur end
  ), 0)
  into v_financial_total
  from public.assets as position;

  select coalesce(sum(coalesce(account_balance.balance, 0) * account.current_fx_rate_to_eur), 0)
  into v_cash_total
  from public.portfolio_cash_accounts as account
  left join lateral (
    select sum(tx.cash_amount) as balance
    from public.portfolio_transactions as tx
    where tx.cash_account_id = account.id
  ) as account_balance on true;

  if v_financial_total < 0 then
    raise exception 'El valor de los activos financieros no puede ser negativo';
  end if;
  if exists (
    select 1 from public.real_estate_assets where mortgage_status = 'unreviewed'
  ) then raise exception 'Confirma si cada inmueble tiene hipoteca antes de guardar el patrimonio neto'; end if;
  if exists (
    select 1
    from public.real_estate_assets as property
    where property.mortgage_status = 'registered'
      and not exists (select 1 from public.mortgage_liabilities as loan where loan.property_id = property.id)
  ) then raise exception 'Añade las hipotecas de cada inmueble marcado con deuda'; end if;
  if exists (
    select 1
    from public.real_estate_assets as property
    where property.mortgage_status = 'none'
      and exists (select 1 from public.mortgage_liabilities as loan where loan.property_id = property.id)
  ) then raise exception 'Revisa el estado de deuda de los inmuebles'; end if;

  select coalesce(sum(
    property.current_value * property.ownership_percentage / 100
      * case when property.currency = 'EUR' then 1 else property.fx_rate_to_eur end
  ), 0)
  into v_property_total
  from public.real_estate_assets as property;

  select coalesce(jsonb_agg(jsonb_build_object(
    'property_id', property.id,
    'name', property.name,
    'property_type', property.property_type,
    'ownership_percentage', property.ownership_percentage,
    'value', property.current_value,
    'currency', property.currency,
    'value_as_of', property.valuation_as_of,
    'value_source', property.valuation_source,
    'fx_rate_to_eur', case when property.currency = 'EUR' then 1 else property.fx_rate_to_eur end,
    'fx_as_of', property.fx_as_of,
    'fx_source', property.fx_source,
    'value_eur', property.current_value * property.ownership_percentage / 100
      * case when property.currency = 'EUR' then 1 else property.fx_rate_to_eur end
  ) order by property.name), '[]'::jsonb)
  into v_property_detail
  from public.real_estate_assets as property;

  select coalesce(sum(
    loan.current_balance * loan.ownership_percentage / 100
      * case when loan.currency = 'EUR' then 1 else loan.fx_rate_to_eur end
  ), 0)
  into v_mortgage_total
  from public.mortgage_liabilities as loan;

  select coalesce(jsonb_agg(jsonb_build_object(
    'mortgage_id', loan.id,
    'property_id', loan.property_id,
    'property_name', property.name,
    'name', loan.name,
    'ownership_percentage', loan.ownership_percentage,
    'balance', loan.current_balance,
    'currency', loan.currency,
    'balance_as_of', loan.balance_as_of,
    'balance_source', loan.balance_source,
    'fx_rate_to_eur', case when loan.currency = 'EUR' then 1 else loan.fx_rate_to_eur end,
    'fx_as_of', loan.fx_as_of,
    'fx_source', loan.fx_source,
    'value_eur', loan.current_balance * loan.ownership_percentage / 100
      * case when loan.currency = 'EUR' then 1 else loan.fx_rate_to_eur end
  ) order by property.name, loan.name), '[]'::jsonb)
  into v_mortgage_detail
  from public.mortgage_liabilities as loan
  join public.real_estate_assets as property on property.id = loan.property_id;

  insert into public.wealth_snapshots (
    financial_assets_eur, cash_eur, real_estate_eur, mortgage_debt_eur,
    net_worth_eur, property_detail, mortgage_detail
  ) values (
    v_financial_total, v_cash_total, v_property_total, v_mortgage_total,
    v_financial_total + v_cash_total + v_property_total - v_mortgage_total,
    v_property_detail, v_mortgage_detail
  ) returning id into v_id;

  return v_id;
end;
$function$;

revoke all privileges on function public.save_wealth_snapshot() from public, anon, authenticated;
grant execute on function public.save_wealth_snapshot() to authenticated;

comment on table public.real_estate_assets is
  'Manually valued property assets; ownership percentage is kept separate from mortgage liability share.';
comment on table public.mortgage_liabilities is
  'Current mortgage balances linked to property; updates are made through the owner-checked RPC.';
comment on table public.wealth_snapshots is
  'Append-only net-worth snapshots; historical property and mortgage values are frozen as recorded.';

commit;