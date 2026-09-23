# ADR-003: Adoptar integraciones NestJS para captura RSS y scheduling

- **Estado:** Aceptado
- **Fecha:** 2026-09-02; formalización P9: 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-002](ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](ADR-004-monolito-modular-y-separacion-de-responsabilidades.md), [ADR-005](ADR-005-estrategia-combinada-de-pruebas.md), HU-01, HU-02, HU-15 y HU-18

## Problema, elemento de arquitectura sobre el que decidir

HumWorld necesita descargar fuentes RSS, interpretar XML de forma estructurada, programar capturas automáticas y limitar el tiempo total de las solicitudes. La solución debe integrarse con el lifecycle de NestJS, ser configurable y comprobable, preservar la restricción RSS-only y evitar que cada componente defina su propia política de timeout.

## Opciones consideradas

### A. Capacidades nativas de Node.js y planificación administrada por la aplicación

Usar fetch o Undici, un parser XML/RSS estructurado alternativo y temporizadores gestionados por código propio, manteniendo una configuración central de timeout.

### B. Integraciones NestJS especializadas

Usar @nestjs/axios con HttpService, rss-parser detrás de un guard RSS-only, @nestjs/schedule con SchedulerRegistry y una configuración central de timeout.

### C. Infraestructura distribuida de jobs

Usar un cliente HTTP y un parser estructurado junto con una cola o scheduler externo, almacenamiento compartido y workers independientes.

Un parser RSS basado en expresiones regulares y los timeouts fijos o dispersos no se consideran alternativas finales viables: no procesan XML de forma robusta ni sostienen una política operativa única.

## Matriz de decisión

La valoración es cualitativa. **Alta**, **Media** y **Baja** indican adecuación relativa al alcance actual, no métricas cuantitativas.

| Criterio | Importancia | A. Node + gestión propia | B. Integraciones NestJS | C. Jobs distribuidos |
| --- | --- | --- | --- | --- |
| Integración con NestJS y su lifecycle | Alta | Media | Alta | Media |
| Parseo RSS estructurado | Alta | Alta | Alta | Alta |
| Registro y administración de jobs | Alta | Media | Alta | Alta |
| Configuración central y verificable | Alta | Alta | Alta | Alta |
| Testabilidad mediante inyección | Alta | Media | Alta | Media |
| Complejidad operacional para el alcance actual | Alta | Media | Alta | Baja |
| Evolución a múltiples instancias | Media | Baja | Baja | Alta |

## Decisión

Adoptar @nestjs/axios y HttpService para el acceso HTTP, rss-parser para interpretar feeds, @nestjs/schedule para registrar y administrar la planificación y una única configuración central para el timeout RSS. El valor técnico predeterminado es 10 segundos y puede modificarse mediante RSS_FETCH_TIMEOUT_MS, validado como entero positivo y finito.

Mantener un guard independiente que compruebe la raíz RSS antes del parseo, porque rss-parser también puede interpretar formatos que quedan fuera del alcance aprobado. Los jobs programados deben disparar casos de uso y no contener ni duplicar reglas de captura o persistencia.

SchedulerRegistry forma parte de la infraestructura adoptada de @nestjs/schedule. Registrar en él un timeout para una ejecución futura, administrarlo durante cambios de periodicidad y retirarlo durante el lifecycle del módulo no contradice esta decisión. La prohibición se refiere a implementar fuera de esa infraestructura un ciclo principal artesanal y no administrado basado en llamadas recursivas a setTimeout.

## Por qué se elige frente a las demás

La opción B ofrece las capacidades necesarias dentro del framework ya adoptado, permite inyectar adaptadores y administrar jobs sin añadir infraestructura operativa. La opción A era viable, pero trasladaba al código propio más responsabilidades de integración, lifecycle y registro. La opción C aporta coordinación distribuida, pero su coste de operación y despliegue no está justificado para el monolito actual.

## Consecuencias

### Positivas

- HTTP, parsing, configuración y scheduling quedan integrados con el stack del backend.
- Los adaptadores pueden sustituirse por dobles en pruebas mediante contratos e inyección.
- El timeout se modifica y valida desde un único punto.
- SchedulerRegistry permite registrar, reemplazar y retirar el próximo job.
- El guard mantiene explícita la restricción RSS-only.

### Negativas y deuda aceptada

- Deben mantenerse versiones compatibles de Axios, rss-parser y @nestjs/schedule.
- rss-parser acepta otros formatos, por lo que el guard RSS-only sigue siendo obligatorio.
- El scheduling y los guards actuales viven en proceso y no coordinan múltiples réplicas.
- El manejo asíncrono, los redirects, el deadline y la traducción de errores aumentan la complejidad de los adaptadores.
- Reintentos, backoff, observabilidad avanzada y coordinación distribuida quedan fuera de esta decisión.

## Trazabilidad y sincronización

- Arquitectura: [docs/architecture.md](../architecture.md)
- Evidencia P9: [docs/practicas/p9-adrs.md](../practicas/p9-adrs.md)
- Contexto de agentes: [openspec/config.yaml](../../openspec/config.yaml)
- OpenSpec de captura: [captura automática](../../openspec/changes/captura-automatica-rss/design.md) y [actualización manual](../../openspec/changes/actualizacion-manual-rss/design.md)
- OpenSpec relacionado: [periodicidad](../../openspec/changes/config-periodicidad/design.md) y [fuentes](../../openspec/changes/gestion-crud-rss/design.md)
- Composición: [backend/src/capture/capture.module.ts](../../backend/src/capture/capture.module.ts)
- HTTP: [backend/src/capture/integrations/http-rss-fetcher.ts](../../backend/src/capture/integrations/http-rss-fetcher.ts)
- Parser: [backend/src/capture/integrations/rss-only-parser.ts](../../backend/src/capture/integrations/rss-only-parser.ts)
- Scheduling: [backend/src/capture/jobs/capture-scheduler.ts](../../backend/src/capture/jobs/capture-scheduler.ts)
- Timeout: [backend/src/rss-http/rss-http-timeout.ts](../../backend/src/rss-http/rss-http-timeout.ts)
- Pruebas: [backend/test/capture](../../backend/test/capture) y [backend/test/rss-http](../../backend/test/rss-http)
