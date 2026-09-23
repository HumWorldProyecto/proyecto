# ADR-006: Reevaluar NestJS 10 frente a una migración conjunta a NestJS 11

- **Estado:** Propuesto
- **Fecha:** 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-002](ADR-002-stack-node-nest-prisma-jest.md), Sprint 1 y P9

## Problema, elemento de arquitectura sobre el que decidir

ADR-002 aceptó NestJS 10.4 como baseline temporal para cerrar Sprint 1 y exigió reevaluar la línea del framework después del Sprint. Sprint 1 ya finalizó y el backend mantiene alineados en 10.4.22 los paquetes principales de NestJS.

El equipo debe decidir si realiza ahora una migración conjunta a NestJS 11 o si conserva temporalmente NestJS 10 mientras estabiliza las historias actuales y planifica la migración como un cambio arquitectónico separado. La decisión debe considerar el riesgo conocido, el soporte de la línea, la compatibilidad del ecosistema y el coste de volver a validar el sistema.

## Opciones consideradas

### A. Migrar ahora conjuntamente a NestJS 11

Actualizar en un mismo cambio @nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/testing y las integraciones relacionadas; adaptar incompatibilidades y ejecutar la validación completa.

### B. Mantener temporalmente NestJS 10

Conservar los paquetes actuales durante la estabilización de las historias integradas y preparar posteriormente una migración conjunta, explícita y acotada.

No se considera válida la actualización aislada de @nestjs/core, porque dejaría los paquetes principales en majors distintos.

## Matriz de decisión

La tabla expone trade-offs cualitativos; no asigna puntuaciones ni selecciona una alternativa.

| Criterio | Importancia | A. Migrar ahora | B. Mantener temporalmente |
| --- | --- | --- | --- |
| Riesgo de seguridad conocido | Alta | Permite salir de la línea afectada, sujeto a verificar la versión objetivo | Mantiene el riesgo documentado y exige mitigación y seguimiento |
| Compatibilidad del ecosistema | Alta | Requiere validar Axios, scheduling, Swagger, Prisma, pruebas y runtime | Conserva la compatibilidad ya verificada |
| Riesgo de regresión inmediato | Alta | Mayor por el cambio de major y sus ajustes | Menor mientras no cambie el framework |
| Coste de migración | Alta | Se asume ahora y de forma concentrada | Se difiere, pero no desaparece |
| Momento del proyecto | Alta | Puede competir con la estabilización de historias actuales | Protege el foco inmediato, a costa de postergar la deuda |
| Deuda técnica | Alta | Reduce la deuda si la migración se completa y verifica | Mantiene y puede aumentar la deuda temporal |
| Soporte y mantenimiento futuro | Alta | Ofrece una línea más reciente, pendiente de confirmar su versión objetivo | Conserva una línea temporal cuya situación debe revalidarse |

## Decisión pendiente de revisión humana

No adoptar ni descartar todavía ninguna alternativa. El Equipo 5 debe revisar la evidencia de seguridad y soporte vigente, el impacto de compatibilidad, el calendario y el coste de regresión antes de cambiar el estado de este ADR.

Una decisión futura deberá usar un verbo explícito —migrar o mantener temporalmente—, fijar alcance y condición de salida, y conservar alineados todos los paquetes principales.

## Por qué no se elige todavía entre las alternativas

La opción A reduce deuda y exposición futura, pero puede introducir incompatibilidades y regresiones que aún no se han estimado mediante una prueba de migración. La opción B reduce el riesgo inmediato de cambio, pero conserva una dependencia temporal y el riesgo ya aceptado. Elegir requiere evidencia actualizada y aprobación humana; el repositorio por sí solo no resuelve ese balance.

## Consecuencias

### Positivas

- La reevaluación exigida por ADR-002 queda visible y trazable.
- Las dos alternativas y sus criterios pueden revisarse sin modificar dependencias.
- Se prohíbe una actualización parcial que mezcle majors.
- La decisión puede separarse del trabajo funcional de las historias actuales.

### Negativas y deuda aceptada

- Mientras el ADR permanezca propuesto, NestJS 10 y su riesgo documentado continúan en el baseline.
- No existe todavía fecha, responsable operativo ni esfuerzo estimado para una migración.
- La evidencia de soporte, seguridad y compatibilidad debe actualizarse antes de decidir.
- Postergar repetidamente la revisión aumentaría la deuda técnica y el coste futuro.

## Trazabilidad y sincronización

- Decisión temporal original: [ADR-002](ADR-002-stack-node-nest-prisma-jest.md)
- Arquitectura: [docs/architecture.md](../architecture.md)
- Evidencia P9: [docs/practicas/p9-adrs.md](../practicas/p9-adrs.md)
- Contexto de agentes: [openspec/config.yaml](../../openspec/config.yaml)
- Dependencias actuales: [backend/package.json](../../backend/package.json) y [backend/package-lock.json](../../backend/package-lock.json)
- Configuración de pruebas: [backend/jest.config.js](../../backend/jest.config.js)
- Integración continua: [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- Validación necesaria antes de decidir: [backend/test](../../backend/test)
