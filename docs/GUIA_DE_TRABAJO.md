# Guía de trabajo y operación

## Propósito y visión

Aureum es un registro privado y auditable del patrimonio familiar a largo plazo. La prioridad es que los valores sean comprensibles, reproducibles y trazables; no es un broker ni un asesor financiero. Una automatización no debe ocultar datos incompletos ni modificar el pasado sin una decisión explícita.

Principios para cada cambio:

- Exactitud y procedencia antes que cálculos aparentemente completos.
- Identidades, divisas y supuestos explícitos; no inferirlos por nombres o tickers.
- Respaldar y revisar antes de transformar datos o esquema.
- Mantener snapshots históricos tal como se guardaron.
- Una iteración pequeña, con aceptación y comprobación definidas antes de publicar.

El detalle de prioridades y criterios de salida vive en [ROADMAP.md](ROADMAP.md). Esta guía explica cómo avanzar por ese plan con el estado y la estructura actuales.

## Situación actual

La línea base confirmada en producción incluye acceso de propietario con Supabase Auth y RLS, dashboard, activos consolidados con vínculos manuales, posiciones por broker, snapshots históricos y exportación JSON. El despliegue se conecta a `main` en Vercel.

El P0 de moneda y procedencia está desplegado y su migración se informó aplicada. La valoración usa EUR como base, pero las posiciones antiguas siguen pendientes de clasificación individual. El P0 no se considera cerrado hasta verificar cada precio, moneda y cambio pertinente y confirmar snapshots futuros. No se deben reinterpretar las cifras antiguas ni recalcular snapshots.

La migración 007 ya está aplicada y el propietario confirmó que `/operaciones` está desplegada y funciona. Iniciar el ledger fija un punto de partida actual; no reconstruye compras anteriores.

El dashboard y `/operaciones` calculan caja y rentabilidad mediante `get_portfolio_ledger_summary`; el límite de 250 queda solo para la lista de movimientos recientes. El respaldo pagina las tablas y comprueba recuentos; el snapshot se guarda en una llamada transaccional. `npm run lint` y `npm run build` pasan. Tras el despliegue, queda comprobar los flujos de la aplicación; no se han creado operaciones ni snapshots de prueba sobre datos reales.

La inspección compartida confirma el esquema y los permisos de PostgreSQL, pero no sustituye la validación de los flujos de la aplicación. No se han creado operaciones ni snapshots de prueba sobre datos reales.

El guardado de resumen y detalle usa `save_portfolio_snapshot` en una transacción; comprueba su comportamiento con un snapshot cuando estés listo para iniciar el histórico.

Los estados anteriores son una fotografía documental: comprobar el despliegue y el estado de Supabase antes de ejecutar cualquier operación real. El estado operativo de acceso está en [database/005_owner_access_status.md](database/005_owner_access_status.md).

## Estructura del proyecto

| Ruta | Responsabilidad |
| --- | --- |
| `src/app/` | Rutas App Router: dashboard (`/`), activos, posiciones, histórico y la ruta local de operaciones. |
| `src/components/` | Formularios y componentes de interfaz reutilizados por las rutas. `AuthGate` controla el acceso de interfaz y `NavBar` la navegación autenticada. |
| `src/lib/valuation.ts` | Reglas de completitud y conversión de las valoraciones de posiciones a EUR. |
| `src/lib/currencies.ts` | Opciones de moneda utilizadas por los formularios. |
| `src/lib/supabase.ts` | Cliente Supabase del navegador; sus permisos siguen dependiendo de Auth, grants y RLS. |
| `src/lib/portfolioEvents.ts` | Notificación local para refrescar vistas tras cambios de cartera. |
| `src/lib/ledger.ts` | Cálculos y tipos del ledger de operaciones. |
| `docs/ROADMAP.md` | Prioridades, límites y criterios de aceptación del producto. |
| `docs/database/` | Inspecciones de solo lectura, inventarios privados y scripts/migraciones SQL con estados distintos. |

No se configura una suite de pruebas automatizadas en los scripts actuales de `package.json`. Las puertas locales disponibles son ESLint y el build de Next.js; completar estas comprobaciones con QA manual de los flujos afectados.

## Cómo abordar una mejora

1. **Elegir una prioridad del roadmap.** Escribir el problema, usuario afectado, alcance y exclusiones. No convertir una idea local en funcionalidad disponible por asumir que el despliegue la incluye.
2. **Identificar la fuente de verdad.** Seguir el dato desde el formulario o ruta hasta `src/lib/`, Supabase y las vistas que lo consumen. Para valoración, revisar `valuation.ts`; para cambios de datos, identificar también snapshots, exportaciones y páginas afectadas.
3. **Definir aceptación y riesgo.** Especificar qué debe pasar, qué datos podrían cambiar y cómo comprobar permisos, moneda, fechas, errores y estados incompletos. Usar datos ficticios o un entorno aislado para acciones destructivas.
4. **Mantener la implementación acotada.** Reutilizar componentes y reglas existentes. No fusionar activos automáticamente, adivinar moneda ni cambiar snapshots históricos.
5. **Validar antes de integrar.** Ejecutar `npm run lint` y `npm run build`; realizar comprobaciones manuales de escritorio/móvil, sesión cerrada y sesión propietaria según el área modificada. Revisar que las advertencias y errores sean visibles.
6. **Actualizar documentación.** Anotar en `CHANGELOG.md` qué cambió y distinguir código local, migración aplicada, despliegue y confirmación de producción. Actualizar el roadmap solo cuando cambie el estado o las prioridades.
7. **Publicar con control.** Revisar el diff y el estado de Git, integrar solo cambios validados y publicar desde `main` según el flujo conectado a Vercel. Comprobar el despliegue y el comportamiento real antes de afirmar que la tarea está terminada.

Comandos de validación local:

```bash
npm install
npm run lint
npm run build
```

Para desarrollo local, configura `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No guardes secretos ni datos de cartera en Git.

## Supabase ahora

El propietario aplicó 007 y compartió el diagnóstico 002; tablas, RLS, policies y permisos requeridos aparecen presentes. No vuelvas a ejecutar `007_transaction_ledger.sql`.

El propietario confirmó que el ledger está desplegado y funciona. También aplicó la migración 008; el diagnóstico 002 confirmó tablas, RLS, policies y permisos para inmuebles e hipotecas. No vuelvas a ejecutar `007_transaction_ledger.sql` ni `008_real_estate_wealth.sql`.

La ruta `/patrimonio` se publicó en `main` en el commit `e0cef85`; espera a que Vercel termine. Después, inicia sesión y confirma que abre la pantalla. Prueba el flujo con valores ficticios antes de registrar datos reales.

En Posiciones, usa los filtros `Pendientes` y `Valoradas` y busca por nombre, ticker o broker para completar la revisión P0; no deduzcas monedas ni cambies valores sin confirmarlos en el broker.

## Qué significa terminar

Una tarea no está completa solo porque compile. Debe cumplir sus criterios de aceptación, conservar la privacidad, dejar claro el origen de los datos y tener documentadas sus limitaciones. En cambios de producción, distinguir siempre entre validación local, ejecución de migración, despliegue y comprobación por el propietario.
