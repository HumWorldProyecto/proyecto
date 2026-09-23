# ADR-004: Adoptar un monolito modular con separación de responsabilidades

- **Estado:** Aceptado
- **Fecha:** 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-002](ADR-002-stack-node-nest-prisma-jest.md), [ADR-003](ADR-003-captura-rss-y-scheduling.md) y [ADR-005](ADR-005-estrategia-combinada-de-pruebas.md)

## Problema, elemento de arquitectura sobre el que decidir

HumWorld reúne varias capacidades que deben mantenerse separadas sin agregar complejidad operacional innecesaria. Necesitamos una estructura clara para la API, los casos de uso, las integraciones y el acceso a datos.

## Opciones consideradas

- **A. Monolito sin separación:** un solo sistema con dependencias internas poco definidas.
- **B. Monolito modular:** un solo despliegue con módulos, servicios, puertos, repositorios e integraciones separados.
- **C. Microservicios:** capacidades desplegadas y operadas de forma independiente.

## Matriz de decisión

| Criterio | A. Sin separación | B. Modular | C. Microservicios |
| --- | --- | --- | --- |
| Mantenibilidad | Baja | Alta | Media |
| Control del acoplamiento | Baja | Alta | Alta |
| Simplicidad operacional | Alta | Alta | Baja |
| Facilidad de despliegue | Alta | Alta | Baja |
| Escalado independiente | Baja | Baja | Alta |

## Decisión

Mantener un monolito modular. Los controllers se ocupan de HTTP, los servicios coordinan los casos de uso, los repositorios encapsulan Prisma y las integraciones aíslan RSS y otros sistemas externos.

## Por qué se elige frente a las demás

Ya trabajamos con esta arquitectura y nos ha permitido separar sources, capture, news y config sin agregar la complejidad operacional de microservicios. Para el alcance actual de HumWorld sigue siendo suficiente.

Los microservicios no son una mala opción, pero hoy implicarían más despliegues, comunicación remota y observabilidad sin una necesidad concreta que lo justifique. Si el proyecto crece, podremos revisar esta decisión.

## Consecuencias

### Positivas

- Conservamos un despliegue sencillo con responsabilidades claras.
- Los módulos pueden probarse y evolucionar con menos acoplamiento.

### Negativas y deuda aceptada

- Todo el sistema se despliega y escala como una unidad.
- Los límites internos dependen de que el equipo los respete durante el desarrollo.

## Trazabilidad y sincronización

- [Arquitectura](../architecture.md) e [índice ADR](README.md)
- [Contexto OpenSpec](../../openspec/config.yaml)
- [Diseños OpenSpec](../../openspec/changes/)
- [Composición del backend](../../backend/src/app.module.ts)
