# ADR-004: Adoptar un monolito modular con separación de responsabilidades

- **Estado:** Aceptado
- **Fecha:** 2026-09-23
- **Responsables:** Equipo 5
- **Relacionado con:** [ADR-002](ADR-002-stack-node-nest-prisma-jest.md), [ADR-003](ADR-003-captura-rss-y-scheduling.md), [ADR-005](ADR-005-estrategia-combinada-de-pruebas.md), P6 y P9

## Problema, elemento de arquitectura sobre el que decidir

HumWorld debe organizar capacidades de fuentes, captura, periodicidad, noticias y futuras funciones de análisis sin asumir complejidad operacional innecesaria. La estructura debe impedir que la API, los procesos programados o las integraciones concentren reglas de negocio o accedan directamente a persistencia, y debe permitir que el sistema evolucione con límites comprensibles y comprobables.

## Opciones consideradas

### A. Monolito sin límites internos claros

Mantener un único despliegue, permitiendo que controllers, servicios, persistencia e integraciones se relacionen sin contratos o módulos explícitos.

### B. Monolito modular con responsabilidades separadas

Mantener un único despliegue y organizar las capacidades mediante módulos, API, servicios o casos de uso, puertos, repositorios, integraciones y jobs con dependencias dirigidas hacia la lógica de negocio.

### C. Microservicios

Separar capacidades en servicios desplegables de forma independiente, con comunicación remota, contratos distribuidos y operación individual.

## Matriz de decisión

La matriz usa valoraciones cualitativas para el alcance actual. **Alta**, **Media** y **Baja** representan adecuación relativa al criterio.

| Criterio | Importancia | A. Monolito sin límites | B. Monolito modular | C. Microservicios |
| --- | --- | --- | --- | --- |
| Mantenibilidad | Alta | Baja | Alta | Media |
| Control del acoplamiento | Alta | Baja | Alta | Alta |
| Complejidad operacional | Alta | Alta | Alta | Baja |
| Simplicidad de despliegue | Alta | Alta | Alta | Baja |
| Testabilidad | Alta | Media | Alta | Media |
| Evolución de capacidades | Alta | Baja | Alta | Alta |
| Escalabilidad independiente | Media | Baja | Baja | Alta |
| Adecuación al tamaño y alcance actuales | Alta | Media | Alta | Baja |

## Decisión

Adoptar un monolito modular como estilo vigente. Separar la entrada HTTP, los servicios o casos de uso, los contratos de persistencia e integración, los adaptadores concretos y los jobs. Mantener un único sistema desplegable mientras la escala y las necesidades operativas no justifiquen una topología distribuida.

Los controllers validan y traducen HTTP, y delegan en servicios. Los servicios coordinan reglas y puertos. Los repositorios encapsulan PostgreSQL y Prisma. Las integraciones encapsulan HTTP, RSS y otros sistemas externos. Los jobs disparan casos de uso y no duplican su lógica.

## Por qué se elige frente a las demás

La opción B conserva la simplicidad operativa y de despliegue de un monolito, pero introduce límites internos que la opción A no ofrece. Los microservicios son una alternativa válida cuando existen necesidades de escalado, autonomía o despliegue independiente; en el alcance actual, su comunicación distribuida, observabilidad, consistencia y operación añadirían un coste que no está justificado.

## Consecuencias

### Positivas

- Los módulos expresan capacidades y dependencias explícitas.
- La API y los jobs reutilizan casos de uso en lugar de duplicar lógica.
- Los servicios pueden probarse mediante puertos y dobles.
- Prisma y los detalles externos quedan aislados en adaptadores.
- El sistema conserva un despliegue y una operación sencillos.

### Negativas y deuda aceptada

- Los límites modulares dependen de disciplina y revisión; un único proceso no los impone físicamente.
- El sistema se despliega como una unidad y no permite escalar módulos de forma independiente.
- Un fallo grave del proceso puede afectar todas las capacidades.
- Una futura separación distribuida exigirá revisar contratos, transacciones, observabilidad y operación mediante un nuevo ADR.
- La introducción de puertos y adaptadores añade archivos y abstracciones frente a un monolito sin límites.

## Trazabilidad y sincronización

- Arquitectura: [docs/architecture.md](../architecture.md)
- Evidencia P9: [docs/practicas/p9-adrs.md](../practicas/p9-adrs.md)
- Contexto de agentes: [openspec/config.yaml](../../openspec/config.yaml)
- Instrucciones permanentes: [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
- OpenSpec: [captura](../../openspec/changes/captura-automatica-rss/design.md), [noticias](../../openspec/changes/almacenamiento-noticias-metadatos/design.md), [periodicidad](../../openspec/changes/config-periodicidad/design.md), [fuentes](../../openspec/changes/gestion-crud-rss/design.md) y [actualización manual](../../openspec/changes/actualizacion-manual-rss/design.md)
- Composición raíz: [backend/src/app.module.ts](../../backend/src/app.module.ts)
- Módulos implementados: [backend/src](../../backend/src)
- Puertos y adaptadores: [backend/src/capture/ports](../../backend/src/capture/ports), [backend/src/news/ports](../../backend/src/news/ports) y [backend/src/sources/ports](../../backend/src/sources/ports)
