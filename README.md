# Cartera

Dashboard personal de gestión patrimonial. No es una app de trading ni un tracker de moda con gráficos bonitos y datos de mentira — es la herramienta de trabajo de quien lleva su propio patrimonio a largo plazo (15-25 años) con una política de inversión escrita y versionada, y quiere una única fuente de verdad accesible desde el móvil o el PC, sin fricción y sin depender de nadie más.

## Visión

Esto se construye con la cabeza de quien sueña en grande pero pone los pies en el suelo cada vez que toca decidir qué construir esta semana. El objetivo final es ambicioso — un panel de control patrimonial completo, con histórico, automatización de precios, alertas de rebalanceo y generación de contenido a partir de los propios datos — pero se llega ahí sumando piezas pequeñas, probadas una a una en producción, nunca de golpe.

Tres principios que no se negocian:

1. **Los datos primero, lo bonito después.** Un gráfico precioso con números falsos no vale nada; una tabla fea con datos reales sí.
2. **Control manual sobre automatización ciega.** Cada automatización que se añada (precios en vivo, cálculos, alertas) debe poder revisarse y desactivarse — nunca "magia" que decide por ti sin que lo veas.
3. **Esto es una herramienta de gestión familiar a largo plazo, no un juguete.** Se construye pensando en que alguien más (pareja, herencia, quien sea) tenga que entenderlo dentro de 15 años sin ayuda.

## Qué es / qué no es

**Es:**
- Un registro de posiciones reales, repartidas entre brokers, categorizado según la política de inversión propia.
- Un panel visual de pesos actuales vs. objetivos consolidados por activo, no por broker.
- Un track record del valor total en el tiempo, con snapshots manuales.

**No es (todavía, o quizá nunca):**
- Un broker ni ejecuta operaciones — solo registra lo que ya ha pasado.
- Una fuente de asesoramiento financiero automatizado.
- Una herramienta de un solo propietario; no se prevé gestión multiusuario. El despliegue actual no tiene inicio de sesión y la clave pública de Supabase no hace privada una URL pública.

## Stack técnico

- **Next.js 16** (App Router, TypeScript) — frontend y lógica de servidor en uno.
- **Supabase** (Postgres) — base de datos real, con Row Level Security abierto a la key `anon` (sin autenticación de usuarios).
- **Vercel** — hosting, desplegado automáticamente en cada push a `main`.
- **Recharts** — gráficos (donut de pesos, línea de track record).
- **Tailwind CSS** — estilos.

## Estado actual

- [x] Proyecto Next.js conectado a Supabase real (no datos de prueba)
- [x] Esquema de datos con las 4 categorías reales: Núcleo Pasivo, Satélite Convicción, Seguridad y Liquidez, Especulativo
- [x] Alta de posiciones desde formulario web
- [x] Tabla de listado de posiciones
- [x] Tarjetas resumen por categoría con peso % real
- [x] Gráfico donut de distribución de pesos
- [x] Snapshots de track record (botón manual) + gráfico de evolución del valor total
- [x] Dashboard con tema oscuro, resumen visual y tabla adaptable a móvil
- [x] Comparativa provisional por categoría desplegada (no equivale a un objetivo consolidado por empresa y debe sustituirse)
- [x] Navegación principal desplegada; las páginas de Activos, Posiciones e Histórico siguen siendo placeholders
- [ ] Modelo de objetivos por activo consolidado y suma de exposiciones entre brokers
- [x] Desplegado en producción, accesible desde cualquier dispositivo

El historial de iteraciones y su validación está en [CHANGELOG.md](CHANGELOG.md).

### Prioridad de seguridad — antes de activar más operaciones destructivas
- [ ] Aplicar el cierre de `anon` y la política RLS de propietario único descritos en [docs/database/005_setup_owner_auth.md](docs/database/005_setup_owner_auth.md).
- [ ] Verificar en Supabase que solo la cuenta propietaria puede acceder y que `anon` no tiene permisos efectivos antes del nuevo despliegue.
- [ ] Probar operaciones de modificación y borrado con una copia de datos o un entorno separado antes de usarlas en producción.

## Roadmap

### Fase 2 — Terminar el ciclo de gestión de datos
Lo mínimo para que esto sea *usable* de verdad día a día, no solo una demo:
- [x] Editar una posición existente (probado por el usuario en producción)
- [ ] Eliminar una posición (implementado localmente; pendiente revisar acceso/RLS y validar antes de producción)
- [ ] Editar/eliminar un snapshot por error
- [ ] Confirmación antes de borrar snapshots (la confirmación de posiciones ya está implementada; pendiente validación)
- [ ] Mostrar un resultado claro después de cada operación y no perder cambios ante un error de red
- [x] Exportar un respaldo manual de posiciones y snapshots antes de permitir borrados habituales (probado por el usuario en producción; guardar el archivo en un lugar privado)

### Fase 3 — Reflejar la política de inversión de verdad
Acercar la herramienta a cómo gestionas de verdad, no a un CRUD genérico:
- [ ] Definir objetivos una sola vez por activo consolidado, manteniendo cada posición y broker por separado. El objetivo de Amazon debe confirmarse: el 17% antiguo de una fila no es un objetivo global aprobado.
- [ ] Diseñar la migración de datos sin pérdida: crear un catálogo de activos/objetivos y vincular cada posición actual; revisar manualmente filas sin ticker, tickers repetidos ambiguos y objetivos antiguos antes de migrar.
- [ ] Mantener la clasificación estratégica y el objetivo en el activo consolidado; sumar la cantidad/valor de sus posiciones en todos los brokers para calcular peso real.
- [ ] Confirmar que los precios manuales están expresados en EUR o añadir divisa/conversión por posición antes de confiar en pesos consolidados; hoy el cálculo asume EUR.
- [ ] Acordar la clave de identidad del activo (ISIN cuando exista; ticker/mercado como alternativa) y no fusionar activos automáticamente solo por coincidencia de nombre.
- [ ] Especificar que la exposición indirecta a través de fondos queda fuera del cálculo hasta incorporar datos de composición y una regla explícita de look-through.
- [ ] Reemplazar la comparativa temporal por categoría —sus objetivos de fila actuales no equivalen a objetivos por empresa— por una comparativa consolidada de activos y categorías con semántica definida.
- [ ] Campo de "tesis de inversión" por posición del Satélite de Convicción (máx. 5 empresas), con fecha de última revisión
- [ ] Aviso visual cuando una posición del satélite lleva más de un trimestre sin revisión (tu propia regla de revisión trimestral obligatoria)
- [ ] Registro de aportaciones periódicas a Activos Duros (la aportación semanal diferencial), separado del valor de mercado, para distinguir "cuánto he metido" de "cuánto vale ahora"

#### Impacto previsto en base de datos (SQL preparado; no ejecutado)
- Añadir una tabla maestra `investment_assets` con identidad estable, nombre, ticker/ISIN, categoría y `target_weight` global opcional.
- Mantener `assets` como posiciones por broker; el inventario de columnas de Supabase ya muestra `assets.investment_asset_id` (UUID), por lo que primero hay que confirmar si existe la tabla maestra y si la columna tiene una FK válida. No volver a añadir el campo a ciegas.
- Inventario de datos de solo lectura recibido: hay 0 activos maestros y 14 posiciones, todas sin vincular. No se deben crear los maestros agrupando automáticamente por nombre/ticker ni copiar/sumar los objetivos antiguos por fila; primero hay que revisar el mapa y asignar el nuevo objetivo global deliberadamente.
- La exposición consolidada será la suma del valor de las filas `assets` vinculadas al mismo activo; el peso real será esa suma dividida por el valor de la cartera.
- Migrar en etapas: respaldo, inventario de filas, mapeo manual de duplicados/objetivos, referencia nullable, verificación de sumas y solo entonces retirar el objetivo antiguo de las posiciones.
- No alterar snapshots existentes: preservar su desglose histórico y definir desde qué fecha el nuevo modelo se refleja en ellos.
- Verificar las políticas RLS para todas las tablas nuevas antes de desplegar; no conceder acceso anónimo más amplio por conveniencia.
- El borrador transaccional está en [docs/database/001_consolidated_assets_dry_run.sql](docs/database/001_consolidated_assets_dry_run.sql). Empieza con `ROLLBACK`; no cambia la base de datos hasta ejecutarlo en Supabase y aprobar explícitamente el `COMMIT`.
- El SQL de ensayo revoca el rol `anon` de las cuatro tablas y aplica CRUD solo a la cuenta propietaria autenticada por UID. Requiere crear primero el usuario y reemplazar el UID en el script, siguiendo [docs/database/005_setup_owner_auth.md](docs/database/005_setup_owner_auth.md).
- `IF NOT EXISTS` hace reejecutable la instalación completa compatible, pero no repara tablas parciales o divergentes; revisar los objetos ya existentes antes de repetir o aplicar la migración.
- Comprobación de solo lectura recibida el 2026-09-29: `assets.id`, `assets.investment_asset_id` y `portfolio_snapshots.id` son UUID; `assets.updated_at` existe. Aún faltan tabla/columnas de `investment_assets`, FK real, constraints, políticas RLS y privilegios efectivos.

#### Navegación prevista (decidir después del modelo)
- Mantener el dashboard como resumen general.
- Añadir una vista **Activos y objetivos** para editar objetivos globales y consultar la exposición consolidada.
- Mantener **Posiciones** para el detalle operativo por broker.
- Mantener **Histórico** para snapshots y evolución patrimonial.
- Empezar con navegación sencilla por páginas/rutas; usar pestañas solo para sub-vistas relacionadas, no para esconder el detalle ni duplicar formularios.

### Fase 4 — Menos trabajo manual (con cuidado)
Aquí es donde la automatización empieza a tentar — se añade solo si se puede revisar y desactivar:
- [ ] Actualización automática de `current_price` vía API de cotizaciones (con opción de forzar un valor manual si la API falla o desconfías del dato)
- [ ] Guardar y mostrar la fecha y el origen de cada precio para distinguir datos recientes de valores introducidos manualmente
- [ ] Snapshot automático semanal/mensual (cron job), sin perder el botón manual
- [ ] Multi-moneda si algún broker opera en USD

### Fase 5 — Pulido de uso diario
- [ ] Instalable como PWA (icono en el móvil, pantalla completa, sin barra de navegador)
- [x] Tema oscuro fijado para el dashboard
- [x] Menú de navegación para Dashboard, Activos y objetivos, Posiciones e Histórico (rutas creadas; páginas funcionales pendientes)
- [ ] Selector de modo oscuro/claro
- [ ] Acceso autenticado para el único propietario y políticas RLS de mínimo privilegio; no hace falta diseñar cuentas multiusuario. La autenticación debe acompañar a RLS, no sustituirlo.
- [ ] Revisar permisos mínimos de Supabase y evitar que una clave pública permita cambios no autorizados

### Fase 6 — La parte soñadora, cuando todo lo anterior sea aburrido de estable
- [ ] Proyección a 15-25 años según aportaciones y rentabilidad histórica asumida (con los supuestos siempre visibles, nunca una caja negra)
- [ ] Exportar un resumen de la cartera en el formato de la alineación de 11 jugadores, como borrador para tus artículos/hilos
- [ ] Alertas de rebalanceo cuando un peso se desvía por encima de un umbral definido por ti

## Filosofía de iteración

Cada fase se implementa **una casilla a la vez**, se prueba en producción con datos reales (no en local con datos de mentira), y no se empieza la siguiente casilla hasta confirmar que la anterior funciona sin errores. Si algo automatiza una decisión, debe quedar siempre a la vista el dato crudo debajo — nunca solo el resultado ya cocinado. Las revisiones de la política de inversión (próximas: dic. 2026, mar. 2027) son buenos puntos naturales para parar y revisar si el dashboard sigue reflejando cómo gestionas de verdad, o si se ha quedado desactualizado respecto a la política.

## Desarrollo local

```bash
npm install
npm run dev
```

Necesitas un `.env.local` con:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=


Despliegue: automático en Vercel con cada push a `main`.