# Design

## Context

Ver proposal.md. Main verificado: `5e4d27c3fe89eeb3fd2fca26b3fa0799b11bbb04`, PR #44 fusionada por una persona y CI 39341853543 exitoso. Se leyeron docs/architecture.md, openspec/config.yaml, ADR-002/003/004/005 y el índice; ADR-006 sigue Propuesto. No hay contradicción ni sustitución arquitectónica.

## Goals / Non-Goals

Entregar las cinco HU en una PR verificable, preservando respuestas públicas anteriores y el motor de coincidencias. No incluir autenticación nueva, captura geográfica automática, historial, Sprint 5 ni P10. País de procedencia no equivale a lugar del acontecimiento.

## Decisions

### Decisiones funcionales revisadas

El usuario aprobó explícitamente los tres criterios de proposal.md antes de implementar. Se concretan en: media aritmética de valores persistidos con matchedTerms > 0; cero con coincidencias es neutral; ningún elegible produce null. Todos los conteos incluyen también noticias no analizadas y sin coincidencias. La geografía corresponde a la asignación actual de la fuente y sus cambios reclasifican consultas anteriores, sin alterar noticias. La fecha efectiva es pubDate ?? capturedAt, agrupada por día UTC. No existe serie histórica de cambios de análisis.

### API y capas

Nuevo módulo analytics: controlador valida DTO, servicio agrega, puerto separa el repositorio Prisma. `GET /api/v1/dashboards/humor` recibe `continent`, `country`, `from`, `to` opcionales; fechas YYYY-MM-DD reales, extremos inclusivos por día UTC, sin límite implícito cuando se omiten. País ISO alpha-2 del catálogo local; continente enum existente. País y continente incompatibles producen 400. Una lectura de noticias por consulta proporciona snapshot coherente para resumen, serie, países, nube y ranking. Las respuestas incluyen todas las noticias del alcance para detalle, orden determinista por fecha/id, sin truncamiento silencioso. No se añade paginación arbitraria que impida explicar el promedio.

`GET /api/v1/dashboards/geography` entrega catálogo local y fuentes con su país para configuración explícita. `PUT /api/v1/dashboards/sources/:id/geography`, body `{countryCode: string | null}`, actualiza país y continente derivado del catálogo cuando se asigna un país; al retirar país conserva el continente legado HU-14. 404 fuente inexistente, 400 entrada inválida, 503 fallo de persistencia sanitizado. No modifica contratos CRUD anteriores. La misma interfaz incluye selección de país de fuente, necesaria para las consultas. No se incorpora un esquema de autorización inexistente; mantiene la política de administración actual del proyecto.

El repositorio devuelve registros de noticias y su fuente; servicios no importan Prisma. Errores inesperados de lectura se convierten en 503 sin detalles internos. Los filtros de fecha se aplican al mismo instante efectivo que usa la serie. Noticias sin país pueden participar en mundo y continente legado, con conteo explícito de geografía no asignada.

### Evidencia y fórmulas

Extender el puerto del analizador con una operación de evidencia detallada y conservar analyze() con respuesta exacta previa. La selección de términos continúa usando normalización, frases más largas y ocurrencias sin solapamiento de HU-05/HU-10. La evidencia es array de `{term, language, weight, occurrences}` del único snapshot del diccionario usado. La operación persistente usa esa evidencia y guarda los cinco campos en una única actualización. Las operaciones públicas de HU-05/HU-07/HU-10 no incorporan campos adicionales.

Por conjunto con N elegibles, contribución de noticia = score / N; ranking descendente por abs(contribución), desempate fecha descendente/id. Por palabra, contribución = suma(weight * occurrences / (5 * matchedTerms * N)); magnitud = suma de valores absolutos de esas contribuciones, para que términos de signos opuestos no oculten frecuencia/influencia. Se agrupa por idioma y término normalizado, manteniendo signo neto, ocurrencias y número de noticias. El tamaño depende de magnitud; el detalle expone signo. El redondeo del score HU-05 puede producir diferencias mínimas frente a las contribuciones sin redondear: se informa y no se cambia el algoritmo ratificado. Evidencia histórica null cuenta aparte; no se atribuyen sus palabras al diccionario actual. No se recalcula automáticamente.

### Persistencia y datos cartográficos

Una nueva migración agrega `RssSource.countryCode` nullable y `News.sentimentTerms` JSONB nullable; restricciones validan forma básica y país de dos letras. No hay backfill ni edición de las seis migraciones anteriores. El catálogo local ISO alpha-2/continentes deriva de UNSD M49 (https://unstats.un.org/unsd/methodology/m49/). El mapa es GeoJSON Natural Earth de baja resolución, versionado y público (https://www.naturalearthdata.com/about/terms-of-use/), sin conexión a servicios de mapas en ejecución. Su procedencia, versión y transformaciones quedan documentadas. Los territorios sin geometría conservan su entrada textual; Antártida no se asigna a los seis continentes del modelo. No se afirma precisión de límites cartográficos.

### Frontend y entorno

React/TypeScript/Vite con los motores Leaflet y Chart.js ya ratificados, sin framework UI ni react wrappers adicionales. API en capa services; componentes solo consumen los tipos de respuesta. Carga cancelable y protección contra respuestas tardías; al cambiar filtros se retiran resultados anteriores. Interfaz española, responsive, navegación por teclado, leyenda y tabla alternativas al mapa/gráfico, detalle de noticias con texto escapado y enlaces http/https únicamente. Sin datos de demostración fingidos en producción. Pruebas Vitest/RTL con entorno DOM de prueba, dependencias de soporte necesarias documentadas en package.json; no cambia stack. Docker usa Node 24 y un servidor Vite de preview solo para demostración local reproducible, no como despliegue de producción. Proxy local /api evita una nueva política CORS. Compose adicional separado del volumen existente evita interferir con bases compartidas.

### Archivos previstos

backend/prisma/schema.prisma y nueva migración; backend/src/analytics/**; extensión interna de backend/src/sentiment/**; AppModule; backend/test/**; docs/openapi.json; frontend/** y datos locales; Dockerfiles y compose de demostración separados; .github/workflows/ci.yml; README y docs de uso/planificación. Actualizar referencias a frontend previsto cuando exista y se verifique. No cambiar ADR aceptados ni introducir nuevos requisitos.

### Verificación

Unitarias del motor (evidencia exacta, idioma, frases, repeticiones y compatibilidad), servicio analytics (filtros, media, denominadores, signos, fechas y legado); integración Prisma y E2E HTTP con PostgreSQL 16. Migración desde vacío y desde main con datos HU-14/16/17/06, restricciones y preservación comprobada. Jest completo con los umbrales globales >=80 en statements/branches/functions/lines. Frontend Vitest/RTL: filtros, errores, carrera, vacíos, selección temporal, nube, ranking, detalle, geografía y adaptadores gráficos. Build TypeScript/Vite, cobertura >=80 con umbral explícito. Verificación visual en navegador con API real y datos aislados de prueba, sin modificar la base del equipo. CI backend existente más frontend y validación strict del nuevo OpenSpec. Revisar diff sin arrastre de HU-17 ni migraciones viejas y SHA remoto antes de publicar.

## Risks / Trade-offs

- Fuentes sin país -> aviso y asignación explícita, nunca inferencia.
- Valores históricos sin palabras -> resumen válido, nube con cobertura parcial, reanálisis manual existente si se desea.
- Mapa de escala reducida -> lista accesible incluye todos los países consultados.
- Agregación en memoria -> prioriza coherencia y cálculo comprobable para el volumen del curso; no afirmar escalabilidad ilimitada. Evolución futura requiere medición y cambio propio.
- API administrativa sin autenticación heredada -> entorno local del proyecto; seguridad de publicación no se declara resuelta en estas HU.

## Migration Plan

Aplicar migración aditiva mediante Prisma Migrate; desplegar backend antes que frontend. Arranque de demostración en compose separado y datos/puertos propios. Rollback de aplicación puede volver a main conservando columnas adicionales sin borrar datos. No ejecutar down, reset ni recrear bases compartidas. Revisar y fusionar la PR humanamente; no cerrar Issues manualmente.
