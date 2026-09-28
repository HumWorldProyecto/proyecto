# ADR-005: Adoptar una estrategia combinada de pruebas

- **Estado:** Aceptado
- **Fecha:** 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-002](ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](ADR-004-monolito-modular-y-separacion-de-responsabilidades.md), HU-01, HU-02, HU-04, HU-15 y HU-18

## Problema, elemento de arquitectura sobre el que decidir

Necesitamos comprobar reglas aisladas, integración con PostgreSQL y flujos completos de la API. Usar un solo tipo de prueba dejaría partes importantes sin cubrir o haría toda la suite más lenta.

## Opciones consideradas

- **A. Solo unitarias:** rápidas y aisladas, pero sin verificar base de datos ni composición real.
- **B. Principalmente E2E:** buena cobertura de flujos, con mayor tiempo y dificultad para localizar fallos.
- **C. Estrategia combinada:** unitarias, integración con PostgreSQL real y E2E para los recorridos principales.

## Matriz de decisión

| Criterio | A. Unitarias | B. E2E | C. Combinada |
| --- | --- | --- | --- |
| Velocidad de feedback | Alta | Baja | Alta |
| Confianza en flujos completos | Baja | Alta | Alta |
| Detección de errores de integración | Baja | Alta | Alta |
| Aislamiento de fallos | Alta | Baja | Alta |
| Facilidad de mantenimiento | Alta | Baja | Media |

## Decisión

Mantener una estrategia combinada: pruebas unitarias para reglas y servicios, integración con PostgreSQL real para repositorios y composición, y E2E para contratos y flujos críticos.

Jest sigue siendo la herramienta del backend. La cobertura global mínima del 80 % se mantiene como restricción del proyecto, sin fijar porcentajes por tipo de prueba.

## Por qué se elige frente a las demás

Durante el desarrollo ya encontramos valor en combinar pruebas rápidas con pruebas que usan PostgreSQL real y E2E. Mantener los tres niveles nos da más confianza sin depender únicamente de pruebas lentas.

## Consecuencias

### Positivas

- Las reglas tienen feedback rápido y los flujos importantes se comprueban de extremo a extremo.
- Prisma, PostgreSQL y el wiring de módulos se validan con infraestructura real.

### Negativas y deuda aceptada

- Las pruebas de integración y E2E tardan más y necesitan PostgreSQL.
- Debemos mantener fixtures y limpieza de datos para evitar interferencias.

## Trazabilidad y sincronización

- [Arquitectura](../architecture.md) e [índice ADR](README.md)
- [Estrategias de prueba en OpenSpec](../../openspec/changes/)
- [Configuración Jest](../../backend/jest.config.js)
- [Pruebas del backend](../../backend/test)
