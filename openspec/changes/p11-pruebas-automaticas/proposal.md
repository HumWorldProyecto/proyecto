# P11: pruebas automáticas de HumWorld

## Why

Aplicar la práctica P11 entregada por el usuario al proyecto existente. Main verificado el 21-10-2026: `5e4d27c3fe89eeb3fd2fca26b3fa0799b11bbb04`. Sprint 4 sigue en PR #45 y no se modifica. Ya existen pruebas y umbral 80 %, pero faltan informes JUnit/XML conservados por Actions y evidencia de fallo deliberado/corrección en una PR.

## What Changes

- Ocho nuevos casos derivados de escenarios existentes, con AAA, clasificación y fixtures aisladas.
- Medición antes/después y análisis de dos zonas no ejercitadas.
- Informes JUnit y Cobertura XML, artefactos incluso cuando fallen pruebas y ejecución en PR/push a main.
- Demostración controlada: un commit de aserción incorrecta en PR draft, check rojo real y commit posterior de corrección con check verde. Nunca fusionar el fallo ni activar auto-merge.
- Guía de reproducción, trazabilidad y registro veraz de la asistencia y revisiones.

AGENDA/FastAPI/SQLite/pytest son el ejemplo docente; se mantienen HumWorld/NestJS/PostgreSQL/Jest (ADR-002/005). La autorización actual para P11 incluye ampliar el pipeline como exige su actividad 4.7; no se reimplementa P10 ni se tocan sus otros contenidos. No se crean funcionalidades, contratos, migraciones ni requisitos de negocio.

## Capabilities

### New Capabilities

Ninguna capacidad funcional nueva. `skip_specs: true`: se prueban contratos aprobados en captura-automatica-rss, gestion-crud-rss, persistencia-valor-humor y clasificacion-iptc-media-topics.

### Modified Capabilities

Ninguna. Las expectativas se contrastan con los contratos reales (por ejemplo, 400/404 de HumWorld en vez de copiar 422 de AGENDA).

## Impact

Solo pruebas, configuración/reportes de Jest, pipeline y documentación. Se conserva Node 24/NestJS 10/Jest 29/Prisma 6/PostgreSQL 16. ADR-002/004/005 aplicables, sin cambios de arquitectura ni dependencias nuevas. Revisión técnica de propuestas registrada antes de implementar; revisión y fusión humanas pendientes en la PR. Codex asiste esta ejecución; no se atribuye actividad no realizada a Copilot ni a una persona.
