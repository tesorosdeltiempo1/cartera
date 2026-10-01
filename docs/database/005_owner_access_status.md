# Estado y comprobaciones del acceso del propietario

## Configuración aplicada en producción — 2026-09-29

- El propietario confirmó que inicia sesión con correo y contraseña y que la aplicación mantiene/carga sus datos.
- Los registros públicos (**Allow new users to sign up**) están desactivados en Supabase Auth.
- El propietario ejecutó la migración SQL 001 primero con `ROLLBACK` y luego con `COMMIT`.
- La inspección posterior mostró RLS habilitado en `assets`, `investment_assets`, `portfolio_snapshots` y `portfolio_snapshot_assets`, una policy de propietario para `authenticated` en cada una y grants CRUD de `authenticated`; la consulta no mostró grants de esas tablas a `anon`.
- El diagnóstico informó `FORCE ROW LEVEL SECURITY` desactivado. El frontend usa la API de cliente de Supabase bajo el rol `authenticated` y está sujeto a las políticas RLS.

**No repitas el proceso inicial.** No vuelvas a ejecutar la migración 001 como un despliegue. [001_consolidated_assets_dry_run.sql](001_consolidated_assets_dry_run.sql) se conserva como registro de la migración original, termina en `ROLLBACK` y tiene el UID reemplazado por un marcador. Para cambios futuros, prepara una migración nueva a partir del estado vigente.

El propietario informó que la migración 006 de moneda/procedencia terminó con `Success. No rows returned`. La inspección 002 confirma las seis columnas añadidas a `assets`, `valuation_detail` en `portfolio_snapshot_assets`, sus constraints, RLS activo en las cuatro tablas, grants CRUD a `authenticated`, policies del propietario y ningún grant de tabla a `anon`. Las filas previas quedan con moneda/precio/FX sin clasificar; el nuevo cliente puede mostrarlas como pendientes sin sumarlas a EUR ni permitir snapshots incompletos. Después de desplegar la UI, revísalas individualmente.

## Inspección compartida por el propietario — 2026-10-01

El resultado completo del diagnóstico 002 confirma que las columnas y constraints de moneda/procedencia siguen presentes. En las cuatro tablas actuales (`assets`, `investment_assets`, `portfolio_snapshots` y `portfolio_snapshot_assets`), RLS está habilitado y aparece `cartera_owner_all` para `authenticated`; el informe no muestra grants para `anon` ni `PUBLIC`. `FORCE ROW LEVEL SECURITY` continúa desactivado.

## Migración 007 confirmada — 2026-10-01

Después de que el propietario ejecutara la migración 007, el diagnóstico 002 muestra `portfolio_cash_accounts`, `portfolio_transactions`, `assets.cost_basis_eur`, `assets.ledger_started_at` y `portfolio_snapshots.cash_breakdown`. Las seis tablas inspeccionadas tienen RLS habilitado; las dos tablas del ledger tienen policy `cartera_owner_select`, y las tres funciones (`record_portfolio_operation`, `get_portfolio_ledger_summary`, `save_portfolio_snapshot`) muestran `EXECUTE` solo para `authenticated`. Las tablas del ledger muestran solo grant `SELECT` a `authenticated`; el resultado no muestra grants a `anon` ni `PUBLIC`.

La migración está aplicada y la inspección de esquema/permisos es correcta. Este resultado no prueba por sí solo los flujos de la aplicación; el código requiere despliegue y comprobación posterior de inicio de sesión, resumen, respaldo y snapshots. No vuelvas a ejecutar la migración 007.

## Migración 008 confirmada — 2026-10-01

El diagnóstico compartido por el propietario muestra `real_estate_assets`, `mortgage_liabilities` y `wealth_snapshots`, con sus columnas y constraints. RLS está habilitado en las tres; los inmuebles tienen policy de propietario para `authenticated` y las tablas hipotecarias/snapshots policy de lectura de propietario. Los grants de cliente son CRUD para `real_estate_assets` y solo `SELECT` para hipotecas y wealth snapshots. Las funciones `save_mortgage_liability`, `confirm_property_has_no_mortgage` y `save_wealth_snapshot` muestran `EXECUTE` solo para `authenticated`; no aparecen grants a `anon` ni `PUBLIC`.

La migración 008 está aplicada y el diagnóstico de esquema/permisos coincide con el diseño. No la vuelvas a ejecutar. El código de `/patrimonio` se publicó en `main` en el commit `e0cef85`; falta confirmar el despliegue de Vercel y probar el flujo autenticado. Esta consulta solo inspecciona metadatos, así que no permite saber cuántas filas de inmuebles o hipotecas existen.

## Comprobación de solo lectura

Para volver a inspeccionar la base de datos, ejecuta [002_inspect_supabase_read_only.sql](002_inspect_supabase_read_only.sql) en Supabase SQL Editor. No modifica filas ni estructura. Comprueba que:

1. RLS siga habilitado en las cuatro tablas.
2. Cada tabla tenga su política dirigida a `authenticated` que aplique `public.is_cartera_owner()`.
3. No aparezcan grants de tabla a `anon`.
4. `authenticated` conserve solo `SELECT`, `INSERT`, `UPDATE` y `DELETE` requeridos por la app, no `TRUNCATE`.

El informe SQL es una comprobación del estado del catálogo, no una prueba completa de autorización. En cada cambio importante, comprueba además en la web que una sesión cerrada solo vea el login y que la sesión del propietario pueda cargar datos. No compartas correos, contraseña, UID, tokens, respaldos ni resultados con datos patrimoniales.

## Respaldo y recuperación

La descarga JSON desde la aplicación contiene datos patrimoniales en claro. Consérvala en una ubicación privada y protegida. No existe todavía un flujo de importación/restauración automática.
