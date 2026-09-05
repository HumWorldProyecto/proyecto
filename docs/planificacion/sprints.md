# Sprints, Sprint Goals e historias

| Sprint | Fechas | Sprint Goal | Historias | Entregable esperado | Estimación |
| --- | --- | --- | --- | --- | --- |
| Sprint 1 | 24-08-2026 → 06-09-2026 | Disponer del flujo base de captura RSS y persistencia, permitiendo administrar fuentes, configurar la periodicidad, capturar automáticamente y almacenar noticias. | HU-15, HU-18, HU-01, HU-04 | Flujo base integrado de fuentes RSS, periodicidad, captura y persistencia. | 31 SP (HU-15: 8, HU-18: 5, HU-01: 13, HU-04: 5) |
| Sprint 2 | 07-09-2026 → 20-09-2026 | Completar las capacidades de adquisición y enriquecimiento inicial de noticias mediante carga geográfica, clasificación y actualización manual. | HU-14, HU-16, HU-02, HU-03 | Carga geográfica, clasificación y actualización manual de fuentes. | No estimado todavía; se realizará en el Sprint Planning correspondiente |
| Sprint 3 | 21-09-2026 → 04-10-2026 | Implementar el núcleo de análisis de sentimiento, soporte bilingüe, análisis directo y administración del diccionario. | HU-05, HU-06, HU-07, HU-10, HU-17 | Núcleo de sentimiento, soporte bilingüe, análisis directo y diccionario. | No estimado todavía; se realizará en el Sprint Planning correspondiente |
| Sprint 4 | 05-10-2026 → 18-10-2026 | Exponer y visualizar los resultados del humor mediante consultas geográficas, evolución temporal y visualizaciones de influencia. | HU-08, HU-09, HU-11, HU-12, HU-13 | Consultas y visualizaciones geográficas, temporales y de influencia. | No estimado todavía; se realizará en el Sprint Planning correspondiente |
| Sprint 5 | 19-10-2026 → 01-11-2026 | Completar el ciclo de vida de las noticias mediante configuración de caducidad y purgado automático/manual, dejando el sistema preparado para la verificación formal. | HU-19, HU-20, HU-21 | Configuración de caducidad y purgado automático/manual. | No estimado todavía; se realizará en el Sprint Planning correspondiente |

## Planning Poker — Sprint 1

El equipo utilizó la escala Fibonacci. La estimación representa complejidad, incertidumbre, riesgo y esfuerzo relativo, no horas. El agente Product Owner/Arquitecto participó como contrapunto experto; el equipo discutió las estimaciones y adoptó el consenso final de **31 Story Points** para Sprint 1.

| Historia | Issue | Voto agente experto | Consenso final |
| --- | --- | --- | --- |
| HU-15 | [#16](https://github.com/HumWorldProyecto/proyecto/issues/16) | 8 | 8 |
| HU-18 | [#19](https://github.com/HumWorldProyecto/proyecto/issues/19) | 5 | 5 |
| HU-01 | [#2](https://github.com/HumWorldProyecto/proyecto/issues/2) | 13 | 13 |
| HU-04 | [#5](https://github.com/HumWorldProyecto/proyecto/issues/5) | 5 | 5 |

### Justificación

- **HU-01 — 13 SP:** mayor incertidumbre relativa por captura externa, RSS, scheduling, timeouts, redirects, aislamiento por fuente, seguridad y solapamiento.
- **HU-15 — 8 SP:** CRUD más validación de accesibilidad, URL, DNS/IP, SSRF, redirects y desactivación/reactivación.
- **HU-18 — 5 SP:** configuración persistente, catálogo y reprogramación dinámica.
- **HU-04 — 5 SP:** modelo, relación con fuente, identidad GUID/link, deduplicación y persistencia.
