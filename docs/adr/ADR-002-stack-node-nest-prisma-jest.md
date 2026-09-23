# ADR-002: Adoptar Node.js, TypeScript, NestJS, PostgreSQL, Prisma y Jest

- **Estado:** Aceptado
- **Fecha:** 2026-09-02; formalización P9: 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-004](ADR-004-monolito-modular-y-separacion-de-responsabilidades.md), [ADR-005](ADR-005-estrategia-combinada-de-pruebas.md) y [ADR-006](ADR-006-reevaluacion-nestjs-10-vs-11.md)

## Problema, elemento de arquitectura sobre el que decidir

Necesitamos un solo stack para mantener alineados el código, las pruebas y la documentación. También debemos considerar el coste de cambiar de ecosistema o de versión principal del framework.

## Opciones consideradas

- **A. Stack Python:** volver a Python, FastAPI, SQLAlchemy, Alembic y pytest.
- **B. Stack actual con NestJS 10:** mantener Node.js, TypeScript, NestJS 10, PostgreSQL, Prisma y Jest.
- **C. Stack actual con NestJS 11:** conservar el ecosistema Node.js, pero migrar de inmediato todo NestJS a la versión 11.

## Matriz de decisión

La valoración es cualitativa. Alta significa que la opción responde mejor al criterio.

| Criterio | A. Python | B. NestJS 10 | C. NestJS 11 |
| --- | --- | --- | --- |
| Alineación con el repositorio | Baja | Alta | Media |
| Coste inmediato del cambio | Baja | Alta | Baja |
| Estabilidad para cerrar Sprint 1 | Baja | Alta | Baja |
| Mantenibilidad | Media | Alta | Alta |
| Seguridad y soporte futuro | Media | Baja | Alta |

## Decisión

Adoptar Node.js 24, TypeScript 5 y NestJS 10.4 como stack temporal del backend, con PostgreSQL 16, Prisma 6 y Jest 29. La organización modular queda en ADR-004 y la estrategia de pruebas en ADR-005.

## Por qué se elige frente a las demás

Ya venimos trabajando con este stack. Mantenerlo evita introducir otro ecosistema y conserva coherentes el código, las pruebas y la documentación. Migrar a NestJS 11 antes del cierre de Sprint 1 agregaba un riesgo de regresión que el equipo decidió revisar después.

NestJS 10 mantiene el riesgo conocido registrado en el aviso GHSA-36xv-jgw5-4q75. ADR-006 deja abierta su reevaluación sin darla por resuelta.

## Consecuencias

### Positivas

- Trabajamos con un solo conjunto de herramientas.
- Prisma, Jest y NestJS ya están integrados con el backend actual.

### Negativas y deuda aceptada

- NestJS 10 conserva el riesgo conocido y debe reevaluarse.
- Una migración futura debe actualizar juntos los paquetes principales de NestJS.

## Trazabilidad y sincronización

- [Arquitectura](../architecture.md) e [índice ADR](README.md)
- [OpenSpec vigente](../../openspec/changes/)
- [Dependencias del backend](../../backend/package.json) y [modelo Prisma](../../backend/prisma/schema.prisma)
- [Reevaluación propuesta en ADR-006](ADR-006-reevaluacion-nestjs-10-vs-11.md)
