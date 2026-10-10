## Context

HU-10 parte de `origin/hu05/analisis-sentimiento-noticias` en `bbbf7d857ce27125588a244534b206ffc0197183`. Esa base contiene el `SentimentAnalyzerPort`, el analizador determinista y el `DictionaryReaderPort` procedente de HU-17. La Issue #11 solo exige aceptar texto y devolver su sentimiento; el encargo de Sprint 3 fija además idioma explícito, validación, Swagger y ausencia de persistencia.

Aplican [ADR-002](../../../docs/adr/ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](../../../docs/adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) y [ADR-005](../../../docs/adr/ADR-005-estrategia-combinada-de-pruebas.md). El diseño conserva NestJS 10.4, el monolito modular y la estrategia combinada. ADR-003 permanece intacto.

```text
POST /api/v1/sentiment/analyze
            |
            v
AnalyzeTextRequestDto
            |
            v
DirectSentimentAnalysisService
            |
            v
SentimentAnalyzerPort (HU-05)
            |
            v
DictionaryReaderPort (HU-17) -> PostgreSQL 16
```

## Goals / Non-Goals

**Goals:**

- Publicar un contrato REST pequeño, estable y documentado.
- Reutilizar el motor HU-05 como única autoridad para normalización, matching y score.
- Acotar la entrada y distinguir fallos de validación, tamaño, diccionario e infraestructura.
- Verificar el flujo completo con el diccionario real sin persistir el texto ni el resultado.

**Non-Goals:**

- Inferir idioma, modificar el algoritmo o administrar el diccionario.
- Crear entidades, migraciones, columnas, seeds o trazabilidad de solicitudes.
- Alterar RSS, News, scheduling, deduplicación o clasificación.

## Decisions

### Contrato HTTP

El controller `SentimentController` se registrará en `SentimentModule` bajo `sentiment`. Su única operación será:

```http
POST /api/v1/sentiment/analyze
Content-Type: application/json

{"text":"La recuperación fue excelente","language":"es"}
```

Una solicitud válida responde `200`, porque calcula una representación sin crear un recurso:

```json
{"score":1,"matchedTerms":1}
```

El resultado del ejemplo depende de que `excelente` exista con peso `5`. No se promete ese valor sin dicha entrada. La respuesta contiene solo `score` y `matchedTerms`; no repite ni transforma el texto.

`AnalyzeTextRequestDto` exige un string `text` y un `language` de `es | en`. El texto debe contener al menos un carácter distinto de espacio. Campos adicionales se descartan mediante el `ValidationPipe` global ya existente. JSON mal formado, cuerpo ausente, tipos incorrectos, texto vacío o solo en blanco e idioma ausente/no admitido reciben `400`.

### Límite de entrada

El límite funcional es 10.000 puntos de código Unicode en `text`, medidos con `Array.from(text).length`. El conteo evita penalizar caracteres representados mediante pares sustitutos. El límite admite texto periodístico amplio y acota el trabajo lineal de normalización y matching sin añadir configuración ni dependencias. Superarlo recibe `413 Payload Too Large` antes de invocar el motor o leer el diccionario. Límites inferiores del servidor para un body JSON desproporcionado también pueden producir `413` antes del controller.

No se rechaza texto formado por puntuación o HTML: es una solicitud textual válida y HU-05 lo normaliza a cero coincidencias sin consultar el diccionario. Esta regla evita duplicar la normalización canónica en la capa HTTP.

### Caso de uso y reutilización

`DirectSentimentAnalysisService` depende únicamente de `SentimentAnalyzerPort`. Tras comprobar el límite, llama una vez a:

```ts
analyzer.analyze({ language, segments: [text] })
```

No importa el normalizador, el repositorio del diccionario ni Prisma. La validación sintáctica pertenece al DTO; el límite que protege el caso de uso se conserva en el servicio. Todo matching, idioma, snapshot, score y redondeo siguen en HU-05.

### Errores y códigos

| Condición | HTTP | Razón |
| --- | --- | --- |
| Análisis válido, sin coincidencias o diccionario vacío | 200 | Son resultados de negocio válidos |
| JSON/cuerpo/campos/texto/idioma inválido | 400 | El consumidor puede corregir la solicitud |
| Más de 10.000 puntos de código | 413 | El recurso excede el límite publicado |
| `SentimentDictionaryReadError` | 503 | La dependencia necesaria está temporalmente indisponible |
| Otro fallo inesperado | 500 | Fallo interno no clasificado |

Las respuestas de error no expondrán SQL, URL de conexión, credenciales ni mensajes internos. Un fallo del diccionario nunca se convierte en `{ score: 0, matchedTerms: 0 }`.

### Persistencia y efectos laterales

HU-10 no introduce repositorios ni operaciones de escritura. El texto vive únicamente durante la solicitud. El endpoint no crea noticias y no toca tablas, migraciones, captura, deduplicación o scheduling. El único acceso persistente es la lectura del snapshot de diccionario que ya realiza HU-05 mediante el puerto de HU-17.

### OpenAPI

Los DTO usarán decoradores Swagger para documentar campos, idiomas, límites, ejemplos y esquema de respuesta. El controller declarará respuestas `200`, `400`, `413`, `500` y `503`. `docs/openapi.json` se regenerará desde la aplicación real y una prueba comprobará que ruta, request, response y códigos coinciden.

## Files

- `backend/src/sentiment/controllers/sentiment.controller.ts`
- `backend/src/sentiment/dto/analyze-text-request.dto.ts`
- `backend/src/sentiment/dto/sentiment-analysis-response.dto.ts`
- `backend/src/sentiment/errors/sentiment-analysis.error.ts`
- `backend/src/sentiment/services/direct-sentiment-analysis.service.ts`
- `backend/src/sentiment/sentiment.module.ts`
- `backend/test/sentiment/direct-sentiment-analysis.service.spec.ts`
- `backend/test/sentiment/sentiment.controller.spec.ts`
- `backend/test/sentiment/sentiment.e2e.spec.ts`
- `backend/test/sentiment/sentiment.module.spec.ts`
- `docs/openapi.json`
- `openspec/changes/analisis-directo-texto-api/**`

No se prevén cambios en dependencias, Prisma, News, Capture, frontend, arquitectura ni ADR.

## Test Strategy

- **Unitarias del caso de uso:** un segmento exacto, delegación de idioma, resultado sin mutación, límite exacto y exceso, y propagación de fallos.
- **Unitarias del controller:** respuesta exacta y mapeo sanitizado a `413`, `503` y `500`.
- **E2E con PostgreSQL 16:** español e inglés, coincidencia/no coincidencia, diccionario vacío, determinismo, validaciones `400`, límite `413`, fallo real de la tabla de diccionario `503`, cuerpo exacto y ausencia de filas News.
- **OpenAPI:** método, ruta, DTO y respuestas publicados.
- **Regresión:** Jest completo con cobertura global mínima del 80 %, build, Prisma validate/generate, OpenSpec strict y `git diff --check`.

El fallo real del diccionario se simulará únicamente en PostgreSQL 16 descartable renombrando temporalmente la tabla dentro del test y restaurándola en `finally`. La suite está serializada y la restauración evita contaminar las regresiones posteriores.

## Risks / Trade-offs

- La complejidad del matching de HU-05 depende del tamaño del texto y del diccionario; el límite evita entradas ilimitadas, pero HU-10 no añade rate limiting porque no existe una decisión de autenticación/operación aprobada.
- `503` distingue una dependencia temporal de un resultado neutral, pero los fallos inesperados continúan siendo `500`.
- La rama arrastra HU-17 y HU-05 hasta que esas historias se integren en `main`; publicar la rama para CI no autoriza abrir PR todavía.
