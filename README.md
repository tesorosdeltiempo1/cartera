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
- Un panel visual de pesos actuales vs. objetivo.
- Un track record del valor total en el tiempo, con snapshots manuales.

**No es (todavía, o quizá nunca):**
- Un broker ni ejecuta operaciones — solo registra lo que ya ha pasado.
- Una fuente de asesoramiento financiero automatizado.
- Un sistema con login multiusuario — de momento un dashboard privado sin contraseña, uso personal.

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
- [x] Desplegado en producción, accesible desde cualquier dispositivo

## Roadmap

### Fase 2 — Terminar el ciclo de gestión de datos
Lo mínimo para que esto sea *usable* de verdad día a día, no solo una demo:
- [ ] Editar una posición existente (ahora mismo solo se puede crear)
- [ ] Eliminar una posición
- [ ] Editar/eliminar un snapshot por error
- [ ] Confirmación antes de borrar (evitar borrados accidentales desde el móvil)

### Fase 3 — Reflejar la política de inversión de verdad
Acercar la herramienta a cómo gestionas de verdad, no a un CRUD genérico:
- [ ] Campo de "tesis de inversión" por posición del Satélite de Convicción (máx. 5 empresas), con fecha de última revisión
- [ ] Aviso visual cuando una posición del satélite lleva más de un trimestre sin revisión (tu propia regla de revisión trimestral obligatoria)
- [ ] Registro de aportaciones periódicas a Activos Duros (la aportación semanal diferencial), separado del valor de mercado, para distinguir "cuánto he metido" de "cuánto vale ahora"
- [ ] Comparativa peso real vs. peso objetivo por categoría, con indicador visual de desviación

### Fase 4 — Menos trabajo manual (con cuidado)
Aquí es donde la automatización empieza a tentar — se añade solo si se puede revisar y desactivar:
- [ ] Actualización automática de `current_price` vía API de cotizaciones (con opción de forzar un valor manual si la API falla o desconfías del dato)
- [ ] Snapshot automático semanal/mensual (cron job), sin perder el botón manual
- [ ] Multi-moneda si algún broker opera en USD

### Fase 5 — Pulido de uso diario
- [ ] Instalable como PWA (icono en el móvil, pantalla completa, sin barra de navegador)
- [ ] Modo oscuro/claro (o fijar uno según preferencia)
- [ ] Protección simple opcional por si el enlace se filtra (sin sistema de usuarios, solo una contraseña de acceso)

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