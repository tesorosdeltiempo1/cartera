-- Migracion 011 - Planes previstos de aportaciones
--
-- Los planes describen una intencion recurrente; no generan operaciones,
-- compras ni movimientos de caja automaticamente. El usuario registra cada
-- ejecucion real en el flujo habitual del ledger.

begin;

create table if not exists public.portfolio_contribution_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  broker text not null,
  currency text not null,
  amount numeric not null,
  plan_type text not null,
  cadence text not null,
  weekday smallint,
  day_of_month smallint,
  start_date date not null,
  end_date date,
  target_position_id uuid references public.assets(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_contribution_plans_name_not_blank_check check (btrim(name) <> ''),
  constraint portfolio_contribution_plans_broker_not_blank_check check (btrim(broker) <> ''),
  constraint portfolio_contribution_plans_currency_check check (currency ~ '^[A-Z]{3}$' and currency not in ('XXX', 'XTS', 'ZZZ')),
  constraint portfolio_contribution_plans_amount_positive_check check (amount > 0),
  constraint portfolio_contribution_plans_type_check check (plan_type in ('cash_deposit', 'investment_purchase')),
  constraint portfolio_contribution_plans_target_check check (
    (plan_type = 'cash_deposit' and target_position_id is null)
    or (plan_type = 'investment_purchase' and target_position_id is not null)
  ),
  constraint portfolio_contribution_plans_date_order_check check (end_date is null or end_date >= start_date),
  constraint portfolio_contribution_plans_schedule_check check (
    (cadence = 'weekly' and weekday between 0 and 6 and day_of_month is null)
    or (cadence = 'monthly' and day_of_month between 1 and 31 and weekday is null)
  )
);

create index if not exists portfolio_contribution_plans_active_idx
  on public.portfolio_contribution_plans (is_active, start_date);

create or replace function public.set_contribution_plan_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists portfolio_contribution_plans_set_updated_at on public.portfolio_contribution_plans;
create trigger portfolio_contribution_plans_set_updated_at
  before update on public.portfolio_contribution_plans
  for each row execute function public.set_contribution_plan_updated_at();

alter table public.portfolio_contribution_plans enable row level security;

drop policy if exists cartera_owner_all on public.portfolio_contribution_plans;
create policy cartera_owner_all on public.portfolio_contribution_plans
  for all to authenticated
  using (public.is_cartera_owner())
  with check (public.is_cartera_owner());

revoke all privileges on table public.portfolio_contribution_plans from public, anon, authenticated;
grant select, insert, update, delete on table public.portfolio_contribution_plans to authenticated;

commit;
