# Sprint 4: consultas y visualizaciones

## Why

HU-05/06/07/10 ya están integradas mediante PR #44 en main `5e4d27c3fe89eeb3fd2fca26b3fa0799b11bbb04`. Falta convertir el último análisis persistido en consultas comprensibles. HU-08, HU-09, HU-11, HU-12 y HU-13 forman un único incremento funcional del Sprint 4.

## What Changes

- Consultar humor global, por continente y país; evolución por fecha y detalle de las noticias que componen el resultado.
- Asignar explícitamente el país de una fuente RSS como prerrequisito de estas consultas, sin inferirlo de noticias ni dominios.
- Conservar las palabras y pesos utilizados junto al último análisis; exponer cobertura y ausencia de evidencia.
- Implementar el primer frontend con mapa, evolución, nube de palabras y ranking de noticias influyentes.
- Añadir contratos, migración aditiva, pruebas, entorno Docker y CI del frontend.

El usuario revisó y aprobó el 20-10-2026: país de la fuente asignado por administrador; fecha de publicación o captura, último análisis; promedio solo de noticias con coincidencias; palabras del análisis guardado y contribución de cada noticia al promedio. Solicitó ejecutar el Sprint 4 completo en una PR. Estos criterios preceden a la implementación.

Fuera de alcance: Sprint 5, autenticación/roles nuevos, inferencia geográfica, historial de reanálisis, nuevo motor de sentimiento, cambio de captura, P10 y modificación de migraciones históricas. La fusión continúa siendo humana.

## Capabilities

### New Capabilities

- `consultas-humor`: HU-08/HU-09, contexto geográfico, evidencia persistida y agregación verificable.
- `dashboard-humor`: HU-11/HU-12/HU-13 y presentación web de las consultas.

### Modified Capabilities

Ninguna especificación principal cambia de contrato. Se preservan las capacidades y endpoints integrados de HU-14/HU-16/HU-17 y Sprint 3.

## Impact

Capas: frontend -> API analytics -> servicio -> puerto/repositorio -> PostgreSQL; extensión interna de sentimiento y geografía de fuentes. Migración únicamente aditiva. Baseline ratificado React/TypeScript/Vite, Leaflet, Chart.js, Vitest/RTL; backend Node 24/NestJS 10/Prisma 6/Jest. ADR-002/003/004/005 aplicables, sin sustitución ni cambio de estado de ADR-006. No se introduce otro framework ni servicio externo de ejecución.
