## Why

La Issue [#8 — HU-07 Análisis de noticias en español e inglés](https://github.com/HumWorldProyecto/proyecto/issues/8) requiere producir resultados de sentimiento para noticias en ambos idiomas. La base HU-05 ya ofrece el caso de uso `NewsSentimentAnalysisService.analyzeNews({ newsId, language })` y el motor bilingüe basado en el diccionario HU-17. HU-07 debe verificar ese comportamiento como capacidad aceptada, sin duplicar implementación.

## What Changes

- Formalizar el contrato bilingüe de noticias: idioma explícito `es | en`, resultado `{ newsId, score, matchedTerms }` y diccionario aislado por idioma.
- Reconocer como implementación de HU-07 los contratos y componentes ya aportados por HU-05 y HU-17.
- Añadir pruebas de aceptación con PostgreSQL 16 para las fronteras bilingües que no están demostradas juntas en una prueba de noticia real.
- Reutilizar las pruebas HU-05 existentes para diccionario vacío, noticia inexistente, ausencia de coincidencias, segmentos independientes y ausencia de escritura.
- Mantener sin cambios el código productivo cuando la verificación confirme que no existe brecha funcional.

**Fuera de alcance:**

- Detectar automáticamente el idioma, traducir contenido o elegir idioma por metadatos.
- Exponer un endpoint, persistir el resultado o modificar `News`/Prisma.
- Cambiar el algoritmo, la normalización, el diccionario, la clasificación IPTC, RSS, deduplicación o scheduling.
- Añadir dependencias, NLP, LLM, APIs externas o servicios de pago.

## Capabilities

### New Capabilities

- `analisis-bilingue-noticias`: análisis efímero y determinista de una noticia existente en español o inglés mediante un idioma seleccionado explícitamente.

### Modified Capabilities

Ninguna. HU-07 consume los contratos existentes de HU-05 y HU-17 sin modificarlos.

## Impact

- Nuevo cambio OpenSpec `openspec/changes/analisis-bilingue-noticias/**`.
- Nueva suite de aceptación en `backend/test/sentiment/**` sobre la composición productiva existente.
- No se prevén cambios en `backend/src/**`, Prisma, migraciones, OpenAPI, dependencias, frontend, arquitectura ni ADR.
- Se respetan ADR-002, ADR-004 y ADR-005. ADR-003 no se modifica y ADR-006 continúa propuesto.
- La rama depende de HU-17 y HU-05, todavía ausentes de `main`; por ello no se abrirá PR a `main` hasta reconciliar esas dependencias.
