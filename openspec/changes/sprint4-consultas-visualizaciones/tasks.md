# Tasks

## 1. País y evidencia persistida

- [x] 1.1 Añadir migración aditiva y catálogo geográfico local con procedencia; verificar Prisma validate/generate y pruebas de migración vacío/upgrade sin alterar datos históricos.
- [x] 1.2 Conservar términos del mismo análisis sin cambiar motor ni respuestas existentes; verificar unitarias e integración de reanálisis, snapshot y contratos.

## 2. Consultas HU-08 y HU-09

- [x] 2.1 Implementar puertos/repositorio/servicio de consulta, filtros, cobertura y fórmulas; verificar unitarias de geografía, fechas, media, nube y ranking.
- [x] 2.2 Publicar API y asignación explícita de país con OpenAPI y documentación; verificar E2E válidos/400/404/503 y preservación HU-14/16/17.

## 3. Presentación Sprint 4

- [x] 3.1 Crear frontend ratificado y cliente cancelable con filtros, resumen y detalle HU-08/09; verificar build y pruebas RTL de carga/error/vacío/carrera/selección temporal.
- [x] 3.2 Implementar mapa HU-11 y evolución Chart.js con alternativas textuales y GeoJSON local; verificar adaptadores, interacción y procedencia de datos.
- [x] 3.3 Implementar nube HU-12 y ranking HU-13 explicables, detalle y asignación de país; verificar influencia, ausencia de evidencia, accesibilidad y enlaces seguros.
- [x] 3.4 Documentar uso y entorno Docker separado; verificar arranque y recorrido visual con backend real y datos aislados.

## 4. Integración verificable

- [x] 4.0 Aplicar parches compatibles de proxy-addr/handlebars heredados; verificar ausencia de avisos críticos y regresión sin cambiar stack.

- [x] 4.1 Sincronizar estado frontend en arquitectura/contexto sin cambiar decisiones; verificar conformidad por capas y alcance de cinco HU.
- [x] 4.2 Incorporar CI frontend/OpenSpec; ejecutar strict, Prisma, builds, Jest y Vitest con cobertura >=80; guardar evidencia y comprobar diff/contratos históricos.
- [x] 4.3 Confirmar main y SHA de la rama, publicar una PR limpia y comprobar CI; entregar enlaces, estado real, revisión humana pendiente y siguiente paso.

## Workflow follow-up

- La aprobación y fusión de la PR pertenecen a una persona. Actualizar Done únicamente cuando la integración esté comprobada.
- No archivar automáticamente mientras falte la revisión requerida por el proyecto.
