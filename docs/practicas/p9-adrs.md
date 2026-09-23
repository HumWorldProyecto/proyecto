# P9 — Architecture Decision Records

## Objetivo

Registrar las decisiones arquitectónicas principales de HumWorld y mantenerlas alineadas con la arquitectura, OpenSpec y la implementación. P9 no agrega funcionalidad.

## ADR creados y actualizados

| ADR | Estado | Tema |
| --- | --- | --- |
| [ADR-002](../adr/ADR-002-stack-node-nest-prisma-jest.md) | Aceptado | Stack backend |
| [ADR-003](../adr/ADR-003-captura-rss-y-scheduling.md) | Aceptado | Captura RSS y scheduling |
| [ADR-004](../adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) | Aceptado | Monolito modular |
| [ADR-005](../adr/ADR-005-estrategia-combinada-de-pruebas.md) | Aceptado | Estrategia de pruebas |
| [ADR-006](../adr/ADR-006-reevaluacion-nestjs-10-vs-11.md) | Propuesto | Revisión de NestJS 10 y 11 |

ADR-001 sigue reservado históricamente.

## Tabla de coherencia

| Área revisada | Evidencia principal | Estado |
| --- | --- | --- |
| Stack | ADR-002 y backend/package.json | COHERENTE |
| Persistencia | ADR-002 y schema.prisma | COHERENTE |
| Estilo arquitectónico | ADR-004 y architecture.md | COHERENTE |
| Separación de responsabilidades | ADR-004 y módulos del backend | COHERENTE |
| REST/OpenAPI | architecture.md y controllers | COHERENTE |
| RSS y scheduling | ADR-003 y CaptureModule | COHERENTE |
| Estrategia de pruebas | ADR-005, Jest y backend/test | COHERENTE |
| Gobierno ADR | Índice ADR, OpenSpec e instrucciones permanentes | COHERENTE |

No encontramos contradicciones entre los ADR aceptados y la implementación actual.

## Gaps pendientes

- ADR-006 necesita revisión humana antes de elegir una alternativa.
- La gestión de Channel/Media sigue pendiente en las tareas abiertas de gestion-crud-rss.
- Una futura migración de NestJS debe realizarse como un cambio arquitectónico separado.
