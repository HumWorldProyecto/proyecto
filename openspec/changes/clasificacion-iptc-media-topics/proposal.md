## Why

La Issue [#17 — HU-16 Clasificación mediante IPTC Media Topics](https://github.com/HumWorldProyecto/proyecto/issues/17) exige clasificar las noticias mediante IPTC Media Topics y devolver la clasificación junto con cada noticia. El modelo `News`, el flujo de persistencia y `GET /api/v1/news` todavía no contienen esa información. La historia tampoco define el nivel de la taxonomía, el mecanismo de asignación, la persistencia, el contrato de respuesta ni el tratamiento de una noticia no clasificable; este cambio propone esas decisiones para revisión antes de implementar.

## What Changes

- Incorporar como catálogo inicial los 17 conceptos de primer nivel de IPTC Media Topics, usando sus QCodes, URI canónicas y etiquetas oficiales en español de la publicación IPTC del 2 de julio de 2026.
- Clasificar automáticamente y por separado el título y la descripción de cada noticia identificable nueva, y combinar después sus QCodes mediante el contrato bilingüe, determinista y versionado de `editorial-manifest.md`, sin llamadas de red ni dependencias nuevas.
- Permitir de cero a varios temas por noticia. Una noticia sin coincidencias válidas se conserva como no clasificada.
- Persistir en `News` únicamente los QCodes oficiales asignados mediante una migración aditiva. Los registros existentes reciben una colección vacía y no se reclasifican en HU-16.
- Exponer en cada elemento de `GET /api/v1/news` una propiedad `mediaTopics` con `qcode`, `uri` y `label`; cuando no exista clasificación, devolver `mediaTopics: []`.
- Mantener sin cambios el contrato `CaptureOutputPort`, el parser RSS, los endpoints y respuestas de captura, el scheduling, la deduplicación y los metadatos REST ya existentes.
- Si el clasificador no puede determinar un tema o falla, registrar el fallo de clasificación, persistir la noticia sin temas y continuar el lote. Los fallos reales de PostgreSQL mantienen el manejo de persistencia existente y nunca se convierten en clasificaciones vacías.
- Mantener Node 24, NestJS 10.4, Prisma 6, PostgreSQL 16 y Jest 29, sin dependencias adicionales.

Las decisiones funcionales y editoriales quedan cerradas en este cambio: 17 temas raíz, asignación automática de cero a varios temas, entradas de título y descripción, reglas exactas en español e inglés, ausencia de backfill y ninguna dependencia nueva. La implementación deberá reproducir el manifiesto sin ampliar vocabulario durante `apply`.

**Fuera de alcance:**

- La taxonomía completa de más de 1.200 conceptos o niveles inferiores a los 17 temas raíz.
- Clasificación manual, corrección editorial, CRUD de temas o nuevos endpoints de escritura.
- Servicios externos, LLM, modelos NLP, nuevas librerías o credenciales.
- Reclasificación histórica, reentrenamiento, métricas de confianza, ranking, filtros y agregaciones por tema.
- Cambios en captura RSS, sentimiento, frontend, HU-14 o P10.

## Capabilities

### New Capabilities

- `clasificacion-iptc-media-topics`: asignación automática y persistente de temas IPTC oficiales y disponibilidad de la clasificación junto con cada noticia.

### Modified Capabilities

- `almacenamiento-noticias-metadatos`: el listado existente añade `mediaTopics` a cada noticia sin alterar los demás campos ni el comportamiento de captura y deduplicación.

## Impact

- Nuevo límite funcional `backend/src/classification/**` para el catálogo oficial, el puerto del clasificador y la implementación determinista.
- `backend/src/news/**` para coordinar la clasificación no bloqueante, persistir QCodes y mapearlos al contrato REST.
- `backend/prisma/schema.prisma` y una migración nueva, aditiva y posterior a las migraciones presentes en `main` al comenzar la implementación.
- `backend/test/classification/**`, `backend/test/news/**` y pruebas de captura para reglas, persistencia PostgreSQL 16, API y regresiones.
- `docs/architecture.md`, ADR-002, ADR-003, ADR-004 y ADR-005 se respetan. No se propone un ADR nuevo mientras la solución sea interna, determinista y sin tecnología adicional. Una integración externa, un modelo NLP o una dependencia nueva requerirían aprobación previa y reevaluación de ADR.

HU-14 no es una dependencia funcional. Si PR #40 entra en `main` antes de implementar HU-16, la rama de implementación deberá actualizarse primero para conservar `RssSource.continent`, crear la migración HU-16 después de `20261001000000_add_rss_source_continent` y reconciliar el fixture compartido de integración de noticias.
