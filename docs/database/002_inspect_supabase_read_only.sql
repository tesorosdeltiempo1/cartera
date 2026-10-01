-- Diagnóstico de solo lectura para el esquema público de Cartera.
-- Ejecutar en Supabase SQL Editor. No crea, actualiza ni borra objetos o datos.

with inspection as (
  select
    'TABLE'::text as kind,
    t.table_name as object_name,
    'presente'::text as details
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and t.table_name in ('assets', 'portfolio_snapshots', 'investment_assets', 'portfolio_snapshot_assets', 'portfolio_transactions', 'portfolio_cash_accounts', 'real_estate_assets', 'mortgage_liabilities', 'wealth_snapshots')

  union all

  select
    'COLUMN',
    c.table_name,
    c.column_name || ' · ' || c.data_type || ' (' || c.udt_name || ')'
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in ('assets', 'portfolio_snapshots', 'investment_assets', 'portfolio_snapshot_assets', 'portfolio_transactions', 'portfolio_cash_accounts', 'real_estate_assets', 'mortgage_liabilities', 'wealth_snapshots')

  union all

  select
    'CONSTRAINT',
    tbl.relname,
    con.conname || ' · ' || pg_get_constraintdef(con.oid)
  from pg_constraint con
  join pg_class tbl on tbl.oid = con.conrelid
  join pg_namespace ns on ns.oid = tbl.relnamespace
  where ns.nspname = 'public'
    and tbl.relname in ('assets', 'portfolio_snapshots', 'investment_assets', 'portfolio_snapshot_assets', 'portfolio_transactions', 'portfolio_cash_accounts', 'real_estate_assets', 'mortgage_liabilities', 'wealth_snapshots')

  union all

  select
    'RLS',
    tbl.relname,
    'enabled=' || tbl.relrowsecurity::text || ', forced=' || tbl.relforcerowsecurity::text
  from pg_class tbl
  join pg_namespace ns on ns.oid = tbl.relnamespace
  where ns.nspname = 'public'
    and tbl.relkind = 'r'
    and tbl.relname in ('assets', 'portfolio_snapshots', 'investment_assets', 'portfolio_snapshot_assets', 'portfolio_transactions', 'portfolio_cash_accounts', 'real_estate_assets', 'mortgage_liabilities', 'wealth_snapshots')

  union all

  select
    'POLICY',
    p.tablename,
    p.policyname || ' · roles=' || array_to_string(p.roles, ',') ||
      ' · command=' || p.cmd ||
      ' · using=' || coalesce(p.qual, '-') ||
      ' · check=' || coalesce(p.with_check, '-')
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in ('assets', 'portfolio_snapshots', 'investment_assets', 'portfolio_snapshot_assets', 'portfolio_transactions', 'portfolio_cash_accounts', 'real_estate_assets', 'mortgage_liabilities', 'wealth_snapshots')

  union all

  select
    'GRANT',
    g.table_name,
    g.grantee || ' · ' || g.privilege_type
  from information_schema.role_table_grants g
  where g.table_schema = 'public'
    and g.table_name in ('assets', 'portfolio_snapshots', 'investment_assets', 'portfolio_snapshot_assets', 'portfolio_transactions', 'portfolio_cash_accounts', 'real_estate_assets', 'mortgage_liabilities', 'wealth_snapshots')
    and g.grantee in ('anon', 'authenticated', 'PUBLIC')

  union all

  select
    'FUNCTION_GRANT',
    r.routine_name,
    r.grantee || ' · ' || r.privilege_type
  from information_schema.routine_privileges r
  where r.specific_schema = 'public'
    and r.routine_name in ('record_portfolio_operation', 'get_portfolio_ledger_summary', 'save_portfolio_snapshot', 'save_mortgage_liability', 'confirm_property_has_no_mortgage', 'save_wealth_snapshot')
    and r.grantee in ('anon', 'authenticated', 'PUBLIC')
)
select kind, object_name, details
from inspection
order by kind, object_name, details;
