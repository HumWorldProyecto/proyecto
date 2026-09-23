# P9 — Architecture Decision Records

## Objetivo

P9 identifica decisiones arquitectónicas de alto impacto, documenta sus alternativas y consecuencias, y mantiene trazabilidad entre arquitectura, ADR, OpenSpec, instrucciones permanentes e implementación. No introduce comportamiento funcional.

## ADR seleccionados

| ADR | Estado | Alcance |
| --- | --- | --- |
| [ADR-002](../adr/ADR-002-stack-node-nest-prisma-jest.md) | Aceptado | Stack del backend y persistencia |
| [ADR-003](../adr/ADR-003-captura-rss-y-scheduling.md) | Aceptado | HTTP, parser RSS, scheduling y timeout |
| [ADR-004](../adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) | Aceptado | Estilo arquitectónico y límites internos |
| [ADR-005](../adr/ADR-005-estrategia-combinada-de-pruebas.md) | Aceptado | Niveles de prueba y PostgreSQL real |
| [ADR-006](../adr/ADR-006-reevaluacion-nestjs-10-vs-11.md) | Propuesto | Reevaluación post-Sprint 1 de NestJS |

ADR-001 permanece reservado históricamente y no se reutiliza.

## Tabla de coherencia

| Decisión o restricción | Fuentes comprobadas | Estado |
| --- | --- | --- |
| Stack Node.js, TypeScript y NestJS | [ADR-002](../adr/ADR-002-stack-node-nest-prisma-jest.md), [arquitectura](../architecture.md), backend/package.json y CI | COHERENTE |
| PostgreSQL, Prisma y migraciones versionadas | ADR-002, arquitectura, backend/prisma/schema.prisma y diseños HU-04/HU-15/HU-18 | COHERENTE |
| Monolito modular | [ADR-004](../adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md), arquitectura, OpenSpec y módulos NestJS | COHERENTE |
| API, servicios, repositorios e integraciones separados | ADR-004, arquitectura, puertos y adaptadores de backend/src | COHERENTE |
| REST /api/v1 y OpenAPI | arquitectura, backend/src/main.ts, controllers y design.md | COHERENTE |
| RSS-only, Axios, rss-parser, scheduling y timeout central | [ADR-003](../adr/ADR-003-captura-rss-y-scheduling.md), CaptureModule y diseños HU-01/HU-02 | COHERENTE |
| Unitarias, integración PostgreSQL y E2E | [ADR-005](../adr/ADR-005-estrategia-combinada-de-pruebas.md), backend/jest.config.js, backend/test y CI | COHERENTE |
| Gobierno de ADR y revisión humana | [índice ADR](../adr/README.md), arquitectura, [configuración OpenSpec](../../openspec/config.yaml) e instrucciones permanentes | COHERENTE |

No se identificó una contradicción arquitectónica vigente. ADR-003 aclara que SchedulerRegistry administra el próximo timeout dentro de @nestjs/schedule; la prohibición afecta a un scheduler principal artesanal y no administrado.

## Gaps resueltos

- ADR-002 y ADR-003 usan la plantilla completa de P9.
- ADR-004 separa el razonamiento del estilo arquitectónico que antes estaba disperso.
- ADR-005 documenta la estrategia de pruebas sin inventar proporciones.
- El índice y los artefactos permanentes incorporan gobernanza y trazabilidad ADR.
- Los design.md vigentes indican ADR aplicables y eliminan contexto histórico verificablemente obsoleto.
- El estado factual de HU-02 queda sincronizado sin declarar HU-03 implementada.

## Gaps pendientes

- ADR-006 requiere revisión humana y debe permanecer Propuesto hasta que el Equipo 5 elija una alternativa.
- La gestión obligatoria de Channel/Media continúa pendiente según las tareas abiertas de gestion-crud-rss; P9 no amplía ese alcance.
- Cualquier migración de NestJS necesita su propio cambio aprobado, actualización coordinada de dependencias y validación completa.
