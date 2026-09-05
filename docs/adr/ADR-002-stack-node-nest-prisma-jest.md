# ADR-002 — Stack Node.js, NestJS, Prisma y Jest

**Estado:** Aceptado

**Fecha:** 2026-09-02

## Contexto

HumWorld necesita un baseline tecnológico único, coherente y reproducible para orientar su arquitectura, documentación, especificaciones e implementación.

El contexto inicial conservaba como propuesta provisional un backend basado en Python, FastAPI, Uvicorn, SQLAlchemy, Alembic y pytest. El Equipo 5 ha sustituido expresamente esa propuesta por un stack basado en Node.js, TypeScript y NestJS.

La auditoría de versiones previa al cierre de Sprint 1 confirmó Node.js 24 LTS como runtime oficial y verificó que los paquetes principales de NestJS están técnicamente alineados en la línea 10.4, con 10.4.22 como versión objetivo actual. El equipo quiere conservar esa línea durante el cierre del Sprint para no introducir una migración major inmediatamente antes de la Sprint Review.

Esta decisión tecnológica no constituye un requisito funcional del producto. Las restricciones obligatorias, como la arquitectura modular, la separación entre presentación, negocio y datos, la API `/api/v1`, Docker, GitHub Actions y OpenSpec, mantienen su origen independiente.

## Decisión

El Equipo 5 adopta el siguiente baseline tecnológico para Sprint 1:

- Backend: Node.js 24 LTS como runtime oficial, TypeScript 5 y NestJS 10.4 como baseline temporal, con NestJS 10.4.22 como versión técnica objetivo actual.
- Persistencia: PostgreSQL 16, Prisma ORM 6 y Prisma Migrate.
- Pruebas del backend: Jest 29.
- Estilo de aplicación: monolito modular con separación entre API, lógica de negocio, integraciones y persistencia.

La integración continua se alineará posteriormente con Node.js 24.20.0. La modificación del workflow queda fuera del alcance de este paso documental.

React, TypeScript y Vite se mantienen como el frontend previsto. Esta decisión no implica que el frontend ya esté implementado ni autoriza su implementación al margen de una especificación OpenSpec aprobada.

El baseline anterior basado en Python, FastAPI, Uvicorn, SQLAlchemy, Alembic y pytest deja de formar parte del contexto tecnológico activo.

Cualquier sustitución futura de estas tecnologías requiere análisis de impacto, aprobación humana, un nuevo ADR y sincronización de la documentación arquitectónica y del contexto de los agentes.

## Riesgo conocido y aceptación temporal

`@nestjs/core` 10.4.22 está incluido en el aviso moderado [GHSA-36xv-jgw5-4q75](https://github.com/nestjs/nest/security/advisories/GHSA-36xv-jgw5-4q75), relacionado con la neutralización insuficiente de ciertos campos en Server-Sent Events (SSE). El primer parche publicado para ese aviso pertenece a NestJS 11.1.18; no existe un parche equivalente en la línea 10.4.

HumWorld no utiliza actualmente SSE. Por ello, el flujo afectado por el aviso no forma parte de la superficie funcional implementada en Sprint 1. Esta ausencia reduce el alcance actual del riesgo, pero no convierte NestJS 10.4.22 en un baseline seguro definitivo ni elimina la vulnerabilidad presente en la dependencia.

El Equipo 5 acepta temporalmente este riesgo para cerrar Sprint 1 sin introducir una migración major justo antes de la Sprint Review. Esta aceptación está limitada al baseline temporal del Sprint.

## Condición de reevaluación

Después de Sprint 1, el equipo deberá reevaluar mediante un nuevo ADR la migración conjunta de los paquetes principales de NestJS a una línea soportada y parcheada.

Una eventual migración deberá mantener alineados, como mínimo, `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` y `@nestjs/testing`. No se permite actualizar únicamente `@nestjs/core` dejando los demás paquetes principales en otro major.

## Alternativas consideradas

### Mantener el baseline provisional basado en Python

Se descartó porque el Equipo 5 ratificó el stack Node.js y mantener ambos baselines produciría una contradicción entre arquitectura, instrucciones, especificaciones e implementación.

### Mantener ambos stacks como opciones simultáneas

Se descartó porque impediría determinar qué herramientas, convenciones y dependencias están autorizadas. HumWorld necesita un único baseline activo; las alternativas futuras deberán proponerse mediante el proceso formal de cambio arquitectónico.

### Migrar inmediatamente el stack NestJS a otro major

Se pospone hasta después de Sprint 1 para evitar introducir cambios de compatibilidad, regresiones y trabajo de revalidación inmediatamente antes de la Sprint Review. Esta postergación no rechaza la migración: establece una condición explícita de reevaluación y exige que el cambio futuro abarque conjuntamente los paquetes principales del framework.

### Migrar únicamente `@nestjs/core`

Se descarta porque dejaría los paquetes principales de NestJS en majors distintos, rompería la coherencia del stack y podría incumplir sus contratos de compatibilidad. Una migración futura deberá abordarlos conjuntamente.

## Consecuencias

### Positivas

- La documentación y la implementación pueden usar un contexto tecnológico único.
- Node.js 24 LTS establece un runtime oficial común para desarrollo y futura integración continua.
- NestJS proporciona una estructura modular y mecanismos explícitos de inyección de dependencias.
- Prisma y Prisma Migrate unifican el acceso a PostgreSQL y la evolución versionada del esquema.
- Jest constituye la herramienta común para las pruebas del backend.
- TypeScript puede compartirse entre el backend y el frontend previsto.

### Costes y limitaciones

- El equipo debe mantener el toolchain y las dependencias del ecosistema Node.js.
- NestJS 10.4.22 conserva un aviso moderado conocido y solo se acepta como baseline temporal de Sprint 1.
- Después de Sprint 1 debe reevaluarse mediante ADR una migración conjunta a una línea soportada y parcheada.
- Los paquetes principales de NestJS deben conservar el mismo major durante cualquier actualización.
- La documentación que todavía describa el baseline Python debe actualizarse.
- React, TypeScript y Vite continúan siendo una previsión arquitectónica; este ADR no declara que exista un frontend implementado.
- Este ADR no autoriza historias de usuario ni sustituye sus artefactos OpenSpec.
