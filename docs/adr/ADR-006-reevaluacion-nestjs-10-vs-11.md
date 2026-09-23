# ADR-006: Reevaluar NestJS 10 frente a una migración conjunta a NestJS 11

- **Estado:** Propuesto
- **Fecha:** 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-002](ADR-002-stack-node-nest-prisma-jest.md) y Sprint 1

## Problema, elemento de arquitectura sobre el que decidir

ADR-002 dejó pendiente revisar NestJS 10 después de Sprint 1. Ese momento ya llegó y debemos decidir si migramos ahora o si lo hacemos más adelante como un cambio arquitectónico separado.

## Opciones consideradas

- **A. Migrar ahora a NestJS 11:** actualizar juntos los paquetes principales y volver a validar el backend.
- **B. Mantener temporalmente NestJS 10:** estabilizar las historias actuales y preparar después una migración separada.

No consideramos actualizar solo @nestjs/core porque dejaría los paquetes principales en versiones mayores distintas.

## Matriz de decisión

La tabla muestra diferencias, no una opción ganadora.

| Criterio | A. Migrar ahora | B. Mantener temporalmente |
| --- | --- | --- |
| Riesgo conocido | Se reduce al salir de NestJS 10 | Se mantiene y debe vigilarse |
| Compatibilidad actual | Debe volver a comprobarse | Ya está verificada |
| Riesgo de regresión inmediato | Mayor | Menor |
| Coste | Se asume ahora | Se aplaza |
| Deuda técnica | Se reduce | Se mantiene |

## Decisión pendiente de revisión humana

Pendiente de revisión humana del Equipo 5.

## Por qué todavía no elegimos una alternativa

Migrar ahora puede reducir la deuda, pero exige revisar compatibilidad y regresiones. Mantener NestJS 10 evita ese cambio inmediato, pero conserva el riesgo ya documentado. Necesitamos revisar evidencia actualizada y acordar el momento antes de decidir.

## Consecuencias

### Positivas

- La revisión pendiente queda visible y separada del trabajo funcional.
- El equipo puede comparar las opciones antes de cambiar dependencias.

### Negativas y deuda aceptada

- Mientras siga Propuesto, NestJS 10 continúa siendo el baseline.
- Todavía no existe una fecha ni un plan aprobado para la migración.

## Trazabilidad y sincronización

- [ADR-002](ADR-002-stack-node-nest-prisma-jest.md)
- [Arquitectura](../architecture.md) e [índice ADR](README.md)
- [Dependencias actuales](../../backend/package.json)
- [Pruebas necesarias para validar una migración](../../backend/test)
