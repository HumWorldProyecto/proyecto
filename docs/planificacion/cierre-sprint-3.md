# Cierre integrado del Sprint 3

Registro preparado el 19 de octubre de 2026. **Actualización del 20 de octubre:** PR #44 aprobada y fusionada humanamente el 19 de octubre. Main `5e4d27c3fe89eeb3fd2fca26b3fa0799b11bbb04`, CI 39341853543 exitoso y Sprint 3 5/5 Done. Las secciones siguientes conservan el contexto previo a la fusión; el [estado vigente](avance-2026-10-20.md) incluye Sprint 4 y calendario.

## Base y alcance

HU-05 fue aprobada por `fsanhuezanez` y fusionada mediante squash en la PR #43. Esta rama parte del nuevo main `8de855b3da7e3a73587d502fff3251077817b689` y reúne únicamente el trabajo pendiente de HU-07 (#8), HU-10 (#11) y HU-06 (#7). HU-17, HU-14 y HU-16 ya están integradas y se conservan.

El equipo solicitó avanzar mediante menos PR y bloques funcionales más completos. Esta integración conjunta sustituye la secuencia anterior de tres PR separadas; las especificaciones y los commits siguen trazando cada historia individualmente. No modifica sus criterios funcionales ni autoriza una fusión automática.

## Resultado funcional

- HU-07: aceptación de noticias ES/EN con idioma explícito, aislamiento del diccionario y reutilización del motor HU-05.
- HU-10: `POST /api/v1/sentiment/analyze`, validación de entrada y errores sanitizados, sin guardar el texto ni el resultado.
- HU-06: `POST /api/v1/news/{id}/sentiment`, persistencia atómica del último análisis y lectura nullable mediante `GET /api/v1/news`.
- Se conservan captura RSS, deduplicación, scheduling, diccionario, continentes e IPTC. La recaptura de duplicados no borra el sentimiento.
- Se añade únicamente la migración aditiva `20261011000000_add_news_sentiment`; las cinco migraciones anteriores permanecen intactas.

## Verificación

- La composición funcional reaplicada coincide exactamente con el árbol preparado y probado en `9a5be31ca6fbf81b08720e981d9574f032d9d382`; no se arrastra el historial anterior al squash de HU-05/HU-17.
- Sobre el nuevo main: Prisma 6.19.3 validate/generate, build TypeScript/NestJS y seis migraciones desde base vacía aprobados en PostgreSQL 16.15 descartable.
- Jest completo: 70 suites y 690 pruebas aprobadas. Cobertura: 98,46 % statements, 93,31 % branches, 99,05 % functions y 98,41 % lines.
- OpenSpec strict: 13 elementos válidos. `git diff --check` aprobado.
- Comparación estructural de OpenAPI: se conservan todas las rutas y propiedades anteriores; se añaden los dos POST y `sentiment` en la lectura de News.
- Sin cambios en dependencias, fuentes, captura, clasificación, diccionario, frontend ni P10. El job CI de la propia PR debe terminar en verde antes de fusionar.

## Estado del producto

Antes de integrar esta PR hay 10 historias integradas: Sprints 1 y 2 completos, HU-17 y HU-05. Sprint 3 tiene 2/5 historias Done y 3 pendientes de esta integración. Tras revisión y fusión humanas, podrá verificarse su cierre 5/5 y actualizar el Project; no se declara terminado anticipadamente.

Sprint 3 debía terminar el 4 de octubre y sigue pendiente al día 19, con 15 días de desfase. El calendario original ya sitúa al equipo al inicio de Sprint 5. Agrupar PR reduce esperas de integración, pero no equivale a recuperar todo el calendario ni a implementar Sprint 4 o 5.

## Próximos bloques

1. Completar revisión, Actions y fusión humana de esta PR; comprobar el nuevo main y el cierre automático de las tres Issues enlazadas.
2. Sprint 4, bloque de consultas y visualización geográfica/temporal: HU-08, HU-09 y HU-11. Primero ratificar país de referencia, agregación, fecha temporal y tratamiento de resultados ausentes; mantener API, frontend y pruebas en un bloque coherente.
3. Sprint 4, bloque de influencia: HU-12 y HU-13. Ratificar la métrica de influencia y la evidencia por palabra, que no se puede deducir solo del score agregado.
4. Sprint 5: HU-19, HU-21 y HU-20 como bloque de configuración y ciclo de vida, reutilizando el caso de uso manual desde el job automático.

Cada bloque conserva OpenSpec revisado antes de implementar, pruebas aplicables, migraciones aditivas, CI y revisión humana. No se asignan fechas o Story Points sin Planning ni se cambian requisitos pendientes para acelerar artificialmente el cierre.
