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
- El P0 de moneda y procedencia está desplegado y la migración de campos se informó aplicada. Las posiciones heredadas siguen pendientes de clasificación individual: no se infiere su moneda ni se incluyen como importes EUR confirmados hasta verificarlas. El P0 permanece abierto hasta revisar los datos y confirmar valoraciones y snapshots futuros.
- La exposición indirecta dentro de fondos (look-through) no se calcula.
- Producción guarda desglose en snapshots. La nueva versión P0 adjunta inputs de valoración reproducibles a snapshots futuros; ningún snapshot histórico se recalcula.
- La exportación JSON contiene datos patrimoniales en claro: guárdala en un lugar privado.
- La migración 007 está aplicada y verificada en Supabase. El propietario confirmó que `/operaciones` ya está desplegada y funciona correctamente.
- La migración 008 de inmuebles, hipotecas y snapshots de patrimonio está aplicada y verificada. `/patrimonio` se publicó en `main` con `e0cef85`; falta confirmar el despliegue de Vercel.
- La migración 009 de alquileres, gastos y pagos hipotecarios está aplicada y verificada. El formulario de flujos queda pendiente de push/despliegue.

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
- [docs/database/006_position_price_provenance.sql](docs/database/006_position_price_provenance.sql) está aplicada y sus columnas/restricciones se verificaron. Las posiciones heredadas siguen requiriendo clasificación manual; mientras tanto, la app las excluye de subtotales EUR confirmados y no permite snapshots incompletos.
- El UID del propietario no se guarda en el repositorio. El UID no es una contraseña, pero tampoco se debe publicar innecesariamente.
- Después de cambios de permisos, vuelve a ejecutar el diagnóstico de solo lectura y prueba tanto la sesión propietaria como el acceso sin sesión antes de dar por seguro el despliegue.

## Roadmap

La migración de divisa/procedencia está aplicada y verificada en Supabase. La interfaz nueva mantiene visibles los valores heredados sin moneda, pero no los presenta como euros; faltará revisarlos individualmente antes de recuperar el total confirmado y guardar nuevos snapshots. No se infieren monedas ni se recalculan snapshots pasados. El plan por fases, criterios de aceptación y flujo de publicación está en [docs/ROADMAP.md](docs/ROADMAP.md).

La [guía de trabajo y operación](docs/GUIA_DE_TRABAJO.md) resume la visión, la estructura del código y los pasos para implementar, validar y publicar cambios con seguridad.

El historial de cambios y validaciones está en [CHANGELOG.md](CHANGELOG.md).