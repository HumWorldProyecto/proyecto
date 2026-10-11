## Why

La Issue [#7 — HU-06 Persistencia del valor de humor](https://github.com/HumWorldProyecto/proyecto/issues/7) exige conservar el valor calculado junto con la noticia y recuperarlo en consultas posteriores. HU-05 ya calcula de forma determinista `{ newsId, score, matchedTerms }` para una noticia y un idioma explícito, pero el resultado es efímero. Falta persistir el último análisis, ofrecer una activación explícita y exponer el valor almacenado sin alterar captura, deduplicación ni clasificación IPTC.

## What Changes

- Extender `News` mediante una migración aditiva con `sentimentScore`, `sentimentMatchedTerms`, `sentimentLanguage` y `sentimentAnalyzedAt`, todos anulables y sin valores por defecto.
- Representar una noticia nunca analizada con los cuatro campos nulos. Un análisis válido sin evidencia se conserva como score `0`, cero coincidencias, idioma y fecha, por lo que no se confunde con la ausencia de análisis.
- Restringir en PostgreSQL el score a `[-1, 1]`, las coincidencias a enteros no negativos, el idioma a `es | en` mediante el enum ya aportado por HU-17 y el conjunto de campos a estados completos o totalmente nulos.
- Reutilizar `NewsSentimentAnalysisService` de HU-05 para calcular el resultado; HU-06 no duplica el motor, la normalización, el matching, el diccionario ni la fórmula.
- Añadir un caso de uso que calcule primero y, solo tras un análisis exitoso, persista atómicamente el último resultado mediante un puerto de repositorio.
- Proponer `POST /api/v1/news/:id/sentiment` con `{ "language": "es" | "en" }` como activación explícita. Una respuesta satisfactoria devuelve `200` con el resultado que quedó persistido.
- Extender aditivamente `GET /api/v1/news` con `sentiment`, anulable, para recuperar el último análisis sin ejecutar uno nuevo.
- Definir el reanálisis como una solicitud POST explícita que reemplaza atómicamente el resultado anterior. Cambios del diccionario no recalculan noticias por sí solos.
- Conservar títulos, descripciones, identificadores, datos RSS y `mediaTopicQcodes`; la captura de un duplicado mantiene el resultado persistido.
- Documentar y probar migración, contrato REST, concurrencia, fallos y compatibilidad con HU-14, HU-16 y HU-17 sobre PostgreSQL 16.

**Fuera de alcance:**

- Analizar automáticamente durante captura, scheduling, lectura o cambios del diccionario.
- Inferir o traducir el idioma; el consumidor selecciona `es` o `en`.
- Mantener historial o versiones de análisis, hacer backfill o recalcular noticias antiguas.
- Persistir solicitudes de HU-10 o cambiar `POST /api/v1/sentiment/analyze`.
- Modificar el algoritmo HU-05, las reglas HU-07, el diccionario HU-17 o la clasificación HU-16.
- Añadir tablas, dependencias, servicios externos, colas, jobs o cambios de arquitectura.

## Capabilities

### New Capabilities

- `persistencia-valor-humor`: persistencia, reanálisis explícito y recuperación del último resultado de sentimiento asociado a una noticia.

### Modified Capabilities

- `almacenamiento-noticias-metadatos`: la representación de lectura de una noticia incorpora un objeto `sentiment` anulable, sin cambiar la captura ni los campos existentes.

## Impact

- `backend/prisma/schema.prisma` y una migración Prisma aditiva posterior a las migraciones pendientes de HU-14, HU-16 y HU-17.
- `backend/src/sentiment/**`: contrato de persistencia, adaptador Prisma, caso de uso, DTO, controller, composición y errores HTTP sanitizados.
- `backend/src/news/types/news.ts`, `backend/src/news/repositories/prisma-news.repository.ts` y `backend/src/news/dto/news-response.dto.ts`: lectura y exposición del último análisis.
- `docs/openapi.json`: nuevo POST y ampliación aditiva de la respuesta de News.
- Pruebas unitarias, E2E y de integración con PostgreSQL 16; regresión completa con cobertura global mínima del 80 %.
- Dependencia funcional de HU-17 y HU-05. La reconciliación con HU-16 debe conservar `mediaTopicQcodes`/`mediaTopics`; HU-14 no comparte columnas de News.
- Se respetan ADR-002, ADR-004 y ADR-005. ADR-003 permanece sin cambios y ADR-006 continúa propuesto. No se requiere un ADR nuevo porque la solución usa el stack y las capas ya aprobados.

La activación HTTP, la forma exacta de la respuesta y la política de reemplazo exceden los dos criterios mínimos de Issue #7. Por ello este cambio se detiene para una única aprobación humana de ese contrato antes de implementar.
