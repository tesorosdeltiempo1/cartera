# Registro de cambios

Este archivo recoge las iteraciones funcionales y visuales por separado del README. Las fechas indican cuándo se implementó cada cambio; no implican por sí mismas que esté desplegado ni validado en producción.

## 2026-09-29 — Superficies renacentistas y ornamentación rococó

- A petición del usuario se mantiene la paleta tinta/mármol/oro y se reemplaza la sensación de cards de app moderna por marcos dobles, filetes interiores, esquinas alternas y pequeños motivos de filigrana.
- La ornamentación se aplica a paneles principales y elementos interactivos; las tablas conservan desplazamiento horizontal y los formularios se apilan en móvil.
- Revisión visual local en Posiciones, escritorio y viewport de 390 px. Esta iteración está en workspace local; no se ha desplegado.

## 2026-09-29 — Acceso del propietario confirmado y nueva identidad visual

- El propietario confirmó que pudo iniciar sesión en producción con su correo y contraseña y que sus datos se conservaron y cargaron correctamente.
- El diagnóstico de Supabase posterior al `COMMIT` muestra RLS habilitado en las cuatro tablas de cartera, una política `cartera_owner_all` dirigida a `authenticated` con `public.is_cartera_owner()`, grants CRUD a `authenticated` y ninguna concesión de tabla a `anon` en el resultado inspeccionado.
- Los registros públicos están desactivados. `FORCE ROW LEVEL SECURITY` aparece desactivado; la aplicación accede mediante los roles cliente de Supabase, sujetos a grants y políticas RLS.
- Actualizados README y guía operativa: el SQL de 001 queda como plantilla histórica de ensayo, no como migración pendiente para volver a ejecutar.
- Primera iteración visual grecorromana: tinta verde profunda, mármol cálido, oro antiguo, serif editorial y emblema arquitectónico Aureum. Se armonizaron navegación, login y gráficos; se eliminó una textura diagonal que restaba sobriedad.
- Revisión visual del acceso en navegador de escritorio y viewport móvil de 390 × 844; campos y acción principal quedan visibles sin scroll horizontal.
- Validación local: `npm run lint`, `npm run build` y `git diff --check` completados correctamente.
- La autenticación de UI y RLS se consideran confirmadas por la prueba aportada por el propietario; no se afirma una auditoría externa completa ni se recomienda compartir datos sensibles.

## 2026-09-29 — Navegación inicial desplegada

- Se publicó el `NavBar` y las rutas `/activos`, `/posiciones` y `/historico`, que por ahora muestran placeholders.
- Validación local: `npm run lint` y `npm run build` completados correctamente.
- Validación de producción: Vercel informó estado `Ready`; se comprobó el dashboard y la navegación en el dominio principal.
- No se ejecutó SQL ni se modificó Supabase. La migración de activos consolidados sigue pendiente de revisar el esquema real y los permisos.

## 2026-09-29 — Inspección de esquema y permisos Supabase (solo lectura)

- El usuario consultó `information_schema.columns`: `assets.id`, `assets.investment_asset_id` y `portfolio_snapshots.id` son UUID; también existe `assets.updated_at`.
- `investment_assets` ya existe, pero conserva un constraint de cuatro categorías y aún no incluye `market` ni `canonical_id` en el inventario recibido.
- `assets.investment_asset_id` ya tiene FK a `investment_assets`; `portfolio_snapshot_assets` no aparece en los resultados.
- La regla actual de borrado de la FK es `NO ACTION`, que impide borrar un activo consolidado si aún tiene posiciones vinculadas; el borrador la conserva y no ejecuta cambios si la FK es de tipo inseguro.
- Se observaron políticas `Allow all for anon` en `assets`, `investment_assets` y `portfolio_snapshots`, junto con grants anónimos CRUD y `TRUNCATE`. RLS está habilitado, pero la política `USING true` permite las operaciones indicadas por la policy; RLS no sustituye los grants ni protege de la misma forma operaciones como `TRUNCATE`.
- Se ajustó el SQL de ensayo para reconocer la FK existente y retirar política/grants `anon` de `investment_assets` y `portfolio_snapshot_assets` si se aprobara el COMMIT. No toca los grants/policies abiertos de `assets` y `portfolio_snapshots`.
- No se ejecutó SQL ni se modificó Supabase. Antes de cualquier COMMIT hay que revisar los datos actuales, decidir el acceso de la aplicación y restringir primero el acceso anónimo expuesto.
- El script `003_review_consolidated_asset_data.sql` se simplificó a una única cuadrícula para facilitar compartir todos los resultados de una vez.

## 2026-09-29 — Inventario de posiciones (solo lectura)

- Supabase informa de 0 activos en `investment_assets` y 14 posiciones en `assets`; las 14 tienen `investment_asset_id` nulo.
- La FK existente usa `NO ACTION` y se conserva para impedir borrar un activo maestro mientras tenga posiciones relacionadas.
- No hay un mapeo automático válido todavía: los objetivos previos por posición se tratarán como referencia y no se copiarán ni sumarán como objetivos consolidados sin revisión humana.
- Próximo paso: revisar localmente el inventario privado de posiciones en `docs/database/004_private_position_inventory.sql` y construir una tabla de mapeo confirmada antes de cargar activos maestros o vincular posiciones.
- No se han modificado filas ni se ejecutó la migración.

## 2026-09-29 — Alcance de acceso: propietario único

- El usuario confirma que solo él utilizará la aplicación; no se diseñará un producto multiusuario.
- Esto reduce el alcance funcional, pero no convierte en privada una app pública con clave `anon`: cualquier persona con acceso al sitio puede intentar usar los permisos abiertos de Supabase.
- La protección prevista es autenticación de propietario único más políticas RLS de mínimo privilegio, antes de guardar tesis de inversión o habilitar nuevas operaciones destructivas.
- El inventario revela que dos filas de Amazon parecen candidatas a consolidarse manualmente. El ticker `MSCI` aparece en contextos distintos y no basta para fusionarlos; el bono con ticker `NFLX` tampoco debe confundirse con acciones de Netflix.
- Los `target_weight` antiguos son valores por posición y no se copiarán automáticamente como objetivos globales. La lista detallada no se replica en este changelog para no persistir datos de cartera innecesarios.

## 2026-09-29 — Gestión inicial de activos consolidados (local; pendiente de Supabase)

- Se reemplazó el placeholder de `/activos` por un formulario para crear activos, definir objetivos globales y vincular manualmente posiciones por broker.
- La pantalla identifica posiciones sin vincular, muestra la suma de exposición y separa claramente los antiguos objetivos por fila.
- `/posiciones` permite registrar y editar posiciones; `/historico` muestra snapshots y permite borrar con confirmación.
- La autenticación de propietario único se añadió al frontend; las páginas de datos consultan Supabase solo tras iniciar sesión. El formulario no fusiona automáticamente activos.
- El respaldo incorpora el catálogo consolidado y usa formato versión 2.
- Estado de aquella iteración: código local antes de ejecutar la migración; el estado vigente y la confirmación posterior constan al inicio de este changelog y en `docs/database/005_owner_access_status.md`.
- El objetivo global de Amazon queda sin decidir: el `17%` existente solo estaba en una posición de broker y no se traslada automáticamente.
- El dashboard y la nueva consolidación asumen que los precios de posición están expresados en EUR; no se inferirá ni convertirá divisa automáticamente. Verificar valores USD, como el instrumento de oro identificado en el inventario, antes de confiar en los pesos.

## 2026-09-28 — Decisión de producto: objetivo por activo consolidado

- Se acordó que el porcentaje objetivo pertenece al activo/empresa consolidado (por ejemplo, Amazon = 15% de la cartera), no a cada posición en un broker.
- Las posiciones por broker se conservan para registrar cantidades y precios; la exposición consolidada sumará sus valores y la comparará con el valor total de cartera.
- Impacto previsto en Supabase: nueva tabla maestra de activos objetivo e identificador de referencia desde las posiciones actuales. Requiere inventario, mapeo de duplicados y migración gradual; no se ha aplicado ningún cambio de esquema ni de datos.
- La identidad se resolverá con ISIN cuando sea posible y ticker/mercado como alternativa. No se fusionarán automáticamente nombres ambiguos.
- La exposición indirecta dentro de fondos queda excluida hasta diseñar explícitamente un cálculo look-through basado en datos de composición.
- Navegación a evaluar tras validar el modelo: Dashboard, Activos y objetivos, Posiciones por broker e Histórico; páginas/rutas para secciones principales y pestañas solo para sub-vistas.
- La comparación por categoría ya desplegada es provisional y no debe interpretarse como el objetivo por empresa; se reemplazará tras diseñar y probar la migración.
- Se preparó un guion SQL de ensayo idempotente y aditivo en `docs/database/001_consolidated_assets_dry_run.sql`; termina en `ROLLBACK` y no se ha ejecutado.
- El borrador deja las nuevas tablas con RLS sin políticas para `anon` y no modifica el trigger de `assets`; hay que decidir permisos y confirmar el esquema real antes de persistirlo.
- El script supone que `portfolio_snapshots.id` es UUID y que las tablas base existen. `IF NOT EXISTS` no repara tablas parciales o con una definición divergente.
- Estado: modelo documentado y SQL preparado para revisión; sin cambios aplicados en Supabase.

## 2026-09-28 — Comparativa de pesos por categoría

- Se muestra el peso real junto al objetivo agregado de las posiciones de cada categoría.
- La desviación en puntos porcentuales solo aparece si todas las posiciones de esa categoría tienen objetivo definido; los datos incompletos se señalan como parciales.
- La interfaz aclara que la comparación es informativa y no una recomendación de compra o venta.
- Validación local: `npm run lint` y `npm run build` completados correctamente.
- Validación de producción: despliegue Ready y panel comprobado con posiciones reales; queda confirmar que los objetivos asignados reflejan la política de inversión vigente.

## 2026-09-28 — Exportación manual de respaldo

- Se añadió la descarga de un JSON con posiciones e histórico, con versión de formato y fecha de exportación.
- La descarga se deshabilita si no se pudieron leer ambas tablas, para evitar generar intencionadamente una copia incompleta.
- El archivo contiene datos patrimoniales sin cifrar: guardarlo en una ubicación privada y protegida.
- Validación de código: `npm run lint` y `npm run build` completados correctamente.
- Validación de producción: el usuario confirmó que la descarga funciona correctamente.
- Esta iteración no implementa restauración/importación del respaldo.

## 2026-09-28 — Eliminación de posiciones (en producción; pendiente de validar la operación)

- Se añadió una confirmación explícita con el nombre de la posición, opción de cancelar y manejo de errores.
- Tras confirmar, el dashboard se actualiza si Supabase devuelve la fila eliminada; los fallos quedan visibles para el usuario.
- Validación local: `npm run lint` y `npm run build` completados correctamente.
- La interfaz está desplegada, pero no se ha ejecutado un borrado real. Revisar las políticas RLS para `anon` y probar primero con datos de prueba antes de usar la acción.

## 2026-09-28 — Pulido visual del dashboard

- Se definió un tema oscuro sobrio con acentos verde agua y mejor contraste.
- Se reorganizó el resumen patrimonial, las tarjetas por categoría, los gráficos y la tabla de posiciones.
- La tabla puede desplazarse horizontalmente en pantallas pequeñas.
- Se armonizaron los formularios y gráficos, y se mejoraron los estados de foco y el idioma/metadatos de la página.
- Validación local: `npm run lint` y `npm run build` completados correctamente.

## 2026-09-26 — Edición de posiciones

- Se añadió un formulario para modificar los datos de una posición y refrescar el dashboard después de guardar.
- Validación local: `npm run lint` y `npm run build` completados correctamente.
- Validación de producción: el usuario confirmó que la edición funciona correctamente.