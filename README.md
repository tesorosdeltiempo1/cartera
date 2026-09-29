# Cartera

> **Patrimonio · Disciplina · Legado**

Registro privado de patrimonio personal, inspirado en la sobriedad clásica: criterio antes que ruido, constancia antes que espectáculo. La identidad visual toma referencias grecorromanas con una paleta de tinta, mármol y oro antiguo; la prioridad sigue siendo la claridad de los datos.

## Propósito

Cartera registra posiciones reales por broker, las reúne manualmente bajo activos consolidados, compara exposición con objetivos y conserva un histórico mediante snapshots. No ejecuta operaciones ni ofrece asesoramiento financiero.

Principios de producto:

1. Datos verificables antes que adornos.
2. Consolidación manual y explícita; nunca fusionar instrumentos solo por su nombre.
3. Las automatizaciones deben explicar sus supuestos y poder revisarse.
4. La privacidad patrimonial y la continuidad a largo plazo son requisitos, no extras.

## Estado actual

- App desplegada en Vercel, con login de propietario por correo y contraseña de Supabase Auth.
- El propietario confirmó en producción que pudo iniciar sesión y que sus datos cargan correctamente.
- Registros públicos desactivados en Supabase.
- RLS activo en `assets`, `investment_assets`, `portfolio_snapshots` y `portfolio_snapshot_assets`; las políticas limitan acceso a la sesión cuyo UID está configurado en `public.is_cartera_owner()`.
- El inventario posterior a la migración mostró grants CRUD a `authenticated`, ninguna concesión a `anon` en esas cuatro tablas y políticas de propietario. `FORCE ROW LEVEL SECURITY` figura desactivado; el acceso desde la aplicación utiliza roles Supabase de cliente, no el propietario de las tablas.
- Activos consolidados, objetivos, tesis/notas y vínculo manual entre posiciones de broker y activos maestros.
- Dashboard, posiciones por broker, histórico de snapshots y exportación JSON privada.
- Migración aplicada por el propietario en Supabase y plantilla SQL sin UID personal versionado.
- Identidad visual Aureum: referencias clásicas grecorromanas, tinta verde profunda, mármol cálido y oro antiguo; accesibilidad y legibilidad como límites de diseño.

La autenticación de la interfaz no sustituye RLS. No habilitar registro público ni compartir respaldos, correo, contraseña, tokens o datos patrimoniales.

## Modelo y limitaciones

- `assets` representa una posición individual en un broker; `investment_assets` es el catálogo maestro.
- La exposición consolidada suma las posiciones vinculadas al mismo activo. Los objetivos pertenecen al activo maestro, no a cada broker.
- No se copian automáticamente objetivos antiguos ni se fusionan nombres/tickers ambiguos.
- Los valores se interpretan como EUR; no existe conversión automática de divisa. Verifica manualmente la moneda de cada precio antes de usar los pesos.
- La exposición indirecta dentro de fondos (look-through) no se calcula.
- Los snapshots nuevos guardan desglose; los registros antiguos no se recalculan retroactivamente.
- La exportación JSON contiene datos patrimoniales en claro: guárdala en un lugar privado.

## Stack

- Next.js 16 App Router, React 19 y TypeScript.
- Supabase Auth y Postgres con Row Level Security.
- Tailwind CSS 4 y Recharts.
- Vercel; el repositorio está conectado a despliegue automático desde `main`.

## Desarrollo local

Requisitos: Node.js compatible con el proyecto y un archivo local `.env.local` que contenga `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No guardes ese archivo en Git.

```bash
npm install
npm run dev
```

Validación antes de publicar:

```bash
npm run lint
npm run build
```

## Seguridad operativa

- El estado de acceso y las comprobaciones continuas se documentan en [docs/database/005_owner_access_status.md](docs/database/005_owner_access_status.md).
- [docs/database/002_inspect_supabase_read_only.sql](docs/database/002_inspect_supabase_read_only.sql) permite volver a inspeccionar esquema, RLS, políticas y grants.
- [docs/database/001_consolidated_assets_dry_run.sql](docs/database/001_consolidated_assets_dry_run.sql) conserva el SQL de la instalación inicial y acaba en `ROLLBACK`. **No lo ejecutes**: el `COMMIT` inicial ya se aplicó; cualquier cambio futuro requiere una migración nueva basada en el esquema vigente.
- El UID del propietario no se guarda en el repositorio. El UID no es una contraseña, pero tampoco se debe publicar innecesariamente.
- Después de cambios de permisos, vuelve a ejecutar el diagnóstico de solo lectura y prueba tanto la sesión propietaria como el acceso sin sesión antes de dar por seguro el despliegue.

## Próximas mejoras

Prioridad recomendada, en pasos pequeños y comprobables:

1. Refinar la identidad renacentista/rococó en las pantallas restantes y revisar la experiencia móvil/accesible.
2. Añadir visibilidad a divisas y origen/fecha del precio antes de confiar en comparativas cuando haya activos no denominados en EUR.
3. Revisar la calidad de vínculos y objetivos consolidados, sin alterar snapshots históricos.
4. Mejorar el histórico y las operaciones de edición/borrado con confirmación y mensajes inequívocos.
5. Evaluar cotizaciones, aportaciones periódicas o proyecciones solo cuando sus datos y supuestos puedan auditarse.

El historial de cambios y validaciones está en [CHANGELOG.md](CHANGELOG.md).