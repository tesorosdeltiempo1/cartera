# Registro de cambios

Este archivo recoge las iteraciones funcionales y visuales por separado del README. Las fechas indican cuándo se implementó cada cambio; no implican por sí mismas que esté desplegado ni validado en producción.

## 2026-09-28 — Exportación manual de respaldo (pendiente de comprobación)

- Se añadió la descarga de un JSON con posiciones e histórico, con versión de formato y fecha de exportación.
- La descarga se deshabilita si no se pudieron leer ambas tablas, para evitar generar intencionadamente una copia incompleta.
- El archivo contiene datos patrimoniales sin cifrar: guardarlo en una ubicación privada y protegida.
- Validación de código: `npm run lint` y `npm run build` completados correctamente; pendiente comprobar manualmente el contenido del archivo descargado.
- Esta iteración no implementa restauración/importación del respaldo.

## 2026-09-28 — Eliminación de posiciones (pendiente de validación)

- Se añadió una confirmación explícita con el nombre de la posición, opción de cancelar y manejo de errores.
- Tras confirmar, el dashboard se actualiza si Supabase devuelve la fila eliminada; los fallos quedan visibles para el usuario.
- Validación local: pendiente de ejecutar tras esta iteración.
- No desplegar/usar el borrado en producción hasta revisar las políticas RLS para `anon` y probar con datos de prueba.

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