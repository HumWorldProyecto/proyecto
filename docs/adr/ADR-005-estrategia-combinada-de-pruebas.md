# ADR-005: Adoptar una estrategia combinada de pruebas

- **Estado:** Aceptado
- **Fecha:** 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-002](ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](ADR-004-monolito-modular-y-separacion-de-responsabilidades.md), HU-01, HU-02, HU-04, HU-15 y HU-18

## Problema, elemento de arquitectura sobre el que decidir

HumWorld necesita comprobar reglas de dominio, coordinación entre módulos, contratos HTTP y comportamiento real de persistencia. Una sola clase de prueba no equilibra por sí misma velocidad, aislamiento y confianza, especialmente cuando las restricciones de PostgreSQL, las migraciones, el wiring de NestJS y los recorridos completos forman parte del comportamiento esperado.

## Opciones consideradas

### A. Solo pruebas unitarias

Validar servicios y componentes de forma aislada mediante dobles, sin PostgreSQL real ni recorridos HTTP completos.

### B. Principalmente pruebas E2E

Validar la mayor parte del sistema mediante la aplicación completa, API y base de datos, con pocas pruebas aisladas.

### C. Pruebas unitarias, integración PostgreSQL y E2E

Combinar pruebas rápidas de reglas aisladas, pruebas de repositorios y composición con PostgreSQL real, y recorridos E2E para los contratos y flujos críticos.

## Matriz de decisión

La valoración es cualitativa y no prescribe porcentajes de distribución entre niveles.

| Criterio | Importancia | A. Solo unitarias | B. Principalmente E2E | C. Estrategia combinada |
| --- | --- | --- | --- | --- |
| Velocidad de feedback | Alta | Alta | Baja | Alta |
| Confianza en flujos completos | Alta | Baja | Alta | Alta |
| Detección de errores de integración | Alta | Baja | Alta | Alta |
| Reproducibilidad | Alta | Alta | Media | Alta |
| Coste de mantenimiento | Media | Alta | Baja | Media |
| Aislamiento de fallos | Alta | Alta | Baja | Alta |
| Verificación de PostgreSQL y Prisma reales | Alta | Baja | Alta | Alta |

## Decisión

Adoptar una estrategia combinada:

- pruebas unitarias para reglas, servicios, adaptadores y errores en aislamiento;
- pruebas de integración con PostgreSQL real para repositorios, restricciones, migraciones y composición entre módulos;
- pruebas E2E para contratos REST/OpenAPI y recorridos críticos desde la API hasta persistencia.

Usar Jest para el backend conforme a ADR-002. Mantener la cobertura global mínima del 80 % como restricción existente del proyecto, sin fijar porcentajes artificiales por tipo de prueba. Ejecutar las suites que usan la base compartida de forma controlada para evitar interferencias entre limpiezas y fixtures.

## Por qué se elige frente a las demás

La opción A ofrece feedback rápido, pero no detecta fallos de migración, wiring, serialización o restricciones reales. La opción B ofrece confianza en recorridos completos, pero hace más lenta y difícil de aislar la mayoría de las regresiones. La opción C utiliza cada nivel donde aporta más valor y está respaldada por las suites actuales del repositorio.

## Consecuencias

### Positivas

- Las reglas reciben feedback rápido y localizado.
- PostgreSQL, Prisma y las migraciones se verifican con infraestructura real.
- Los endpoints y flujos principales se comprueban de extremo a extremo.
- Las regresiones pueden localizarse en el nivel más cercano a su causa.
- La cobertura mínima se aplica sobre una suite con distintos niveles de confianza.

### Negativas y deuda aceptada

- Deben mantenerse fixtures, limpieza de base de datos y utilidades de arranque.
- Las suites de integración y E2E requieren PostgreSQL disponible y son más lentas.
- La base compartida obliga a serializar actualmente parte de la ejecución.
- Los E2E pueden ser más sensibles a cambios de contrato y composición.
- Mantener pruebas en varios niveles incrementa el volumen total de código de prueba y exige evitar duplicaciones innecesarias.

## Trazabilidad y sincronización

- Arquitectura: [docs/architecture.md](../architecture.md)
- Evidencia P9: [docs/practicas/p9-adrs.md](../practicas/p9-adrs.md)
- Contexto de agentes: [openspec/config.yaml](../../openspec/config.yaml)
- Definition of Done: [docs/planificacion/definition-of-done.md](../planificacion/definition-of-done.md)
- Configuración Jest y cobertura: [backend/jest.config.js](../../backend/jest.config.js)
- Suites backend: [backend/test](../../backend/test)
- CI con PostgreSQL: [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- Entorno local: [docker-compose.yml](../../docker-compose.yml)
- Estrategias por cambio: [captura](../../openspec/changes/captura-automatica-rss/design.md), [noticias](../../openspec/changes/almacenamiento-noticias-metadatos/design.md), [periodicidad](../../openspec/changes/config-periodicidad/design.md), [fuentes](../../openspec/changes/gestion-crud-rss/design.md) y [actualización manual](../../openspec/changes/actualizacion-manual-rss/design.md)
