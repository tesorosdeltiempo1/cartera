# Manual de uso de Aureum

**Revisión:** 4 de noviembre de 2026

**Propósito:** registrar y revisar patrimonio privado con datos verificables.

**Acceso:** cuenta privada del propietario.

## 1. Qué hace Aureum

Aureum reúne posiciones financieras, efectivo, inmuebles y deuda que registres. Permite documentar valoraciones, agrupar posiciones bajo activos consolidados, registrar movimientos reales, revisar cortes históricos y descargar un respaldo.

No es un broker, no ejecuta compras ni pagos, no importa datos automáticamente y no ofrece asesoramiento financiero, fiscal ni contable. Los precios, cambios de divisa, valoraciones inmobiliarias y saldos hipotecarios se introducen manualmente.

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

1. Añade una fila por cada tenencia en un broker en **Posiciones**.
2. Confirma la moneda, el precio actual, la fecha y la fuente. Para monedas distintas de EUR, registra también un tipo de cambio explícito a EUR, su fecha y su fuente.
3. En **Activos y objetivos**, crea un registro maestro para cada instrumento que quieras consolidar.
4. Vincula manualmente cada posición al activo maestro correcto y define el objetivo global si ya está decidido.
5. Si quieres seguimiento de movimientos y resultados desde hoy, revisa el saldo inicial y comienza el seguimiento desde **Operaciones**.
6. Registra inmuebles y pasivos por separado en **Patrimonio**.
7. Revisa las alertas y coberturas antes de guardar cortes.

No es necesario completar un campo con una suposición para hacer desaparecer una advertencia. Una valoración pendiente es preferible a un importe presentado como EUR sin fundamento.

## 5. Resumen

La portada muestra la cartera financiera y el efectivo en EUR que se pueden valorar con los datos confirmados. No representa por sí sola el patrimonio neto completo: los inmuebles y las hipotecas se consultan en **Patrimonio**.

Las secciones desplegables permiten revisar:

- **Revisión de datos:** posiciones sin consolidar o con valoración incompleta.
- **Composición:** importes por categoría, gráfico y comparación con objetivos cuando hay activos consolidados.
- **Rentabilidad:** resultados realizados y no realizados que cubre el ledger.
- **Evolución:** cortes puntuales guardados; no es una rentabilidad ajustada por aportaciones y retiradas.
- **Respaldo privado:** descarga de los datos registrados.

**Guardar corte de hoy** conserva una fotografía de la cartera y el efectivo actuales. No guarda inmuebles ni deuda hipotecaria; para eso usa **Guardar corte patrimonial** en la pantalla Patrimonio. El guardado del corte financiero se bloquea si hay posiciones cuya valoración no está completa.

### Cómo leer el total y los gráficos

- El total solo suma posiciones valoradas en EUR y efectivo convertido con el tipo de cambio registrado.
- Las posiciones sin precio, moneda o conversión confirmados no se suman como EUR.
- La composición describe importes registrados por categoría; no descubre exposiciones indirectas dentro de fondos.
- La comparación de objetivos informa cuántos activos tienen objetivo y cuánto valor cubre la comparación. Las posiciones sin activo consolidado se excluyen y el efectivo no tiene un objetivo configurable en esta pantalla.
- Un gráfico histórico representa importes registrados en fechas concretas. No descuenta aportaciones, retiradas, comisiones ni cambios en la cobertura de los datos.

## 6. Posiciones por broker

Cada fila es una tenencia individual en un broker. Si el mismo instrumento está en dos brokers, registra dos posiciones distintas y luego vincula ambas al mismo activo consolidado.

### Añadir una posición

1. Completa el nombre, broker o custodio, categoría y unidades.
2. Introduce el coste medio si lo conoces; es informativo y no sustituye al precio actual.
3. Para que la posición se valore, introduce el precio actual y completa **Moneda y referencia del precio**: moneda, fecha del precio y origen.
4. Si el precio está en una moneda distinta de EUR, introduce cuántos EUR vale una unidad de esa moneda, la fecha del cambio y su fuente.
5. Guarda la posición y revisa el mensaje de confirmación.

Si no tienes un precio actual fiable, no inventes uno: deja la posición pendiente y vuelve a completarla cuando tengas una fuente verificable. Una posición nueva no queda consolidada automáticamente.

Para una moneda extranjera, el cambio se introduce como **EUR por una unidad de la moneda original**. Por ejemplo, si 1 USD equivale a 0,92 EUR, introduce 0,92; no su inverso. La valoración en euros se deriva de las unidades, el precio y ese cambio registrado.

### Revisar o buscar posiciones

- Usa **Todas**, **Pendientes** o **Valoradas** para filtrar por estado de valoración.
- Busca por nombre, ticker o broker.
- Usa **Editar** para actualizar cantidad, precio, moneda o procedencia. Comprueba los campos antes de guardar, ya que el cambio puede afectar a los totales y a los cortes futuros.
- **Eliminar** abre una confirmación irreversible. Descarga un respaldo y comprueba la posición seleccionada antes de confirmar.
- Los importes heredados cuya moneda aún no se ha confirmado siguen visibles, pero no se convierten ni se suman como EUR.
- El peso objetivo antiguo que pudiera aparecer en una posición es solo informativo; los objetivos globales se mantienen en el activo consolidado.

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

Usa **Guardar corte patrimonial** cuando las valoraciones financieras e inmobiliarias, el saldo de las hipotecas y la revisión de si cada inmueble tiene deuda estén completos. El botón permanece deshabilitado mientras falten datos.

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

La página **Histórico** reúne cortes de cartera, su desglose y un gráfico de valores nominales.

### Añadir un corte histórico agregado

Usa **Añadir un corte histórico por broker** para registrar una fecha pasada cuando solo tengas totales agregados:

1. Indica una fecha de hoy o anterior.
2. Añade una línea por broker o cuenta y su importe en EUR. Puedes añadir o quitar líneas.
3. No repitas el mismo broker en varias líneas; combina sus importes antes de guardar.
4. Completa **Fuente y limitaciones** con el documento o extracto empleado y cualquier limitación del desglose.
5. Revisa el total calculado y guarda.

Este corte no crea posiciones ni modifica las actuales; tampoco incluye inmuebles ni hipotecas. Introduce el total ya convertido a EUR. Si el dato fuente usa otra moneda o su fecha no coincide con la valoración, anota la conversión, su fuente y la limitación en el campo de procedencia. No presentes el total agregado como una reconstrucción por posición.

En la tabla puedes consultar el desglose y, cuando exista, los precios y conversiones conservados. **Eliminar** un corte es una acción irreversible; confirma la fecha y el importe y descarga un respaldo antes de proceder.

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
