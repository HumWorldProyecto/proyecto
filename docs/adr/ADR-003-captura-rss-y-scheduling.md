# ADR-003 — Captura RSS y scheduling

**Estado:** Aceptado

**Fecha:** 2026-09-02

## Contexto

HumWorld debe capturar noticias exclusivamente desde fuentes RSS. El web scraping está prohibido.

La captura necesita mecanismos integrados con NestJS para realizar solicitudes HTTP, interpretar documentos RSS y programar ejecuciones. También necesita un timeout coherente que pueda modificarse desde un único punto de configuración.

Las implementaciones provisionales basadas en `fetch` directo, expresiones regulares para interpretar XML y llamadas recursivas a `setTimeout` no constituyen la solución arquitectónica final aprobada.

## Decisión

El Equipo 5 adopta las siguientes tecnologías para la captura RSS:

- HTTP: `@nestjs/axios`, mediante los mecanismos de integración de NestJS.
- Parser: `rss-parser`.
- Scheduling: `@nestjs/schedule`.
- Timeout HTTP: 10 segundos como valor técnico por defecto, configurable desde una única configuración central.

El valor predeterminado de 10 segundos es una decisión técnica de diseño y configuración, no un requisito funcional de `spec.md`. La clave, su validación y el mecanismo de override deben concretarse en el `design.md` correspondiente, y el valor no debe repetirse como número mágico en distintos componentes.

El uso de `rss-parser` no modifica la restricción de aceptar únicamente RSS. Si la biblioteca puede interpretar otros formatos, el diseño de la integración debe conservar explícitamente el límite RSS-only sin recurrir a un parser RSS basado en expresiones regulares.

Los jobs programados deben disparar casos de uso; no deben contener ni duplicar las reglas de negocio de captura o persistencia.

## Alternativas consideradas

### `fetch` directo como implementación final

Se descartó para la captura RSS porque no es la integración HTTP ratificada para NestJS. El acceso HTTP debe quedar encapsulado mediante `@nestjs/axios`, de forma compatible con configuración, inyección de dependencias y pruebas.

### Parser RSS mediante expresiones regulares

Se descartó porque XML requiere tratamiento estructural y puede incluir namespaces, entidades, contenido multilínea y variantes que no deben resolverse con coincidencias de texto frágiles.

### Scheduler principal mediante `setTimeout` recursivo

Se descartó porque no ofrece la integración de lifecycle, registro y administración de jobs adoptada para NestJS. `setTimeout` no debe actuar como scheduler principal de la captura.

### Timeout fijo o disperso

Se descartó porque dificulta modificar y verificar la política HTTP. El timeout debe obtenerse siempre de la configuración central, que aplica 10 segundos cuando no existe un valor configurado.

## Consecuencias

### Positivas

- HTTP, parseo y scheduling quedan alineados con el framework ratificado.
- El timeout puede cambiarse sin modificar múltiples componentes.
- Los adaptadores pueden probarse mediante contratos e inyección de dependencias.
- El scheduler puede integrarse con el lifecycle y el registro de jobs de NestJS.
- Se descarta como solución final el parser RSS basado en expresiones regulares.

### Costes y limitaciones

- Deben declararse y mantenerse dependencias compatibles con la versión de NestJS utilizada por el proyecto.
- El parseo y el acceso HTTP requieren manejo asíncrono y traducción controlada de errores.
- La integración debe preservar explícitamente la restricción RSS-only, aunque la biblioteca acepte formatos adicionales.
- El nombre y la validación de la configuración, los reintentos, el backoff, la observabilidad avanzada y la política detallada de solapamientos o concurrencia continúan siendo decisiones de `design.md`.
- Este ADR no define la elegibilidad de fuentes de HU-15 ni la identidad de noticias de HU-04.
