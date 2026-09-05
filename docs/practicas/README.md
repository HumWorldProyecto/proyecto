# Recap de prácticas — Equipo 5

Este recap distingue los hechos verificables de los antecedentes que todavía requieren confirmación o evidencia del equipo.

## P1 — Equipo

El Equipo 5 está constituido por:

- Benjamin Gallegos
- Eduardo Diaz
- Felipe Sanhueza
- Daniel Rossel
- Felipe Levi
- Tomas Heilenkotter

Este repositorio no conserva actualmente el guion de P1, por lo que no se reconstruyen tareas ni entregables adicionales que no puedan verificarse.

## P2 — Agentes IA

Se configuró un entorno de apoyo con IA compuesto por:

- Gem de Gemini **«Mentor HumWorld - Equipo 5»**;
- proyecto ChatGPT **«Product Owner y Arquitecto Equipo 5»**;
- NotebookLM colaborativo del proyecto.

Las herramientas fueron compartidas con el equipo.

El proyecto ChatGPT ha sido utilizado como apoyo para:

- backlog;
- refinamiento de historias;
- planificación;
- decisiones de arquitectura;
- ADR;
- OpenSpec;
- revisión técnica.

## P3 — Planificación

La planificación documenta:

- backlog funcional de 21 historias de usuario;
- cuatro épicas;
- cinco sprints;
- Sprint Goals;
- fecha de verificación formal: **02-11-2026**;
- Definition of Done formalizada en esta rama documental;
- Planning Poker de Sprint 1 completado con escala Fibonacci;
- **31 Story Points** totales para Sprint 1;
- HU-15: 8 SP;
- HU-18: 5 SP;
- HU-01: 13 SP;
- HU-04: 5 SP.

La evidencia consolidada está en [docs/planificacion](../planificacion/).

## P4 — Software Factory

Se registran como realizados:

- organización y repositorio en GitHub;
- Issues funcionales;
- GitHub Project;
- estrategia de ramas y Pull Requests;
- workflow **«Primer Pipeline»**;
- separación posterior entre historias de usuario y actividades técnicas.

## P5 — OpenSpec

Se realizó:

- inicialización de OpenSpec;
- adopción del flujo `Proposal → Spec → Design → Tasks → aprobación humana → implementación`;
- cambios OpenSpec para HU-01, HU-02, HU-04, HU-15 y HU-18;
- trazabilidad entre historias de usuario y especificaciones refinadas.

Hitos verificables: [PR #24 — inicialización de OpenSpec](https://github.com/HumWorldProyecto/proyecto/pull/24), [PR #25 — OpenSpec HU-01](https://github.com/HumWorldProyecto/proyecto/pull/25) y [PR #27 — OpenSpec HU-02/HU-04/HU-15/HU-18](https://github.com/HumWorldProyecto/proyecto/pull/27).

## P6 — Arquitectura y contexto

Se formalizaron:

- [arquitectura de HumWorld](../architecture.md);
- instrucciones de contexto permanente para asistentes;
- [ADR-002](../adr/ADR-002-stack-node-nest-prisma-jest.md);
- [ADR-003](../adr/ADR-003-captura-rss-y-scheduling.md);
- baseline Node.js 24, NestJS, PostgreSQL, Prisma y Jest;
- decisiones de captura RSS y scheduling.

El [PR #26](https://github.com/HumWorldProyecto/proyecto/pull/26) conserva el hito inicial de arquitectura y contexto.

## P7 — Git, PR y CI

El repositorio evidencia:

- trabajo mediante ramas;
- commits y publicación de ramas;
- Pull Requests;
- revisión humana;
- GitHub Actions;
- merge a `main`;
- `main` estable después de la integración.

Hitos recientes:

- [PR #28 — integración P7 previa](https://github.com/HumWorldProyecto/proyecto/pull/28).
- [PR #29 — «[Sprint 1] Completar captura RSS, fuentes, periodicidad y persistencia»](https://github.com/HumWorldProyecto/proyecto/pull/29).
- Merge commit de PR #29: `c4969d7b7c34410be6407b36ee63ed6119f024e4`.
- Workflow post-merge **«Primer Pipeline»** finalizado correctamente sobre ese commit.
