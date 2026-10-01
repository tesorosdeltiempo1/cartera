# Roadmap de producto — Aureum

**Revisión:** 2026-10-01
**Estado:** autenticación y RLS aplicados; acceso del propietario confirmado en producción.  
**Horizonte:** una mejora por iteración, con evidencia verificable y sin cambios silenciosos sobre datos reales.

## Dirección de producto

Aureum es un registro privado y auditable del patrimonio familiar a largo plazo. Debe priorizar exactitud, procedencia y continuidad sobre automatizaciones llamativas. No es un broker ni un asesor financiero.

### Principios de decisión

1. **Integridad antes que sofisticación:** no calcular pesos si moneda, precio o vínculo no son fiables.
2. **Procedencia visible:** conservar origen y fecha de datos que afectan valoraciones.
3. **Cambios reversibles:** respaldar antes de importaciones, transformaciones o cambios de esquema.
4. **Consentimiento explícito:** no migrar ni reescribir datos patrimoniales de producción sin revisión del propietario.
5. **Accesibilidad antes que ornamento:** la identidad renacentista/rococó debe servir a la comprensión, no competir con ella.
6. **Iteración pequeña:** cada entrega tiene alcance, criterio de aceptación y validación de producción explícitos.

## Línea base confirmada

- Login del único propietario con Supabase Auth; el propietario confirmó que puede entrar y ver sus datos.
- Registros públicos desactivados y RLS/policies del propietario aplicados a las cuatro tablas de cartera, según diagnóstico compartido por el propietario.
- Dashboard, catálogo de activos consolidados, posiciones por broker, histórico de snapshots y exportación JSON disponibles.
- Despliegue automático desde `main` a Vercel.
- El dashboard usa EUR como moneda base. La migración 006 ya añadió moneda/fecha/fuente de precio y FX; las posiciones previas tienen esos nuevos campos sin clasificar hasta revisión manual.
- Los snapshots antiguos se conservan y no se recalculan al editar posiciones.
- El respaldo es exportación JSON; aún no existe un flujo de restauración.
- La migración 007 está aplicada y el diagnóstico 002 confirmó sus tablas, RLS, policies y permisos; el propietario confirmó que `/operaciones` está desplegada y funciona.
- El detalle de la dirección clásica Aureum y su validación está en [CHANGELOG.md](../CHANGELOG.md).
- El procedimiento de trabajo, la arquitectura actual y las precauciones de datos están en [GUIA_DE_TRABAJO.md](GUIA_DE_TRABAJO.md).

## Prioridades

### P0 — Fiabilidad de valoración y divisa · transición desplegada, clasificación pendiente

**Objetivo:** evitar que una valoración parezca precisa cuando el precio puede estar en otra divisa o no tener fecha/origen conocidos.

**Alcance propuesto:**
- Se conserva EUR como moneda base, coherente con el producto actual; inventariar sin exponer datos qué divisa corresponde a cada precio existente.
- La migración 006 añadió moneda ISO, fecha/origen del precio y tipo de cambio manual EUR por unidad con su fecha/fuente (integración automática queda fuera).
- Mantener datos existentes sin clasificar hasta revisión individual; no inferir moneda solo por ticker, broker o nombre.
- La nueva app deja las valoraciones incompletas fuera de totales EUR/snapshots, pero mantiene las cifras heredadas visibles y marcadas como moneda no confirmada; no se suman entre sí.
- Mostrar valor original y equivalente en moneda base con tipo de cambio y fecha visibles; guardar esos inputs en snapshots nuevos y no recalcular históricos.
- El propietario confirmó que [006_position_price_provenance.sql](database/006_position_price_provenance.sql) terminó con `Success. No rows returned`; el informe 002 confirma las seis columnas, `valuation_detail`, sus constraints, RLS, grants `authenticated` y ausencia de grants de tabla a `anon`.

**Criterios de aceptación:**
- Cada posición tiene moneda conocida o una advertencia accionable de dato pendiente.
- El valor en moneda base se puede reproducir a partir de cantidad, precio, moneda y tipo de cambio fechado.
- No se silencian valores desconocidos ni se aplica una tasa ficticia/implícita.
- Usuarios pueden distinguir el valor original del convertido y ver la fecha del precio/cambio.
- El esquema y constraints están inspeccionados. La transición está desplegada desde el commit `19e3acb`; la revisión automática confirmó el acceso privado de la nueva versión. La interfaz preserva cifras heredadas sin sumarlas, bloquea snapshots parciales y permite clasificar cada posición desde su edición.
- Cierre completo del P0: el propietario verifica sesión/datos en producción, revisa moneda y precio por posición, y confirma valores EUR y snapshots futuros.

**Fuera de alcance:** API de cotizaciones, conversión intradía, cambios retroactivos de snapshots, fuente cambiaria común automatizada y look-through de fondos.

### P1 — Custodia y recuperación de datos

**Objetivo:** convertir el JSON exportado en un respaldo operable y verificable.

- Documentar un procedimiento de recuperación manual probado con un conjunto ficticio.
- Diseñar importación con previsualización, validación de versión/esquema, detección de duplicados y confirmación final; nunca sobrescribir por defecto.
- Verificar que la exportación no se pueda generar como si estuviera completa cuando falló una de las consultas.
- Mantener los archivos de respaldo fuera del repositorio y protegidos localmente.

**Criterio de salida:** restauración ensayada en entorno aislado, conteos y totales reconciliados y errores de filas identificados antes de aplicar.

### P2 — Calidad del catálogo y política de inversión

**Objetivo:** que cada activo, identidad y objetivo global tenga un significado inequívoco.

- Mostrar cobertura del vínculo: vinculadas, sin vincular y posibles conflictos de identidad.
- Confirmar activos ambiguos manualmente mediante ISIN o ticker + mercado; nunca consolidar solo por nombre.
- Validar objetivos globales, detectar categorías incompletas y mostrar claramente la suma de objetivos (puede no ser 100%).
- Separar la categoría estratégica del registro de broker de la categoría maestra, y explicar cuál gobierna cada cálculo.
- Definir explícitamente si los objetivos representan pesos sobre cartera completa y cómo tratar efectivo, instrumentos no valorados y activos sin vínculo.

**Criterio de salida:** conciliación visible entre suma de posiciones, catálogo, exposición consolidada y total del dashboard, con casos no incluidos enumerados.

### P3 — Operaciones cotidianas y resiliencia

- Revisar edición y eliminación de posiciones y snapshots: confirmación contextual, resultado inequívoco, prevención de doble envío y manejo de errores de red.
- Probar operaciones destructivas primero con datos de prueba y usuario propietario; no usar cambios reales como prueba de interfaz.
- Mejorar estados de carga, vacío, error y recuperación/reintento de forma consistente.
- Añadir filtros/búsqueda de posiciones si el volumen real lo justifica.

**Ledger desplegado:** el propietario confirmó que `/operaciones` funciona en producción. La migración 007 está aplicada y el diagnóstico 002 confirmó tablas, RLS, policies y grants de funciones. Dashboard y `/operaciones` usan `get_portfolio_ledger_summary` para agregar el historial completo; 250 filas solo limitan la lista reciente. La exportación pagina y comprueba recuentos; los snapshots usan un RPC transaccional. El punto de partida del ledger no reconstruye operaciones anteriores.

**Integridad de snapshots:** `save_portfolio_snapshot` inserta resumen y detalle en una transacción; el flujo de la app queda pendiente de comprobación tras el despliegue.

**Criterio de salida:** operaciones críticas verificadas de extremo a extremo en entorno de prueba, sin pérdida accidental y con confirmación posterior.

### P4 — Sistema visual Aureum y accesibilidad

- Aplicar de forma consistente marcos, tipografía, superficies y ornamentación renacentista/rococó en las cuatro secciones.
- Restringir adornos a paneles y acciones; conservar tablas legibles, densidad útil y responsive.
- Revisar contraste, navegación por teclado, foco visible, etiquetas, lectores de pantalla y `prefers-reduced-motion`.
- Mantener números tabulares y jerarquía visual clara para distinguir dato, objetivo, desviación y advertencia.
- Refinar los gráficos existentes antes de añadir nuevos: mostrar denominador, valor y peso por categoría; hacer legibles en euros los ejes y fechas del histórico.
- Evitar leyendas automáticas y decoración que compita con los datos; preservar una lectura cómoda en móvil.

**Criterio de salida:** revisión de cada ruta en móvil y escritorio; ninguna ornamentación reduce la legibilidad, el contraste o la facilidad de completar tareas.

### P5 — Cotizaciones asistidas y frescura

Solo después de P0. Evaluar proveedor, licencias, cobertura de instrumentos y límites antes de integrarlo.

- Mostrar proveedor, hora de consulta, moneda y antigüedad del precio.
- No reemplazar un precio manual sin consentimiento; conservar una vía visible de corrección manual.
- Señalar errores, valores stale y discrepancias; no inventar precio cuando el proveedor no responde.

### P6 — Seguimiento de aportaciones y planificación

Solo cuando la base de datos y el histórico sean consistentes:

- Registrar aportaciones como flujo de capital separado de la rentabilidad/valor de mercado.
- Explorar avisos de revisión y desviación respecto a la política, siempre informativos y configurables.
- Proyecciones a largo plazo únicamente con supuestos editables, escenarios y advertencia de que no son predicciones ni recomendaciones.

### Propuesta de expansión — Tracker patrimonial completo

**Estado:** propuesta para priorizar; todavía no es una decisión de esquema ni una autorización para migrar producción.

**Visión:** pasar de seguir inversiones y caja a mostrar una imagen fiel del patrimonio neto familiar, incluyendo inmuebles y deudas, con fechas y procedencia claras. Mantener la interfaz centrada en pocas cifras comprensibles; no convertirla en un sistema contable ni en asesor financiero.

**Reglas de integración**

- `assets` sigue representando posiciones de inversión por broker; no reutilizarlo para viviendas o hipotecas. Sus objetivos de inversión no deben incluir inmuebles salvo una política futura explícita.
- Modelar inmuebles como activos patrimoniales independientes, con valor bruto, porcentaje de propiedad, fecha/fuente de valoración y moneda. Guardar solo ubicación aproximada opcional; evitar direcciones completas y datos de inquilinos.
- Modelar hipotecas y otros préstamos como pasivos separados, enlazados opcionalmente a un inmueble. Registrar saldo pendiente y fecha/fuente de ese saldo; separar porcentaje de propiedad del porcentaje de deuda atribuible al propietario.
- Calcular el patrimonio neto sin contar dos veces el capital: cartera financiera + efectivo + valor bruto atribuible de inmuebles − deuda atribuible. Mostrar también el valor bruto del inmueble y la deuda, no solo una cifra neta opaca.
- Mantener los flujos reales de caja en el libro existente `portfolio_transactions`, asociados a la cuenta y clasificados/enlazados a inmueble o préstamo. No crear un segundo libro de movimientos que duplique saldos.
- Separar amortización de principal (reduce caja y deuda, no es gasto/rentabilidad) de intereses y gastos (salidas de caja). El alquiler cobrado es entrada de caja, no una revaloración del inmueble.
- Congelar valores, deuda y proporciones en snapshots; editar hoy no debe reescribir la historia. Incluir las nuevas tablas y relaciones en el respaldo JSON antes de habilitar su uso.

**Secuencia recomendada**

1. **Definir el balance:** acordar con ejemplos ficticios qué significa patrimonio neto, cómo se tratan copropiedad y deuda compartida, y qué campos son obligatorios. Cerrar antes el P0 de divisas y ensayar restauración del respaldo (P1).
2. **Inmuebles y patrimonio neto:** crear un registro sencillo de inmueble y valoración manual fechada con procedencia. Añadirlo al snapshot y mostrar valor bruto, parte del propietario y valoración pendiente/stale. Sin rentas, proyecciones ni integraciones bancarias en esta entrega.
3. **Hipotecas y equity:** añadir el saldo del préstamo, participación de deuda y vínculo al inmueble. Presentar activos, deuda y equity de forma conciliable; no simular amortizaciones ni tasas futuras.
4. **Flujos reales:** clasificar alquileres, mantenimiento, impuestos, intereses y amortizaciones en el ledger existente. Una operación actualiza movimiento de caja y saldo de deuda relacionado en la misma transacción. Las previsiones recurrentes quedan fuera hasta definir cómo distinguir lo previsto de lo efectivamente pagado.
5. **Vista wealth tracker:** resumir patrimonio neto y su evolución; ofrecer desglose breve de inversiones, efectivo, inmuebles y deuda. Mostrar junto a cada valoración su fecha y si está incompleta o desactualizada.

**Criterio de aceptación:** con datos ficticios, total neto = activos atribuibles menos pasivos atribuibles; flujos y cambios de deuda se reconcilian con caja; snapshots históricos permanecen reproducibles; la exportación/restauración conserva cada clase; y ninguna valoración incompleta se presenta como confirmada.

**Primera entrega recomendada:** inmuebles + pasivos y patrimonio neto básico, con valoración manual y snapshots. Dejar el registro detallado de flujos como siguiente incremento: separa primero la comprensión del balance del trabajo contable de cada mes y reduce el riesgo de doble contabilización.

## Flujo de entrega y calidad

Cada incremento seguirá este ciclo:

1. Especificar problema, datos afectados, alcance/no alcance y aceptación.
2. Inspeccionar el estado real sin escribir en producción.
3. Preparar respaldo y migración solo si hacen falta cambios de esquema.
4. Implementar con datos ficticios o entorno aislado.
5. Ejecutar `npm run lint`, `npm run build` y pruebas/manual QA relevantes.
6. Revisar accesibilidad, móvil, sesión cerrada y sesión de propietario.
7. Desplegar desde `main` solo tras validar; revisar logs y comportamiento de producción.
8. Actualizar este roadmap y el changelog con resultado y limitaciones reales.

No incluir contraseñas, tokens, UID del propietario ni datos financieros por fila en Git, issues o documentación pública.
