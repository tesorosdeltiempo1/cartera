# Roadmap de producto — Aureum

**Revisión:** 2026-11-06
**Estado:** autenticación y RLS aplicados; acceso del propietario confirmado en producción.  
**Horizonte:** una mejora por iteración, con evidencia verificable y sin cambios silenciosos sobre datos reales.

## Dirección de producto

Aureum es un registro patrimonial privado, de propietario único, para conocer qué se posee y se debe, de dónde sale cada cifra y qué ha cambiado entre cortes. Debe priorizar exactitud, procedencia y continuidad sobre automatizaciones llamativas. No es un broker ni un asesor financiero.

### Principios de decisión

1. **Integridad antes que sofisticación:** no calcular pesos si moneda, precio o vínculo no son fiables.
2. **Procedencia visible:** conservar origen y fecha de datos que afectan valoraciones.
3. **Cambios reversibles:** respaldar antes de importaciones, transformaciones o cambios de esquema.
4. **Consentimiento explícito:** no migrar ni reescribir datos patrimoniales de producción sin revisión del propietario.
5. **Claridad antes que ornamento:** la identidad debe transmitir confianza y facilitar una revisión, no competir con las cifras.
6. **Iteración pequeña:** cada entrega tiene alcance, criterio de aceptación y validación de producción explícitos.

### Dirección visual de la interfaz

- La referencia es una herramienta privada de gestión patrimonial: sobria, precisa, silenciosa y editorial; no una fantasía de riqueza ni un panel de trading.
- Mantener tema oscuro neutro, tipografía editorial limitada a titulares, acento bronce restringido y superficies sin marcos decorativos.
- Usar una única cifra dominante en HOME; junto a ella, indicar la naturaleza del total, fecha del último corte y cualquier limitación que cambie su lectura.
- Mantener navegación lateral, iconografía vectorial funcional y estados activos comprensibles; nunca representar acciones con emojis o caracteres ornamentales.
- Unificar jerarquía, campos, tablas, estados y ritmo entre las seis rutas; la responsividad y la accesibilidad son requisitos, no concesiones.
- Guía de voz, identidad visual, formularios y contrato de datos: [BRAND_GUIDE.md](BRAND_GUIDE.md).

### Potencial de producto y límites

**Visión:** un expediente patrimonial privado, consolidado y portable que responda con evidencia a cuatro preguntas: qué poseo, qué debo, cómo se formó cada cifra y qué ha cambiado desde el último corte.

La capacidad debe crecer por capas verificables:

1. **Balance fiable:** inversiones, efectivo, inmuebles y pasivos con titularidad, valoración fechada, procedencia, cobertura y tratamiento explícito de partidas desconocidas. La suma debe reconciliarse con sus componentes.
2. **Registro auditable:** ledger de caja, operaciones y flujos inmobiliarios vinculados a su fuente; correcciones reversibles; importación asistida con previsualización, detección de duplicados y conciliación contra extractos.
3. **Gobierno del patrimonio:** política de objetivos versionada, desviaciones explicables y compromisos recurrentes informativos. Las vistas por titular o el acceso de otras personas requieren un modelo de permisos explícito; no forman parte del uso actual.
4. **Perspectiva y continuidad:** snapshots comparables, informes exportables, respaldo restaurable probado y escenarios editables que separen supuestos de hechos y no se presenten como predicciones.

**Enfoque inmediato:** mejorar continuidad, conciliación y trazabilidad sin exigir que todas las posiciones tengan datos de cotización completos. EUR estimado es una vía válida para uso personal; la valoración detallada queda disponible cuando aporta precisión. No se añadirá por ahora una revisión mensual guiada: queda aplazada por decisión del propietario.

**Condiciones de expansión:** cada nueva clase de activo debe definir titularidad, valoración, liquidez, pasivos asociados, fuente, antigüedad y fórmula de atribución antes de entrar en el total. La incorporación de familiares, asesores, cuentas conectadas, OCR o precios automáticos exige revisión específica de privacidad, consentimiento, seguridad, licencia y modelo de permisos; no se infiere autorización por el carácter privado de la app.

**Fuera de propósito:** ejecutar compras o pagos, recomendar productos, prometer rentabilidad, inferir monedas o valores, atribuir datos no confirmados o convertir Aureum en una contabilidad fiscal certificada.

## Línea base confirmada

- Login del único propietario con Supabase Auth; el propietario confirmó que puede entrar y ver sus datos.
- Registros públicos desactivados y RLS/policies del propietario aplicados a las cuatro tablas de cartera, según diagnóstico compartido por el propietario.
- Dashboard, catálogo de activos consolidados, posiciones por broker, efectivo y ledger, patrimonio inmobiliario, histórico de snapshots y exportación JSON implementados. La existencia de una ruta o de código en `main` no sustituye la comprobación de cada flujo autenticado en producción.
- Despliegue automático desde `main` a Vercel.
- El dashboard usa EUR como moneda base. La migración 006 añadió moneda/fecha/fuente de precio y FX; las posiciones previas pueden seguir sin clasificar hasta revisión manual.
- Los snapshots antiguos se conservan y no se recalculan al editar posiciones.
- Posiciones admite estimaciones directas en EUR y señala las que superan 90 días o carecen de fecha. El aviso no modifica la valoración ni constituye una política universal de frescura.
- La importación CSV asistida está implementada: analiza localmente, presenta una vista previa y deja seleccionar filas; su aplicación es fila a fila, puede quedar parcial y el acta se descarga localmente. No interpreta formatos originales de brokers ni persiste el acta. La validación autenticada de producción sigue siendo una comprobación separada.
- El respaldo JSON incluye las diez tablas consultadas por la aplicación y comprueba los conteos de las páginas. No existe restauración desde la app y no se ha ensayado una recuperación completa en una base aislada.
- Las migraciones 007–013 y los estados confirmados de Supabase constan en el historial del proyecto y en [005_owner_access_status.md](database/005_owner_access_status.md). Los cortes históricos agregados no reconstruyen posiciones por operación ni garantizan cobertura inmobiliaria.
- El detalle de la dirección clásica Aureum y su validación está en [CHANGELOG.md](../CHANGELOG.md).
- El procedimiento de trabajo, la arquitectura actual y las precauciones de datos están en [GUIA_DE_TRABAJO.md](GUIA_DE_TRABAJO.md).

## Prioridades

### P0 — Fiabilidad de valoración y divisa · base desplegada, revisión de datos pendiente

**Objetivo:** evitar que una valoración parezca precisa cuando el precio puede estar en otra divisa o no tener fecha/origen conocidos.

**Alcance propuesto:**
- Se conserva EUR como moneda base, coherente con el producto actual; inventariar sin exponer datos qué divisa corresponde a cada precio existente.
- La migración 006 añadió moneda ISO, fecha/origen del precio y tipo de cambio manual EUR por unidad con su fecha/fuente (integración automática queda fuera).
- Mantener datos existentes sin clasificar hasta revisión individual; no inferir moneda solo por ticker, broker o nombre.
- La app deja las valoraciones incompletas fuera de totales EUR/snapshots verificables, pero mantiene las cifras heredadas visibles y marcadas como moneda no confirmada; la estimación directa en EUR permite una vía de uso más sencilla.
- Mostrar valor original y equivalente en moneda base con tipo de cambio y fecha visibles; guardar esos inputs en snapshots nuevos y no recalcular históricos.
- El propietario confirmó que [006_position_price_provenance.sql](database/006_position_price_provenance.sql) terminó con `Success. No rows returned`; el informe 002 confirma las seis columnas, `valuation_detail`, sus constraints, RLS, grants `authenticated` y ausencia de grants de tabla a `anon`.

**Criterios de aceptación:**
- Cada posición tiene moneda conocida o una advertencia accionable de dato pendiente.
- El valor en moneda base se puede reproducir a partir de cantidad, precio, moneda y tipo de cambio fechado.
- No se silencian valores desconocidos ni se aplica una tasa ficticia/implícita.
- Usuarios pueden distinguir el valor original del convertido y ver la fecha del precio/cambio.
- El esquema y constraints están inspeccionados; la migración 013 habilita estimaciones EUR y snapshots con calidad desglosada. La interfaz preserva cifras heredadas sin sumarlas, bloquea snapshots financieros sin importe y permite clasificar cada posición desde su edición.
- Cierre completo del P0: el propietario verifica sesión/datos en producción, revisa moneda y precio por posición, y confirma valores EUR y snapshots futuros.

**Fuera de alcance:** API de cotizaciones, conversión intradía, cambios retroactivos de snapshots, fuente cambiaria común automatizada y look-through de fondos.

### P1 — Custodia y recuperación de datos · pendiente

**Objetivo:** demostrar que el JSON exportado puede validarse y recuperarse sin riesgo para la cartera real.

- La exportación paginada exige datos y conteo exacto estable para cada tabla; las pruebas cubren paginación, falta de datos/conteo, cambios de total y resultados parciales.
- El panel local permite seleccionar un JSON y comprobar su versión, tablas requeridas, identificadores, referencias internas y conciliación aritmética de los cortes de patrimonio; no envía el archivo ni escribe en la base de datos. Esto verifica estructura, no autenticidad, actualidad, equivalencia con producción ni restaurabilidad.
- La exportación lee tablas por separado y no fija una instantánea transaccional; un reemplazo concurrente que mantenga el mismo conteo puede pasar inadvertido. Diseñar una fuente coherente de respaldo antes de implementar restauración.
- Antes de restaurar, validar versión y forma del esquema, integridad referencial, duplicados, orden de inserción y recuentos; generar un informe de diferencias y no sobrescribir por defecto.
- Ensayar exportación, restauración y nueva exportación en un proyecto Supabase desechable separado de producción. No usar credenciales de producción ni cargar datos reales en fixtures.
- No afirmar que existe recuperación operativa hasta comparar los datos antes y después y documentar los límites que no se puedan restaurar.
- Mantener los archivos de respaldo fuera del repositorio y protegidos localmente.

**Criterio de salida:** restauración ensayada en entorno aislado; conteos, referencias y totales reconciliados; errores identificados antes de cualquier aplicación; procedimiento repetible por el propietario.

### P1b — Importación asistida y conciliación de posiciones

**Objetivo:** reducir la transcripción sin tratar extractos, informes agregados e inferencias como datos intercambiables.

La primera etapa está implementada en el código actual: acepta el CSV común de Aureum, lo analiza en el navegador, propone coincidencias por broker + ticker o broker + nombre y presenta cambios por fila, bloqueos y suma de valoraciones. El usuario elige las filas y confirma. No se borran posiciones ausentes ni se modifican vínculos, objetivos, ledger o snapshots. El acta JSON es descargable, pero no se almacena en la base de datos; la aplicación por varias filas no es transaccional. La interpretación de formatos originales de brokers sigue fuera de alcance.

**Siguientes pasos antes de darla por terminada:**

- Validar con extractos ficticios; confirmar el despliegue y el flujo autenticado antes de considerarla disponible en producción. No probar contra datos reales sin confirmación y respaldo reciente.
- Evaluar un adaptador por formato/versión de cada broker solo cuando exista un ejemplo no sensible y se conozcan sus convenciones de unidades, efectivo, moneda y fecha.
- Diseñar un registro de importación persistido y una aplicación transaccional con RPC antes de prometer auditoría duradera o importaciones grandes. Un fallo de fila debe cancelar el lote completo.
- No extraer de PDF los totales agregados como si fueran filas ni actualizar posiciones desde narrativas sin extractos originales.

**Criterio de salida:** cada dato importado tiene fuente y fecha revisables; la suma se etiqueta como parcial si faltan valoraciones; discrepancias se muestran, no se fuerzan; cambios y bloqueos se explican antes de escribir; y el acta/backup permite reconstruir qué se aplicó.

**Medida de éxito:** menos correcciones manuales repetidas y ninguna discrepancia de conciliación silenciada. Medir con fixtures y pruebas del propietario, no mediante telemetría de datos financieros.

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
- `/historico` permite reintentar la carga; ignora respuestas obsoletas de consultas concurrentes. Los envíos rápidos de snapshot y respaldo se serializan para evitar duplicados.
- Posiciones ya tiene filtros/búsqueda; `/operaciones` filtra los 250 movimientos recientes por texto y tipo, sin hacer pasar esa ventana por el historial completo.

**Ledger desplegado:** el propietario confirmó que `/operaciones` funciona en producción. La migración 007 está aplicada y el diagnóstico 002 confirmó tablas, RLS, policies y grants de funciones. Dashboard y `/operaciones` usan `get_portfolio_ledger_summary` para agregar el historial completo; 250 filas solo limitan la lista reciente. La exportación pagina y comprueba recuentos; los snapshots usan un RPC transaccional. El punto de partida del ledger no reconstruye operaciones anteriores.

**Integridad de snapshots:** `save_portfolio_snapshot` inserta resumen y detalle en una transacción; 012 añade snapshots históricos agregados con procedencia y valida que el total coincida con el desglose. La inserción histórica se verificó en Supabase; queda comprobar el formulario tras el despliegue.

El snapshot del 22-oct se basa en los totales por broker/cuenta del informe v3 y no constituye un inventario por posición ni un balance patrimonial completo. El Plan 2026–2030 es la referencia de política vigente. Los datos inmobiliarios y de hipotecas siguen pendientes.

**Criterio de salida:** operaciones críticas verificadas de extremo a extremo en entorno de prueba, sin pérdida accidental y con confirmación posterior.

**Incremento preparado para despliegue:** 010 añade traspasos atómicos entre cuentas de la misma moneda y reversiones auditables; 011 añade planes semanales/mensuales informativos que no generan cargos ni movimientos. El respaldo JSON incluye los planes. Migraciones aplicadas y grants/RLS comprobados; después del despliegue, probar con datos ficticios antes de registrar operaciones reales.

**Resiliencia local:** `/operaciones` ofrece reintento explícito de carga y búsqueda/filtro en la lista de 250 movimientos recientes. El resumen sigue calculándose sobre el ledger completo; los filtros no cambian cifras ni datos.

**Pruebas y dependencias:** `npm test` cubre calendario semanal/mensual, entradas inválidas, cálculo de venta, resumen de caja, rentabilidad y filtros. Next.js y su configuración ESLint se actualizaron a 16.4.5; `npm audit --omit=dev` reporta cero vulnerabilidades. El árbol de desarrollo aún informa avisos moderados de `minimatch`; no se forzó una actualización incompatible del linter.

### P4 — Sistema visual Aureum y accesibilidad

- Aplicar la guía de marca en las seis rutas: voz sobria, sin emojis ni filigranas, jerarquía y superficies consistentes.
- Dar a cada campo una etiqueta persistente, unidad, reglas de validación visibles, estados de guardado y confirmación; conservar valores ante errores.
- Mostrar cobertura, asignación objetivo y exposición no clasificada antes de interpretar una desviación.
- Representar snapshots con eje temporal real y escala vertical que incluya cero; distinguir valor nominal de rentabilidad y ofrecer valores exactos accesibles.
- Revisar foco, teclado, lectores de pantalla, contraste y estados de carga/vacío/error en anchos móvil y escritorio.
- Auditoría local actual: se normalizan los controles y encabezados, se eliminan adornos heredados, se precisa la comparación de objetivos y se corrige la lectura del gráfico histórico. La revisión visual autenticada sigue pendiente para las seis rutas; no cerrar P4 con una captura de login o una ruta pública como sustituto.

**Criterio de salida:** revisión de cada ruta en móvil y escritorio; ninguna ornamentación reduce la legibilidad, el contraste o la facilidad de completar tareas.

### P5 — Cotizaciones asistidas y frescura

Solo después de P0. Evaluar proveedor, licencias, cobertura de instrumentos y límites antes de integrarlo.

- Mostrar proveedor, hora de consulta, moneda y antigüedad del precio.
- No reemplazar un precio manual sin consentimiento; conservar una vía visible de corrección manual.
- Señalar errores, valores stale y discrepancias; no inventar precio cuando el proveedor no responde.

### P6 — Seguimiento de aportaciones y planificación

La migración 011 y la interfaz de planes están implementadas; los planes son informativos y no ejecutan compras ni cargos. La comprobación de uso autenticado en producción debe confirmarse antes de darla por validada.

No añadir ahora una revisión mensual guiada ni avisos periódicos de desviación: quedan aplazados a petición del propietario. Las proyecciones solo se reconsiderarán si aportan valor cotidiano y separan con claridad supuestos de hechos.

### Patrimonio inmobiliario y flujos · modelo implementado

Las migraciones 008–009 separan inmuebles e hipotecas de las posiciones financieras y registran alquileres, gastos y pagos hipotecarios en el ledger existente. El valor bruto atribuible y la deuda atribuible se conservan por separado; amortización de principal reduce caja y deuda, mientras que intereses y gastos son salidas de caja. Los snapshots conservan los valores del momento y el respaldo incluye estas tablas.

**Pendiente de validar:** conciliación integral con datos ficticios y restauración en un entorno aislado. No interpretar snapshots patrimoniales como rentabilidad y no afirmar cobertura completa hasta reconciliar cada clase de activo y pasivo.

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
