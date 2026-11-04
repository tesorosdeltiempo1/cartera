# Aureum · guía de marca y experiencia

## Posicionamiento

Aureum es un registro patrimonial privado para comprender, documentar y revisar un patrimonio a lo largo del tiempo. No es un broker, una fuente de precios, un libro contable certificado ni un asesor financiero.

**Promesa:** una visión clara, trazable y portable de lo que se posee y se debe.

**Lema:** Patrimonio, en perspectiva.

## Personalidad y voz

- Sobria, precisa y serena; nunca triunfalista ni con urgencia comercial.
- Explicar primero qué mide una cifra, su unidad, fecha y cobertura.
- Distinguir hechos registrados, estimaciones, objetivos, supuestos y datos pendientes.
- Usar español directo; evitar latinismos decorativos, superlativos y jerga innecesaria.
- No usar emojis en la interfaz, el nombre de acciones ni el estado de datos.

## Identidad visual

- **Base:** carbón y grafito neutros; superficies diferenciadas por luminosidad, no por bordes ornamentales.
- **Acento:** bronce tenue reservado para acciones principales, foco y referencias editoriales; no usarlo como sustituto universal de estado.
- **Categorías:** paleta diferenciada y consistente en tarjetas, leyendas y gráficos. El color siempre acompaña a una etiqueta textual.
- **Tipografía:** sans serif para navegación, formularios, tablas y datos; serif editorial solo en titulares y la cifra principal.
- **Geometría:** alineaciones y márgenes regulares, radios discretos y una sola regla cuando aporte estructura. Sin marcos dobles, grietas, filigranas ni líneas decorativas.
- **Fotografía:** imagen arquitectónica local y secundaria a los datos. Mantener atribución visible, licencia registrada y alternativa visual legible sin la imagen.

## Jerarquía de información

1. Valor principal con nombre preciso, moneda y estado de integridad.
2. Fecha del último corte y cobertura declarada.
3. Advertencias de valoración, enlace o conciliación que alteren la lectura.
4. Desglose, objetivos, ledger e histórico bajo demanda.
5. Procedencia accesible junto al dato que sustenta; no esconder limitaciones en un pie genérico.

## Contrato de datos y gráficos

- Toda valoración debe poder explicarse por cantidad, precio, moneda, fecha, fuente y conversión cuando corresponda.
- No sumar una posición incompleta como si fueran euros; indicar qué quedó excluido.
- Los objetivos muestran cobertura, suma y desviación en puntos porcentuales; una asignación parcial no se presenta como completa.
- Un snapshot es un corte nominal, no una rentabilidad ajustada por aportaciones, retiradas, comisiones o cambios de cobertura.
- Los gráficos usan fechas proporcionales al tiempo, escalas explícitas y una alternativa textual con valores exactos.
- No interpolar ni suavizar con una apariencia que sugiera observaciones inexistentes.

## Formularios y estados

- Etiqueta persistente, unidad y moneda en el campo; el placeholder solo aporta un ejemplo.
- Fecha y fuente obligatorias para valoraciones que se usarán en totales.
- Separar campos derivados de campos introducidos; explicar los valores que la app no infiere.
- Validar antes de guardar y junto a la regla; preservar lo introducido ante un error.
- Confirmar éxito, error, carga y duplicidad de forma inequívoca; bloquear dobles envíos.
- Teclado, foco visible, contraste legible y etiquetas accesibles en todas las rutas y tamaños.

## Hallazgos de la revisión

- La primera versión mezclaba ornamento clásico, texto emocional, adornos Unicode y un emoji en una acción financiera; el conjunto restaba credibilidad.
- Los tratamientos globales por selectores amplios generaban superficies, contornos y radios inconsistentes entre rutas.
- Varios campos dependían visualmente del placeholder, y el alta de posición no confirmaba el éxito.
- El histórico suavizaba puntos irregulares y podía magnificar variaciones al autoajustar el eje; la comparación de objetivos no exponía claramente suma ni cobertura.

Las decisiones de implementación y los criterios pendientes de validar se mantienen en [ROADMAP.md](ROADMAP.md) y [CHANGELOG.md](../CHANGELOG.md).
