# Estado y comprobaciones del acceso del propietario

## Configuración aplicada en producción — 2026-09-29

- El propietario confirmó que inicia sesión con correo y contraseña y que la aplicación mantiene/carga sus datos.
- Los registros públicos (**Allow new users to sign up**) están desactivados en Supabase Auth.
- El propietario ejecutó la migración SQL 001 primero con `ROLLBACK` y luego con `COMMIT`.
- La inspección posterior mostró RLS habilitado en `assets`, `investment_assets`, `portfolio_snapshots` y `portfolio_snapshot_assets`, una policy de propietario para `authenticated` en cada una y grants CRUD de `authenticated`; la consulta no mostró grants de esas tablas a `anon`.
- El diagnóstico informó `FORCE ROW LEVEL SECURITY` desactivado. El frontend usa la API de cliente de Supabase bajo el rol `authenticated` y está sujeto a las políticas RLS.

**No repitas el proceso inicial.** No vuelvas a ejecutar la migración 001 como un despliegue. [001_consolidated_assets_dry_run.sql](001_consolidated_assets_dry_run.sql) se conserva como registro de la migración original, termina en `ROLLBACK` y tiene el UID reemplazado por un marcador. Para cambios futuros, prepara una migración nueva a partir del estado vigente.

## Comprobación de solo lectura

Para volver a inspeccionar la base de datos, ejecuta [002_inspect_supabase_read_only.sql](002_inspect_supabase_read_only.sql) en Supabase SQL Editor. No modifica filas ni estructura. Comprueba que:

1. RLS siga habilitado en las cuatro tablas.
2. Cada tabla tenga su política dirigida a `authenticated` que aplique `public.is_cartera_owner()`.
3. No aparezcan grants de tabla a `anon`.
4. `authenticated` conserve solo `SELECT`, `INSERT`, `UPDATE` y `DELETE` requeridos por la app, no `TRUNCATE`.

El informe SQL es una comprobación del estado del catálogo, no una prueba completa de autorización. En cada cambio importante, comprueba además en la web que una sesión cerrada solo vea el login y que la sesión del propietario pueda cargar datos. No compartas correos, contraseña, UID, tokens, respaldos ni resultados con datos patrimoniales.

## Respaldo y recuperación

La descarga JSON desde la aplicación contiene datos patrimoniales en claro. Consérvala en una ubicación privada y protegida. No existe todavía un flujo de importación/restauración automática.
