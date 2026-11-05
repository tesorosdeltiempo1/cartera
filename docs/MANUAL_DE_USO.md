# Manual de uso de Aureum

**Revisión:** 5 de noviembre de 2026

**Propósito:** registrar y revisar patrimonio privado con datos verificables.

**Acceso:** cuenta privada del propietario.

## 1. Qué hace Aureum

Aureum reúne posiciones financieras, efectivo, inmuebles y deuda que registres. Permite documentar valoraciones, agrupar posiciones bajo activos consolidados, registrar movimientos reales, revisar cortes históricos y descargar un respaldo.

No es un broker, no ejecuta compras ni pagos ni ofrece asesoramiento financiero, fiscal ni contable. Las posiciones se pueden registrar manualmente o preparar mediante una importación asistida CSV con revisión y confirmación; Aureum no descarga datos de los brokers ni interpreta automáticamente sus formatos particulares. Los precios, cambios de divisa, valoraciones inmobiliarias y saldos hipotecarios se introducen desde fuentes consultadas por el propietario.

## 2. Antes de empezar

- Ten a mano los extractos o datos de tus brokers y bancos. Comprueba el nombre del instrumento, la cantidad y la moneda directamente en la fuente.
- Decide qué fecha representa cada precio, valoración o saldo. Guarda también su origen.
- No deduzcas la moneda a partir del ticker, el nombre o el broker. Si no puedes confirmarla, deja la valoración pendiente.
- No hace falta registrar direcciones de inmuebles. Usa un nombre de referencia que no revele más información personal de la necesaria.
- Antes de cambios importantes, descarga un respaldo JSON y guárdalo en una ubicación privada.

Los valores de ejemplo que aparezcan en un formulario son ilustrativos; sustitúyelos por los datos que hayas verificado.

## 3. Acceso y navegación

1. Abre la dirección de Aureum y accede con el correo y la contraseña de la cuenta autorizada.
2. Usa el menú lateral para abrir **Resumen**, **Activos y objetivos**, **Posiciones**, **Patrimonio**, **Operaciones** o **Histórico**.
3. Usa **Cerrar sesión** al terminar, especialmente en un dispositivo compartido.

Si no puedes acceder, comprueba el correo y la contraseña. La aplicación no ofrece registro público ni un formulario de recuperación de contraseña; utiliza el canal de administración de la cuenta si necesitas restablecer el acceso.

## 4. Orden recomendado para configurar la cartera

Para obtener cifras coherentes, configura primero las posiciones y sus valoraciones, después consolídalas y, si procede, inicia el ledger:

1. Añade una fila por cada tenencia que quieras seguir en **Posiciones**.
2. Para una primera lectura, basta con registrar un valor total aproximado en EUR; las unidades también pueden quedar vacías si no las conoces.
3. Si quieres una valoración calculada desde una cotización, añade unidades, precio, moneda, fecha y fuente. Para moneda extranjera, registra además el cambio a EUR.
4. En **Activos y objetivos**, crea un registro maestro para cada instrumento que quieras consolidar.
5. Vincula manualmente cada posición al activo maestro correcto y define el objetivo global si ya está decidido.
6. Si quieres seguimiento de movimientos y resultados desde hoy, revisa el saldo inicial y comienza el seguimiento desde **Operaciones**.
7. Registra inmuebles y pasivos por separado en **Patrimonio**.
8. Revisa qué importes son estimados y qué posiciones siguen sin valor antes de guardar cortes.

La estimación es una cifra manual orientativa, no una cotización convertida. No se usa para la rentabilidad del ledger. Añade datos detallados cuando necesites más precisión; no inventes unidades ni cambios.

## 5. Resumen

La portada muestra un total orientativo de posiciones y efectivo: suma valoraciones con referencias completas y estimaciones manuales en EUR. Indica por separado los importes estimados y las posiciones sin importe, que quedan fuera. No representa por sí sola el patrimonio neto completo: los inmuebles y las hipotecas se consultan en **Patrimonio**.

La lectura inicial ordena la composición por categoría y las mayores exposiciones registradas. Las estimaciones participan en esos importes y se identifican en Posiciones y en las exposiciones consolidadas. El porcentaje se calcula sobre el total orientativo; la lista agrupa posiciones vinculadas al mismo activo maestro y muestra por separado las que siguen sin consolidar. No mide exposiciones indirectas dentro de fondos ni el apalancamiento o riesgo de emisor de derivados. El rango de fechas describe las referencias completas; no implica que sean cotizaciones de hoy.

Las secciones desplegables permiten revisar:

- **Revisión de datos:** posiciones sin consolidar o con valoración incompleta.
- **Composición:** importes por categoría y comparación con objetivos cuando hay activos consolidados.
- **Rentabilidad:** resultados realizados y no realizados que cubre el ledger.
- **Evolución:** cortes puntuales guardados; no es una rentabilidad ajustada por aportaciones y retiradas.
- **Respaldo privado:** descarga de los datos registrados.

**Guardar corte de hoy** conserva una fotografía de la cartera y el efectivo actuales, separando importes con referencias y estimaciones manuales. No se guarda mientras haya posiciones sin ningún importe conocido. No incluye inmuebles ni deuda hipotecaria; para eso usa **Guardar corte patrimonial** en Patrimonio, que sigue exigiendo valoraciones completas.

### Cómo leer el total y los gráficos

- El total orientativo suma posiciones con cotización y conversión completas, estimaciones manuales directas en EUR y efectivo convertido con el tipo de cambio registrado.
- Las estimaciones se identifican y conservan por separado en cortes nuevos; no son cotizaciones, no se usan para la rentabilidad del ledger y pueden diferir del valor realizable.
- Una posición sin importe estimado ni valoración completa queda fuera del total.
- La composición describe importes registrados por categoría; no descubre exposiciones indirectas dentro de fondos.
- La comparación de objetivos informa cuántos activos tienen objetivo y cuánto valor cubre la comparación. Las posiciones sin activo consolidado se excluyen y el efectivo no tiene un objetivo configurable en esta pantalla.
- Un gráfico histórico representa importes registrados en fechas concretas. No descuenta aportaciones, retiradas, comisiones ni cambios en la cobertura de los datos.

## 6. Posiciones por broker

Cada fila es una tenencia individual en un broker. Si el mismo instrumento está en dos brokers, registra dos posiciones distintas y luego vincula ambas al mismo activo consolidado.

### Añadir una posición

1. Completa nombre, broker o custodio y categoría.
2. Si no conoces las unidades, puedes dejarlas vacías. Añade **Valor total aproximado (€)** para incluir una estimación; la app fecha automáticamente cuándo la registras.
3. Para una valoración detallada, despliega **Añadir precio, divisa y referencias** e introduce unidades y precio por unidad. La fecha y fuente del precio y el cambio EUR se exigen solo para usar esa cotización como valoración con referencias.
4. Guarda. Una cotización completa tiene prioridad sobre la estimación; si no la hay, se utiliza la estimación manual cuando existe.

Una posición sin estimación ni cotización puede guardarse, pero queda fuera del total orientativo hasta que añadas un importe. Las posiciones con operaciones del ledger requieren unidades y mantienen la valoración detallada; las estimaciones no cambian su rentabilidad.

Para una moneda extranjera, el cambio se introduce como **EUR por una unidad de la moneda original**. Por ejemplo, si 1 USD equivale a 0,92 EUR, introduce 0,92; no su inverso. La valoración en euros se deriva de las unidades, el precio y ese cambio registrado.

### Revisar o buscar posiciones

- Al abrir **Posiciones**, el resumen distingue importes con referencias, estimaciones manuales, posiciones sin importe y vínculos resolubles. El total orientativo excluye efectivo e inmuebles; no lo interpretes como patrimonio completo.
- Usa **Todas**, **Pendientes**, **Valoradas**, **Estimadas** o **Revisar estimaciones** para filtrar. Esta última agrupa estimaciones con más de 90 días o sin fecha registrada.
- Busca por nombre, ticker o broker.
- Una estimación antigua sigue formando parte del total orientativo, pero Aureum la marca para revisión. El aviso no modifica el importe ni lo actualiza automáticamente; revisa el valor con el broker o la fuente que corresponda.
- **Añadir posición manual** y **Importar posiciones desde un CSV revisable** están plegados para priorizar la lectura del inventario; despliega la acción que necesites.
- Usa **Editar** para actualizar el valor aproximado o desplegar los datos detallados. Cambiar una estimación vuelve a fecharla; comprueba el importe antes de guardar.
- **Eliminar** abre una confirmación irreversible. Descarga un respaldo y comprueba la posición seleccionada antes de confirmar.
- Los importes heredados cuya moneda aún no se ha confirmado siguen visibles, pero no se suman como EUR hasta que añadas una estimación directa o completes la conversión.
- El peso objetivo antiguo que pudiera aparecer en una posición es solo informativo; los objetivos globales se mantienen en el activo consolidado.

### Importar posiciones con revisión

La importación asistida está en **Posiciones**. Solo acepta el formato CSV común de Aureum; los extractos originales de los brokers pueden tener columnas, unidades y reglas distintas, así que no los importes directamente sin convertirlos y comprobarlos.

1. Descarga **Plantilla CSV** y prepara una fila por posición y broker. No uses un resumen narrativo como si fuera el detalle de unidades.
2. Completa `broker` y `name`; especifica `category` para altas nuevas. `quantity` puede quedar vacía si solo tienes un valor total estimado.
3. Rellena `estimated_value_eur` con una estimación del total de la posición en EUR, o completa precio, moneda, fecha y fuente para una valoración detallada. El campo `fx_rate_to_eur` significa **EUR por una unidad** de la moneda de la posición, con fecha y fuente. Si no tienes ninguno de esos importes, la posición quedará pendiente.
4. Selecciona la fecha de corte del extracto, el formato numérico y una descripción de su fuente. Comprueba el total de control solo si corresponde exactamente a las mismas posiciones del archivo y excluye efectivo.
5. Pulsa **Preparar vista previa** y revisa cada fila, los cambios propuestos, coincidencias ambiguas, posiciones bloqueadas y la suma de filas valorables. Si la suma coincide pero incluye estimaciones manuales, eso no verifica su precisión. Corrige el CSV y vuelve a previsualizar si algo no cuadra.
6. Selecciona explícitamente las altas o actualizaciones que quieras aplicar y confirma. Si el extracto es anterior a hoy, la app pide una confirmación adicional porque aplicará esos datos a las posiciones vigentes.
7. Descarga el **acta privada JSON** con la fuente, fecha, valores anteriores y cambios aplicados. Guárdala junto al extracto en una ubicación privada.

Reglas y límites:

- La comparación usa broker + ticker; si no hay ticker, broker + nombre. Si no hay una única coincidencia segura, la fila queda bloqueada y no se fusiona.
- Los campos opcionales vacíos conservan el valor actual en una coincidencia. Para borrar un campo opcional, escribe `__CLEAR__`. Un precio actual nuevo requiere fecha y fuente; si se cambia la moneda, hay que confirmar de nuevo el precio y su referencia.
- El formato numérico se elige expresamente: español (`1.234,56`) o internacional (`1234.56`). No mezcles formatos en el mismo archivo.
- La importación no elimina posiciones ausentes, no cambia vínculos ni objetivos, no crea operaciones y no reescribe snapshots. La cantidad, coste medio, moneda o broker de posiciones con ledger iniciado solo se corrigen mediante operaciones compatibles con el ledger.
- El archivo se analiza localmente en el navegador; al confirmar, solo las filas seleccionadas se envían a Supabase. Varias filas se aplican una a una: si una falla, las anteriores pueden haberse guardado y la ejecución se detiene. Descarga el acta y vuelve a generar la vista previa antes de reintentar.
- El acta no se conserva automáticamente en Aureum y contiene datos patrimoniales. La descripción general de la fuente tampoco se añade a cada fila de la base de datos; conserva el acta y el documento original.
- La vista previa concilia las posiciones que se pueden valorar, no el efectivo ni los importes desconocidos. Una diferencia frente al control requiere investigación; no ajustes los datos solo para forzar el cuadre.
- La fase actual no interpreta PDF, Excel ni formatos originales específicos de Trade Republic, XTB u otros brokers. No infiere moneda, identifica instrumentos solo por nombre ni extrae posiciones de un total agregado.

## 7. Activos y objetivos

Un activo consolidado representa el instrumento común a una o varias posiciones de broker. No crea una posición ni mueve dinero.

### Crear un activo consolidado

1. Indica un nombre y una categoría estratégica.
2. Añade una identidad verificable: ISIN, un ID canónico propio, o ticker junto con mercado. El nombre por sí solo no basta para evitar fusiones ambiguas.
3. Añade un objetivo global entre 0 % y 100 % si ya está definido; puedes dejarlo vacío.
4. Registra, si te resulta útil, la tesis y la fecha de revisión.
5. Guarda el activo.

La categoría **Satélite Convicción** está limitada a cinco activos. La interfaz marca la revisión trimestral como pendiente si no hay fecha registrada o han pasado más de tres meses.

### Vincular posiciones

En **Vincular posiciones por broker**, elige para cada fila el activo que corresponda y pulsa **Guardar vínculo**. La categoría de la posición se actualiza para coincidir con la del activo maestro. Comprueba cuidadosamente identidad y mercado antes de vincular: la consolidación es manual.

En el catálogo, actualiza el peso objetivo y pulsa **Guardar** en esa fila. El objetivo corresponde al activo completo, sumando sus posiciones vinculadas. No se copia ni se interpreta el antiguo objetivo por broker. La suma de objetivos puede quedar por debajo o superar el 100 %; revisa la cobertura antes de usarla como política.

## 8. Patrimonio: inmuebles, hipotecas y flujos

Esta pantalla presenta inversiones y efectivo junto con los inmuebles y pasivos declarados. La cifra neta solo es completa respecto de los datos registrados y valorados.

### Añadir o valorar un inmueble

1. Abre **Añadir inmueble**.
2. Introduce un nombre de referencia, el tipo, el porcentaje que te pertenece y el valor estimado del inmueble completo, antes de descontar hipotecas.
3. Indica moneda, fecha y fuente de la valoración.
4. Si la moneda no es EUR, documenta el cambio a EUR, su fecha y su fuente.
5. Guarda. Para una valoración posterior, usa **Editar valoración**.

El importe que aporta al balance es el valor convertido a EUR multiplicado por tu porcentaje de propiedad.

### Registrar la hipoteca o confirmar que no existe

- Si el inmueble tiene hipoteca, usa **Añadir hipoteca** y registra el saldo pendiente, el porcentaje de deuda que te corresponde, la moneda, la fecha y la fuente. Para una moneda extranjera, registra también el cambio a EUR.
- Actualiza después el saldo con **Actualizar saldo** cuando dispongas de una cifra nueva y verificada.
- Si no tiene hipoteca, usa **Confirmar que no tiene hipoteca**. Un estado sin revisar impide guardar un corte patrimonial completo.

La deuda atribuible se calcula según el porcentaje de deuda que te corresponde. No registres como valor del inmueble un importe ya neto de deuda: la pantalla resta la hipoteca por separado.

### Registrar alquileres, gastos y cuotas

En **Registrar movimiento**, anota solo un movimiento ya cobrado o pagado:

- **Alquiler cobrado:** importe recibido y cuenta donde se movió.
- **Gasto del inmueble:** importe pagado, categoría y cuenta.
- **Pago hipotecario:** importe total pagado y parte destinada a principal. La diferencia se contabiliza como intereses; el principal reduce el saldo de la deuda y el movimiento de caja se registra conjuntamente.

Comprueba inmueble, cuenta, moneda, fecha y, cuando proceda, tipo de cambio antes de guardar. Estos movimientos se incorporan al libro de caja; los flujos inmobiliarios no se mezclan con la rentabilidad bursátil.

### Guardar un corte patrimonial

Usa **Guardar corte patrimonial** cuando las valoraciones financieras con referencias e inmobiliarias, el saldo de las hipotecas y la revisión de si cada inmueble tiene deuda estén completos. Las estimaciones rápidas de posiciones se muestran en **Resumen**, pero se excluyen deliberadamente de este balance verificable. El botón permanece deshabilitado mientras falten datos.

El corte conserva los importes de ese momento. Editar las valoraciones después no reescribe los cortes anteriores.

## 9. Operaciones y efectivo

El ledger registra movimientos desde un punto de partida explícito. No reconstruye la historia anterior a ese punto.

### Iniciar el seguimiento de una posición

En **Posiciones y punto de partida**, pulsa **Iniciar seguimiento** y revisa el aviso. La aplicación fija hoy como saldo inicial usando las unidades y el coste medio de la posición. Para una moneda extranjera, también exige un cambio, fecha y fuente. Confirma solo si aceptas que:

- las compras y ventas anteriores no se crearán ni se reconstruirán;
- la rentabilidad calculada comienza desde ese punto;
- el saldo inicial se basa en los datos actuales disponibles y puede no equivaler a la historia real de costes.

Esta acción afecta a los resultados futuros del ledger; no la uses como sustituto de importar o reconstruir movimientos históricos.

### Registrar una operación real

En **Registrar una operación**, elige el tipo y la fecha. Para compras y ventas, selecciona una posición con seguimiento activo e introduce unidades, precio por unidad, comisión y procedencia/fecha del precio. La aplicación actualiza posición y caja conjuntamente.

Para efectivo, dividendos, intereses y comisiones, selecciona una cuenta existente o indica una cuenta nueva, su moneda y el importe. Una cuenta nueva comienza con el movimiento que registres; si ya tenía dinero, registra primero **Saldo inicial de efectivo** con el saldo real a la fecha elegida.

Para monedas distintas de EUR, indica EUR por unidad, fecha y fuente. No introduzcas aquí una cantidad en EUR si el formulario está pidiendo otra moneda.

Tipos disponibles incluyen compra, venta, saldo inicial de efectivo, ingreso, retirada, dividendo, interés, comisión y actualización del cambio. Las aportaciones y retiradas cambian la caja, pero no son por sí mismas ganancias.

### Traspasar efectivo

Abre **Traspasar dinero entre cuentas**. Elige dos cuentas distintas en la misma moneda, el importe y la fecha. El sistema registra salida y entrada conjuntamente; el total de efectivo no debería cambiar. Si las cuentas tienen distinta moneda, la pantalla no permite el traspaso entre ellas.

### Corregir un movimiento

Cuando esté disponible **Revertir**, úsalo solo tras revisar el movimiento. La reversión añade un apunte contrario con fecha actual y exige un motivo; no borra el original. Los traspasos se revierten por ambas cuentas juntas. No todos los tipos de operación son reversibles desde esta acción.

Evita registrar de nuevo el movimiento correcto hasta comprobar el saldo actualizado y el apunte de reversión.

### Planes de aportación

Un plan semanal o mensual es solo un recordatorio de una aportación o compra prevista. No realiza cargos, no compra activos y no crea movimientos en el ledger. Cuando el banco o broker ejecute la operación, regístrala por separado como movimiento real. Los planes se pueden pausar y reanudar; en meses cortos, una fecha de día 29–31 se ajusta al último día del mes.

### Buscar en el libro

La lista permite filtrar por tipo y buscar entre los 250 movimientos más recientes por broker, activo o nota. Esa ventana de consulta no limita el resumen de caja ni el recuento total del ledger. Para una copia completa, descarga el respaldo.

## 10. Histórico de cartera

La página **Histórico** prioriza el total y la variación nominal entre los dos cortes más recientes, junto con un gráfico y un registro ordenado del más reciente al más antiguo. La variación no es rentabilidad: no ajusta aportaciones, retiradas ni diferencias en el alcance de cada corte. El formulario para añadir cortes agregados está plegado para dejar primero la lectura del histórico.

### Añadir un corte histórico agregado

Usa **Añadir un corte histórico por broker** para registrar una fecha pasada cuando solo tengas totales agregados:

1. Indica una fecha de hoy o anterior.
2. Añade una línea por broker o cuenta y su importe en EUR. Puedes añadir o quitar líneas.
3. No repitas el mismo broker en varias líneas; combina sus importes antes de guardar.
4. Completa **Fuente y limitaciones** con el documento o extracto empleado y cualquier limitación del desglose.
5. Revisa el total calculado y guarda.

Este corte no crea posiciones ni modifica las actuales; tampoco incluye inmuebles ni hipotecas. Introduce el total ya convertido a EUR. Si el dato fuente usa otra moneda o su fecha no coincide con la valoración, anota la conversión, su fuente y la limitación en el campo de procedencia. No presentes el total agregado como una reconstrucción por posición.

En el registro, abre **Desglose, fuentes y valoración** para consultar los importes conservados y su procedencia; los precios y conversiones detallados están disponibles cuando existen. La columna de variación compara cada corte con el anterior y tampoco representa rentabilidad. **Eliminar** un corte es una acción irreversible; confirma la fecha y el importe y descarga un respaldo antes de proceder.

## 11. Respaldo y privacidad

1. En **Resumen**, despliega **Respaldo privado** y pulsa **Descargar respaldo**.
2. Espera el mensaje de éxito y comprueba que el archivo `cartera-respaldo-AAAA-MM-DD.json` se haya descargado.
3. Guarda el JSON en una ubicación privada y protegida. Contiene datos patrimoniales personales en claro.
4. Descarga respaldos periódicos y antes de ediciones o eliminaciones importantes.

La aplicación ofrece exportación, no restauración desde el archivo. No compartas el JSON por correo o servicios públicos y no lo subas al repositorio de código.

## 12. Cómo interpretar resultados y resolver dudas

| Si ves… | Qué significa | Qué revisar |
|---|---|---|
| Una posición **Pendiente** o **No convertido** | Falta una parte de la valoración verificable. | En Posiciones, confirma moneda, precio actual, fecha, fuente y tipo de cambio si corresponde. |
| Una posición **Sin vincular** | No está asociada a un activo consolidado. | En Activos y objetivos, selecciona explícitamente el activo maestro correcto. |
| Una exposición u objetivo **Parcial** | Algunos datos están completos y otros no; no interpretes la cifra como cobertura total. | Revisa posiciones vinculadas, valoraciones pendientes y objetivos sin definir. |
| Rentabilidad vacía o con un alcance limitado | El ledger puede no haberse iniciado para todas las posiciones. | Comprueba el seguimiento activo y recuerda la fecha de inicio. No incluye resultados anteriores al saldo inicial. |
| No puedes guardar un corte patrimonial | Falta una valoración o la revisión de deuda de un inmueble. | Completa el aviso de datos pendientes antes de intentar guardar. |
| Un movimiento no aparece al buscar | La tabla solo carga los 250 movimientos más recientes. | Busca con otros términos o descarga el respaldo para conservar los datos completos. |
| Falló una carga o guardado | Puede haber un error de sesión, conexión o validación. | Lee el mensaje, comprueba la sesión y la fuente; reintenta solo después de verificar si la acción llegó a guardarse. |

Para compras, ventas, rentabilidad y snapshots, distingue siempre entre cambios de valor y entradas/salidas de dinero. Los gráficos de cortes no son medidas de rendimiento ajustadas ni sustituyen conciliaciones contra los extractos originales.

## 13. Rutina de revisión sugerida

### Cuando actualices la cartera

- Contrasta unidades, efectivo y saldos con el broker o banco.
- Actualiza precios y cambios con su fecha y fuente.
- Revisa posiciones pendientes y vínculos no confirmados.
- Registra movimientos reales una sola vez; corrige con reversión cuando corresponda.
- Comprueba el total, las exclusiones y la cobertura antes de guardar un corte.

### Periódicamente

- Revisa objetivos y tesis de los activos consolidados.
- Comprueba titularidad, valoración y deuda de cada inmueble.
- Verifica que los planes previstos sigan vigentes; recuerda que no ejecutan operaciones.
- Descarga y comprueba un respaldo privado reciente.

### Ante una discrepancia

No fuerces el total para que coincida. Localiza la cuenta o activo, compara la fecha de corte, la moneda y los movimientos con el documento de origen, corrige el dato con su procedencia y guarda un nuevo corte. Conserva los anteriores salvo que exista una razón clara para eliminarlos.
