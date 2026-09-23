# ADR-002: Adoptar Node.js, TypeScript, NestJS, PostgreSQL, Prisma y Jest

- **Estado:** Aceptado
- **Fecha:** 2026-09-02; formalización P9: 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-004](ADR-004-monolito-modular-y-separacion-de-responsabilidades.md), [ADR-005](ADR-005-estrategia-combinada-de-pruebas.md), [ADR-006](ADR-006-reevaluacion-nestjs-10-vs-11.md), P6 y P9

## Problema, elemento de arquitectura sobre el que decidir

HumWorld necesita un baseline tecnológico único para implementar, probar y operar el backend sin mantener contextos incompatibles. Al tomar la decisión coexistían una propuesta provisional basada en Python y una implementación del equipo basada en Node.js. También debía decidirse si introducir una migración mayor del framework antes del cierre de Sprint 1 o estabilizar primero el incremento existente.

La selección debía preservar la arquitectura modular, la API REST, la persistencia relacional, las migraciones versionadas y las pruebas automatizadas. Estas restricciones son independientes de una tecnología concreta.

## Opciones consideradas

### A. Mantener Python, FastAPI, SQLAlchemy, Alembic y pytest

Conservar el baseline provisional original y realinear la implementación y documentación con ese stack.

### B. Adoptar Node.js, TypeScript, NestJS 10, PostgreSQL, Prisma y Jest

Reconocer como baseline el stack ya ratificado e implementado por el equipo, manteniendo temporalmente NestJS 10 durante el cierre de Sprint 1.

### C. Adoptar el stack Node.js y migrar inmediatamente a NestJS 11

Mantener Node.js, TypeScript, PostgreSQL, Prisma y Jest, pero asumir antes del cierre del Sprint la migración conjunta de los paquetes principales de NestJS.

## Matriz de decisión

La matriz utiliza una valoración cualitativa del equipo. **Alta**, **Media** y **Baja** expresan adecuación relativa al criterio, no mediciones cuantitativas.

| Criterio | Importancia | A. Python | B. Node + NestJS 10 | C. Node + NestJS 11 |
| --- | --- | --- | --- | --- |
| Alineación con la implementación existente | Alta | Baja | Alta | Media |
| Coherencia de documentación y herramientas | Alta | Baja | Alta | Media |
| Estructura modular e inyección de dependencias | Alta | Media | Alta | Alta |
| Coste y riesgo inmediato de migración | Alta | Baja | Alta | Baja |
| Continuidad para cerrar Sprint 1 | Alta | Baja | Alta | Baja |
| Seguridad y horizonte de soporte | Alta | Media | Baja | Alta |
| Ecosistema para PostgreSQL y pruebas | Media | Alta | Alta | Alta |

## Decisión

Adoptar Node.js 24 LTS, TypeScript 5 y NestJS 10.4 como baseline temporal del backend de Sprint 1; PostgreSQL 16 con Prisma ORM 6 y Prisma Migrate para persistencia; y Jest 29 como herramienta de pruebas del backend.

La organización interna se documenta en [ADR-004](ADR-004-monolito-modular-y-separacion-de-responsabilidades.md). Los niveles y responsabilidades de prueba se documentan en [ADR-005](ADR-005-estrategia-combinada-de-pruebas.md).

La decisión histórica aceptó temporalmente NestJS 10.4.22 aun cuando @nestjs/core estaba incluido en el aviso moderado [GHSA-36xv-jgw5-4q75](https://github.com/nestjs/nest/security/advisories/GHSA-36xv-jgw5-4q75). HumWorld no utilizaba SSE, por lo que el flujo afectado no formaba parte de Sprint 1, pero esta ausencia no eliminaba el riesgo de la dependencia.

## Por qué se elige frente a las demás

La opción B permitió cerrar Sprint 1 con un único contexto tecnológico y sin reescribir la implementación ni introducir una migración mayor inmediatamente antes de la revisión. La opción A era técnicamente viable, pero contradecía el código y las decisiones ya ratificadas. La opción C mejoraba el horizonte de soporte, pero exigía una migración y una revalidación extensas en un momento de alto riesgo para el Sprint.

Esta elección fue temporal respecto de NestJS 10. ADR-002 no resuelve la reevaluación posterior: [ADR-006](ADR-006-reevaluacion-nestjs-10-vs-11.md) la registra como propuesta pendiente de revisión humana.

## Consecuencias

### Positivas

- Existe un solo stack activo para documentación, implementación y CI.
- TypeScript y NestJS proporcionan módulos, contratos e inyección de dependencias.
- Prisma y Prisma Migrate mantienen el acceso a PostgreSQL y la evolución versionada del esquema.
- Jest integra las pruebas del backend con el mismo ecosistema.
- Node.js 24 LTS queda establecido como runtime oficial.

### Negativas y deuda aceptada

- El equipo debe mantener el toolchain y las dependencias del ecosistema Node.js.
- NestJS 10.4.22 conserva el riesgo conocido registrado en esta decisión.
- La aceptación temporal generó la deuda explícita de reevaluar conjuntamente los paquetes principales después de Sprint 1.
- No se permite actualizar solo @nestjs/core; una migración debe mantener alineados @nestjs/common, @nestjs/core, @nestjs/platform-express y @nestjs/testing.
- React, Vite y las herramientas frontend siguen siendo previsiones; este ADR no declara un frontend implementado.

## Trazabilidad y sincronización

- Arquitectura: [docs/architecture.md](../architecture.md)
- Evidencia P9: [docs/practicas/p9-adrs.md](../practicas/p9-adrs.md)
- Contexto de agentes: [openspec/config.yaml](../../openspec/config.yaml)
- OpenSpec relacionado: [captura automática](../../openspec/changes/captura-automatica-rss/design.md), [almacenamiento](../../openspec/changes/almacenamiento-noticias-metadatos/design.md), [periodicidad](../../openspec/changes/config-periodicidad/design.md), [fuentes](../../openspec/changes/gestion-crud-rss/design.md) y [actualización manual](../../openspec/changes/actualizacion-manual-rss/design.md)
- Dependencias: [backend/package.json](../../backend/package.json)
- Persistencia: [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma)
- Pruebas: [backend/jest.config.js](../../backend/jest.config.js)
- Integración continua: [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- Reevaluación posterior propuesta: [ADR-006](ADR-006-reevaluacion-nestjs-10-vs-11.md)
