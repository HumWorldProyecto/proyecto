## Why

La Issue [#11 — HU-10 Análisis directo de texto mediante API](https://github.com/HumWorldProyecto/proyecto/issues/11) requiere analizar texto proporcionado por un consumidor sin crear ni consultar una noticia RSS. HU-05 ya aporta el motor determinista `SentimentAnalyzerPort` y HU-17 el diccionario administrable; falta un caso de uso HTTP que los exponga con un contrato validado y documentado.

## What Changes

- Exponer `POST /api/v1/sentiment/analyze` con JSON `{ "text": string, "language": "es" | "en" }`.
- Invocar el `SentimentAnalyzerPort` de HU-05 con el texto como un único segmento y devolver exactamente `{ score, matchedTerms }`.
- Rechazar cuerpos, textos e idiomas inválidos; limitar el texto a 10.000 puntos de código Unicode para acotar el coste de CPU y memoria.
- Responder `200` para análisis válidos, incluidos texto sin coincidencias y diccionario vacío; `400` para entrada inválida, `413` para texto superior al límite, `503` para indisponibilidad del diccionario y `500` para fallos inesperados sanitizados.
- Añadir DTO, controller, caso de uso, Swagger, OpenAPI estático y pruebas unitarias, E2E e integración con PostgreSQL 16.
- Mantener la clasificación determinista, la normalización, el matching, la fórmula y el redondeo definidos por HU-05, sin duplicarlos.

**Fuera de alcance:**

- Detección automática de idioma, traducción, NLP, LLM o servicios externos.
- Guardar el texto o el resultado, crear noticias o modificar Prisma.
- Cambiar captura RSS, deduplicación, scheduling, clasificación IPTC o contratos REST existentes.
- Añadir dependencias, autenticación o rate limiting global.

## Capabilities

### New Capabilities

- `analisis-directo-texto-api`: análisis efímero de un texto explícito en español o inglés mediante la API REST versionada.

### Modified Capabilities

Ninguna. HU-10 consume sin modificar los contratos de HU-05 y HU-17.

## Impact

- `backend/src/sentiment/**`: DTO de entrada/salida, servicio de aplicación, controller y composición del módulo.
- `backend/test/sentiment/**`: pruebas de validación, delegación, errores, determinismo y recorrido E2E con PostgreSQL 16.
- `docs/openapi.json`: publicación del nuevo endpoint y sus esquemas.
- Sin cambios en `backend/prisma/**`, dependencias, News, Capture, scheduling ni frontend.
- Se respetan ADR-002, ADR-004 y ADR-005. ADR-003 no se modifica y no hace falta un ADR nuevo.
- La rama depende de los commits todavía no integrados de HU-17 y HU-05, por lo que no debe abrirse PR a `main` hasta reconciliar esas dependencias.
