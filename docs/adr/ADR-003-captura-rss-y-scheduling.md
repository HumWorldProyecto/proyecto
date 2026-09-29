# ADR-003: Adoptar integraciones NestJS para captura RSS y scheduling

- **Estado:** Aceptado
- **Fecha:** 2026-09-02; formalización P9: 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-002](ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](ADR-004-monolito-modular-y-separacion-de-responsabilidades.md), HU-01, HU-02, HU-15 y HU-18

## Problema, elemento de arquitectura sobre el que decidir

Necesitamos descargar e interpretar RSS, programar capturas y aplicar un timeout común. La solución debe integrarse con NestJS, ser fácil de probar y mantener la restricción RSS-only.

## Opciones consideradas

- **A. Herramientas nativas y scheduler propio:** usar fetch, otro parser estructurado y temporizadores administrados por nuestro código.
- **B. Integraciones NestJS:** usar @nestjs/axios, rss-parser, @nestjs/schedule y una configuración central.
- **C. Cola o scheduler externo:** ejecutar la captura mediante infraestructura y workers separados.

## Matriz de decisión

| Criterio | A. Gestión propia | B. NestJS | C. Infraestructura externa |
| --- | --- | --- | --- |
| Integración con el backend actual | Media | Alta | Media |
| Facilidad de prueba | Media | Alta | Media |
| Simplicidad operacional | Media | Alta | Baja |
| Soporte para varias instancias | Baja | Baja | Alta |

## Decisión

Mantener @nestjs/axios para HTTP, rss-parser para interpretar feeds y @nestjs/schedule para la planificación. El timeout se obtiene desde una configuración central, con 10 segundos por defecto.

La integración incluye un guard que rechaza Atom, HTML y contenido no RSS antes del parseo. Los jobs solo disparan casos de uso; no contienen reglas de captura o persistencia.

SchedulerRegistry puede usar timers internamente. Lo que no aceptamos es implementar nuestro propio scheduler principal mediante un ciclo recursivo artesanal fuera de @nestjs/schedule.

## Por qué se elige frente a las demás

Ya usamos estas herramientas y están integradas con el backend. Mantenerlas evita duplicar mecanismos, facilita las pruebas y no agrega infraestructura que el proyecto todavía no necesita.

## Consecuencias

### Positivas

- HTTP, parsing, timeout y scheduling siguen un mecanismo común.
- Los adaptadores y jobs pueden probarse mediante inyección de dependencias.

### Negativas y deuda aceptada

- El guard RSS-only sigue siendo necesario porque rss-parser acepta otros formatos.
- El scheduling actual funciona dentro de una instancia y no coordina réplicas.

## Trazabilidad y sincronización

- [Arquitectura](../architecture.md) e [índice ADR](README.md)
- OpenSpec de [captura automática](../../openspec/changes/captura-automatica-rss/design.md) y [actualización manual](../../openspec/changes/actualizacion-manual-rss/design.md)
- [Módulo de captura](../../backend/src/capture/capture.module.ts) y [scheduler](../../backend/src/capture/jobs/capture-scheduler.ts)
- [Pruebas de captura](../../backend/test/capture)
