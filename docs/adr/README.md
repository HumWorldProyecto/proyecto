# Architecture Decision Records

Esta carpeta contiene las decisiones arquitectónicas relevantes de HumWorld. El índice es el punto de entrada para conocer qué decisiones están aceptadas, cuáles siguen propuestas y qué artefactos deben mantenerse sincronizados.

## Convención

- Los archivos utilizan el formato ADR-NNN-descripcion.md.
- Cada número identifica una decisión y no se reutiliza.
- ADR-001 fue asignado históricamente a «Integración mediante Pull Requests» y permanece reservado.
- Cada ADR incluye problema neutral, opciones viables, matriz cualitativa, decisión, comparación, consecuencias positivas y negativas, y trazabilidad.
- Una decisión aceptada solo cambia mediante un ADR posterior que indique qué decisión sustituye.

## Gobernanza

- Consultar los ADR aceptados antes de proponer, diseñar o aplicar un cambio arquitectónico.
- Identificar en proposal.md y design.md los ADR afectados o aplicables.
- Justificar cualquier desviación y detener el trabajo si contradice una decisión aceptada.
- Ningún agente puede cambiar el estado de un ADR ni escoger una alternativa pendiente sin revisión humana.
- Mantener sincronizados los ADR con architecture.md, OpenSpec, las instrucciones permanentes y la implementación relacionada.

## Índice

| ADR | Estado | Decisión |
| --- | --- | --- |
| [ADR-002](ADR-002-stack-node-nest-prisma-jest.md) | Aceptado | Stack Node.js, TypeScript, NestJS, PostgreSQL, Prisma y Jest |
| [ADR-003](ADR-003-captura-rss-y-scheduling.md) | Aceptado | Integraciones NestJS para captura RSS, scheduling y timeout central |
| [ADR-004](ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) | Aceptado | Monolito modular y separación de responsabilidades |
| [ADR-005](ADR-005-estrategia-combinada-de-pruebas.md) | Aceptado | Pruebas unitarias, integración PostgreSQL y E2E |
| [ADR-006](ADR-006-reevaluacion-nestjs-10-vs-11.md) | Propuesto | Reevaluación de NestJS 10 frente a una migración conjunta a NestJS 11 |
