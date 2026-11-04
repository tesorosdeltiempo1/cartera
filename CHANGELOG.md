# Registro de cambios

Este archivo recoge las iteraciones funcionales y visuales por separado del README. Las fechas indican cuándo se implementó cada cambio; no implican por sí mismas que esté desplegado ni validado en producción.

## 2026-11-04 — Portada brutalista de mármol (interfaz)

- La navegación reúne las seis secciones en un menú desplegable que muestra la ruta activa.
- La HOME prioriza el total patrimonial en una cifra monumental sobre mármol con vetas y grietas; composición, rentabilidad, evolución, respaldo y alertas quedan en desplegables independientes.
- Gráficos, objetivos y cifras usan tinta oscura sobre las nuevas superficies claras. No cambian cálculos ni se añaden recursos de imágenes externos.
- `npm test` (10/10), lint, build y `git diff --check` pasan. Vercel marcó `63121fd` como `Ready`; las seis rutas responden HTTP 200. No fue posible inspeccionar el dashboard tras iniciar sesión en esta sesión; queda pendiente la revisión visual autenticada en móvil y escritorio.

## 2026-11-04 — Integridad de respaldos y recuperación del histórico (producción)

- La exportación JSON ahora exige respuesta de datos y conteo exactos en todas las páginas; si el total falta, cambia o no coincide, cancela en vez de ofrecer una copia incompleta.
- Se evita iniciar exportaciones o guardar snapshots históricos dos veces por envíos rápidos; `/historico` permite reintentar la lectura y descarta respuestas antiguas cuando hay cargas concurrentes.
- `npm test` pasa 10/10; lint, build de producción y `git diff --check` pasan. Vercel marcó `dd7d07b` como `Ready`; `/`, `/historico`, `/operaciones` y `/patrimonio` responden HTTP 200. No se usaron credenciales ni se escribieron datos.
- Límite conocido: el respaldo pagina tablas por separado. Los conteos detectan cambios de cardinalidad, pero no garantizan una instantánea transaccional ante cambios concurrentes que mantengan el mismo total.

## 2026-11-04 — Snapshots históricos agregados (desplegado en producción)

- Añadida una captura histórica fechada por broker con fuente y validación de que el total coincide con el desglose; no crea posiciones ni modifica valoraciones actuales o snapshots anteriores.
- Las migraciones 010–012 se aplicaron en Supabase; la comprobación de solo lectura confirmó los objetos, RLS de planes y permisos de `authenticated`/`anon` esperados.
- Se guardó el snapshot del 22-oct-2026 a partir de totales agregados por broker/cuenta del informe v3. No se crearon posiciones ni se modificaron valoraciones actuales; el registro no incluye inmuebles ni hipotecas.
- El Plan 2026–2030 se conserva como política vigente.
- El commit `77a63ec` se desplegó desde `main`; Vercel lo marcó `Ready`. En `/historico`, una sesión propietaria ya activa cargó el formulario agregado. No se enviaron datos ni se modificó producción; queda pendiente probar el guardado con una operación de prueba controlada.

## 2026-11-04 — Pruebas repetibles y actualización de seguridad (local)

- Añadida suite `npm test` con ocho casos sobre fechas, validación de calendario, cálculo de ventas, caja, rentabilidad, búsqueda y snapshots históricos agregados; búsqueda ignora diferencias de acentos.
- El calendario rechaza fechas imposibles y frecuencias/valores inválidos en vez de mostrar una fecha ficticia; los planes vencidos se distinguen claramente.
- La revisión SQL de 010 detectó y corrigió localmente que un traspaso fechado con un cambio antiguo no debe reemplazar el cambio vigente de las cuentas.
- Actualizados `next` y `eslint-config-next` a 16.4.5, parche indicado por npm para los advisories críticos/altos de la versión anterior; actualizadas dependencias transitivas con `npm audit fix` sin `--force`.
- `npm audit --omit=dev` informa cero vulnerabilidades. La auditoría completa aún informa 16 vulnerabilidades moderadas en el árbol de desarrollo asociadas a `minimatch`; no se forzó un downgrade incompatible de ESLint.
- Smoke test local del acceso en navegador a 390 px: login visible y sin desbordamiento horizontal. No se usaron credenciales; falta sesión propietaria y pruebas de integración SQL en Supabase aislado. No se modificó producción.

## 2026-11-04 — Traspasos, correcciones auditables y planes previstos (local; esquema aplicado)

- Preparadas y aplicadas en Supabase las migraciones 010 (traspasos atómicos y reversiones) y 011 (planes semanales/mensuales); la interfaz web aún no está desplegada.
- La interfaz permite trasladar efectivo entre cuentas de la misma moneda y revertir movimientos elegibles sin borrar el original. Cada reversión exige motivo; transferencias se revierten por ambas cuentas juntas.
- `/operaciones` incorpora planes previstos con próxima fecha y pausa/reanudación; son recordatorios y no crean operaciones, compras ni cargos.
- El historial reciente permite buscar por activo, broker o nota y filtrar por tipo; muestra claramente que opera sobre una ventana de 250 registros y añade reintento ante errores de carga.
- El respaldo JSON pagina y comprueba recuentos también para planes; se corrigen etiquetas para movimientos inmobiliarios y transferencias.
- Validación local: `npm run lint`, `npm run build`, `git diff --check` y tres casos de calendario (semanal, mensual y fin de vigencia) pasan.
- Pendiente tras despliegue: probar con datos ficticios transferencias, reversiones y planes antes de registrar operaciones reales.

## 2026-10-01 — Flujos inmobiliarios migrados

- Añadida migración 009 para registrar alquileres, gastos y pagos hipotecarios en el ledger de caja existente.
- El pago hipotecario conserva total/principal/interés; el principal reduce la deuda en la misma transacción y los flujos inmobiliarios no se mezclan con el P&L bursátil.
- El propietario aplicó 009; el diagnóstico 002 confirma columnas, constraints, RLS/policy y `EXECUTE` solo para `authenticated`.
- Formulario e historial local pasan lint/build; falta publicar y probar con un movimiento ficticio en producción.

## 2026-10-01 — Balance inmobiliario aprobado y migrado

- Aprobado el desarrollo de una primera vista de patrimonio con inmuebles, hipotecas, participación atribuible, valoración manual y snapshots separados del histórico de cartera.
- El propietario aplicó la migración aditiva 008; el diagnóstico 002 confirma tablas, RLS, policies y permisos de funciones.
- La ruta `/patrimonio`, formularios y resumen neto pasan `npm run lint` y `npm run build`; publicado en `main` como `e0cef85`, pendiente de confirmación funcional en producción.
- Rentas, gastos y amortizaciones quedan fuera de esta fase.

## 2026-10-01 — Gráficos patrimoniales más legibles

- La composición por categoría muestra el total EUR al centro y una leyenda con valor y porcentaje, con colores estables por categoría.
- La evolución patrimonial usa área sutil, escala en EUR y fechas con año; el cursor muestra el importe y la fecha completa.
- Sin métricas nuevas ni cambios en los datos. `npm run lint` y `npm run build` pasan; falta revisión visual en navegador y confirmación de esta versión en producción.

## 2026-10-01 — Ledger desplegado y revisión de posiciones

- El propietario confirmó que el ledger está desplegado y funciona correctamente.
- Posiciones incorpora filtros `Todas`, `Pendientes` y `Valoradas`, recuentos y búsqueda por posición, ticker, broker o activo consolidado.
- La revisión manual conserva el control del usuario: no infiere ni modifica moneda, precio o cambio.

## 2026-09-30 — Lenguaje sencillo para moneda y procedencia

- Reemplazado el campo técnico de moneda por una lista con nombres cotidianos y códigos tal como aparecen en el broker; incluye una entrada para otras monedas.
- Los orígenes de precio y cambio son opciones habituales; solo se escribe texto libre al elegir «Otra».
- El tipo de cambio ahora pregunta «¿Cuántos euros vale una unidad de USD?» e incluye un ejemplo de entrada. La fecha del cambio sigue la del precio si el usuario confirma que son el mismo día; en caso contrario se pide por separado.
- La ficha común se reutiliza en alta y edición para mantener iguales etiquetas, validaciones y comportamiento. Cambios locales, sin escritura ni despliegue a producción.

## 2026-09-29 — Superficies renacentistas y ornamentación rococó

- A petición del usuario se mantiene la paleta tinta/mármol/oro y se reemplaza la sensación de cards de app moderna por marcos dobles, filetes interiores, esquinas alternas y pequeños motivos de filigrana.
- La ornamentación se aplica a paneles principales y elementos interactivos; las tablas conservan desplazamiento horizontal y los formularios se apilan en móvil.
- Revisión visual en Posiciones, escritorio y viewport móvil de 390 px.
- Desplegado desde `main` en el commit `ee6c085`; el acceso Aureum se confirmó en el dominio de producción.

## 2026-09-29 — Roadmap profesional por fases

- Se sustituye la lista breve de mejoras por un roadmap con estado confirmado, prioridades, alcance, criterios de salida y procedimiento de calidad/publicación.
- Siguiente incremento propuesto: precisión monetaria y trazabilidad de precios (moneda explícita, fecha y procedencia), sin inferir datos antiguos ni alterar snapshots.
- El documento está en `docs/ROADMAP.md`; no se modificaron datos ni esquema de producción.

## 2026-09-29 — P0: procedencia de precios y valoración en EUR (desarrollo local)

- Trazado el flujo de precio desde alta/edición a dashboard, exposiciones, snapshots e histórico. Hasta ahora se sumaba `quantity × current_price` y se formateaba como EUR sin dato de moneda, fecha u origen.
- Añadido un validador que excluye de totales las posiciones sin moneda, precio fechado/fuente o cambio manual cuando la moneda no es EUR; dashboard y catálogo muestran valoraciones parciales y se bloquean snapshots incompletos.
- Los formularios de alta/edición solicitan moneda explícita, fecha/origen de cotización y, para moneda extranjera, EUR por unidad con fecha/fuente. Las valoraciones confirmadas se muestran en posiciones y activos.
- Los snapshots nuevos conservan los inputs de valoración por posición; los snapshots previos permanecen intactos. El respaldo pasa a formato 4.
- La migración aditiva `docs/database/006_position_price_provenance.sql` terminó con `Success. No rows returned`; el diagnóstico 002 confirmó columnas, constraints y que las policies/grants del propietario siguen intactos.
- La UI conserva a la vista las cifras heredadas pero no las etiqueta ni suma como EUR hasta su clasificación manual; los snapshots incompletos quedan bloqueados.
- Desplegada desde `main` en el commit `19e3acb`; se confirmó en el dominio de producción la pantalla privada de acceso de la nueva versión.
- Próximo paso: el propietario verifica la sesión y clasifica las posiciones existentes mediante edición autenticada; no inferir monedas ni enviar importes patrimoniales al chat.

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