## Context

HU-06 parte de `origin/hu05/analisis-sentimiento-noticias` en `bbbf7d857ce27125588a244534b206ffc0197183`. Esa base incluye el diccionario HU-17 y el caso de uso interno `NewsSentimentAnalysisService.analyzeNews({ newsId, language })`, que lee `id`, `title` y `description`, invoca el motor y devuelve `{ newsId, score, matchedTerms }` sin escribir.

La API actual solo permite listar noticias mediante `GET /api/v1/news`. Issue #7 exige almacenar el valor asociado y recuperarlo después, pero no define cómo iniciar el análisis, qué metadatos acompañan al score ni la política de reanálisis. La activación y la forma REST deben aprobarse antes de implementar.

Las PR #40, #41 y #42 siguen abiertas sobre `main` en `704864488f742e666f6a7a3e6de0b3480add8374`. HU-14 añade `RssSource.continent`; HU-16 añade `News.mediaTopicQcodes`; HU-17 crea `DictionaryLanguage` y `DictionaryEntry`. HU-06 debe reconciliarse con ellas sin editar sus migraciones históricas.

Aplican [ADR-002](../../../docs/adr/ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](../../../docs/adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) y [ADR-005](../../../docs/adr/ADR-005-estrategia-combinada-de-pruebas.md). El diseño mantiene Node 24, NestJS 10.4, Prisma 6, PostgreSQL 16 y Jest 29, conserva el monolito modular y separa API, caso de uso y repositorio. ADR-003 no cambia.

```text
POST /api/v1/news/:id/sentiment
       |
       v
NewsSentimentController
       |
       v
AnalyzeAndPersistNewsSentimentService
       +--> NewsSentimentAnalysisService (HU-05)
       |         +--> NewsForSentimentReaderPort
       |         +--> SentimentAnalyzerPort
       |                    +--> DictionaryReaderPort (HU-17)
       |
       +--> NewsSentimentRepositoryPort --> Prisma --> PostgreSQL 16

GET /api/v1/news --> NewsService --> NewsRepositoryPort --> sentiment nullable
```

## Goals / Non-Goals

**Goals:**

- Persistir exactamente el último análisis exitoso de una noticia.
- Diferenciar ausencia de análisis, resultado sin evidencia y neutralidad con evidencia.
- Activar el análisis de forma explícita y recuperar el valor mediante la API existente de News.
- Mantener una única implementación del algoritmo HU-05.
- Preservar datos RSS e IPTC y soportar migración de filas existentes sin backfill.
- Propagar fallos de diccionario y PostgreSQL sin convertirlos en neutralidad falsa.

**Non-Goals:**

- Crear historial, auditoría de versiones o procesamiento automático en segundo plano.
- Analizar al capturar, listar o editar el diccionario.
- Detectar idioma, modificar el motor o persistir el análisis directo HU-10.
- Añadir dependencias, tablas o cambios de arquitectura.

## Decision Status

### Decisiones heredadas y vigentes

- HU-05 es la única autoridad para normalización, matching, score y `matchedTerms`.
- El idioma es explícito y solo admite `es | en`.
- Título y descripción permanecen como segmentos separados.
- HU-17 aporta `DictionaryLanguage` y `DictionaryReaderPort`.
- PostgreSQL 16, Prisma Migrate, NestJS y la arquitectura por puertos siguen vigentes.

### Propuesta pendiente de una única aprobación humana

1. Persistir el último análisis en cuatro columnas anulables de `News`, sin tabla de historial.
2. Activar y reactivar mediante `POST /api/v1/news/:id/sentiment` con idioma explícito.
3. Exponer el último resultado como `sentiment` nullable en `GET /api/v1/news`.
4. Aplicar reemplazo completo y atómico; ante concurrencia, gana la última escritura confirmada.

Ninguna tarea de implementación puede comenzar hasta aprobar conjuntamente estas cuatro decisiones.

## Decisions

### Modelo Prisma y estado persistido

El modelo recomendado añade:

```prisma
model News {
  // campos existentes, incluido mediaTopicQcodes cuando se integre HU-16
  sentimentScore        Decimal?            @db.Decimal(5, 4)
  sentimentMatchedTerms Int?
  sentimentLanguage     DictionaryLanguage?
  sentimentAnalyzedAt   DateTime?
}
```

La migración se nombrará con un timestamp único posterior a las migraciones ya publicadas y añadirá las columnas sin `DEFAULT` ni `NOT NULL`. Las filas preexistentes quedan con los cuatro valores nulos. No se editan migraciones históricas.

PostgreSQL añadirá constraints con nombres propios para exigir:

- `sentimentScore BETWEEN -1 AND 1` cuando exista;
- `sentimentMatchedTerms >= 0` cuando exista;
- los cuatro valores todos nulos o todos no nulos;
- si `sentimentMatchedTerms = 0`, entonces `sentimentScore = 0`.

`NUMERIC(5,4)` preserva los cuatro decimales del contrato HU-05. El repositorio convierte explícitamente `Prisma.Decimal` a `number` al construir el dominio y nunca expone objetos Prisma. `sentimentAnalyzedAt` se fija inmediatamente antes de la actualización persistente y se devuelve desde la fila actualizada.

Una tabla separada solo sería necesaria para historial, múltiples modelos o auditoría. Ninguno forma parte de Issue #7, por lo que aumentaría el alcance y la coordinación sin aportar comportamiento requerido.

### Estados observables

| Estado | Persistencia | API `sentiment` |
| --- | --- | --- |
| Nunca analizada | cuatro columnas `NULL` | `null` |
| Analizada sin coincidencias | score `0`, matchedTerms `0`, idioma y fecha | objeto con `score: 0`, `matchedTerms: 0` |
| Neutral con evidencia | score `0`, matchedTerms mayor que `0`, idioma y fecha | objeto que conserva las coincidencias |
| Positiva o negativa | score distinto de `0`, coincidencias, idioma y fecha | objeto completo |

No se deduce un estado desde el score solamente.

### Puerto de persistencia y caso de uso

HU-06 añadirá `NewsSentimentRepositoryPort`, independiente de Prisma, con una operación atómica para reemplazar el último resultado y devolver la representación realmente almacenada. Su adaptador actualizará solo las cuatro columnas de sentimiento mediante una única operación Prisma.

`AnalyzeAndPersistNewsSentimentService` seguirá este orden:

1. invocar una sola vez `NewsSentimentAnalysisService.analyzeNews({ newsId, language })`;
2. si el análisis falla, terminar sin escritura;
3. persistir score, coincidencias, idioma y fecha en una única actualización;
4. devolver el resultado producido por esa actualización.

El caso de uso no recibe título ni descripción del cliente y no accede a Prisma. La lectura inicial de HU-05 sigue siendo la autoridad para existencia y texto. Si la noticia desaparece antes de escribir, el adaptador informa el mismo error controlado de inexistencia. Cualquier otro fallo de escritura se propaga como error de persistencia y el valor anterior permanece intacto.

### Contrato REST propuesto

Activación:

```http
POST /api/v1/news/8b4d6b31-3767-4ee9-aed5-ec1a70a8dc25/sentiment
Content-Type: application/json

{"language":"es"}
```

Respuesta `200`:

```json
{
  "newsId": "8b4d6b31-3767-4ee9-aed5-ec1a70a8dc25",
  "sentiment": {
    "score": 0.8,
    "matchedTerms": 2,
    "language": "es",
    "analyzedAt": "2026-10-11T15:30:00.000Z"
  }
}
```

Se usa `200` porque se reemplaza una subrepresentación de la noticia y no se crea un recurso con identidad propia. El parámetro `id` debe ser UUID y el body contiene exactamente un idioma admitido; la `ValidationPipe` global descarta campos adicionales conforme al comportamiento vigente.

Códigos propuestos:

| Condición | HTTP |
| --- | --- |
| Análisis y persistencia correctos, incluidos cero coincidencias o diccionario vacío | `200` |
| UUID, JSON o idioma inválido | `400` |
| Noticia inexistente, también si desaparece antes de persistir | `404` |
| Lectura del diccionario o acceso PostgreSQL temporalmente indisponible | `503` |
| Fallo inesperado sanitizado | `500` |

Ninguna respuesta de error expone SQL, credenciales, URL de conexión o mensajes internos.

Consulta posterior:

```json
{
  "id": "8b4d6b31-3767-4ee9-aed5-ec1a70a8dc25",
  "source": "source-id",
  "title": "...",
  "link": "...",
  "guid": "...",
  "description": "...",
  "pubDate": "2026-10-11T12:00:00.000Z",
  "mediaTopics": [],
  "sentiment": {
    "score": 0.8,
    "matchedTerms": 2,
    "language": "es",
    "analyzedAt": "2026-10-11T15:30:00.000Z"
  },
  "capturedAt": "2026-10-11T12:05:00.000Z"
}
```

`mediaTopics` aparece cuando HU-16 se integre. Una noticia nunca analizada contiene `"sentiment": null`. El GET solo lee; nunca calcula, reanaliza ni cambia fechas.

### Reanálisis, cambios de diccionario y concurrencia

Cada POST es una orden explícita de reanálisis. Reemplaza conjuntamente score, coincidencias, idioma y fecha, incluso cuando el nuevo resultado sea cero o use otro idioma. No se conserva historial.

Crear, editar o eliminar entradas del diccionario no modifica resultados ya persistidos. Solo un POST posterior toma un snapshot nuevo mediante HU-05. Listar noticias tampoco provoca recálculo.

Dos POST concurrentes pueden calcular con snapshots diferentes. Cada escritura es atómica y la última actualización confirmada por PostgreSQL determina el objeto almacenado completo. No se mezclan campos entre resultados. Esta política evita locks prolongados alrededor del análisis y es suficiente para un recurso de “último resultado”; un historial o control optimista requeriría requisitos adicionales.

### Captura, deduplicación e IPTC

El `upsertCapturedItem` actual usa `update: {}` para duplicados. HU-06 mantendrá esa operación sin columnas de sentimiento, de modo que recapturar un duplicado no borra ni recalcula el análisis. No se cambia el scheduler, los jobs, los parsers ni los puertos de captura.

Al reconciliar HU-16, el mapeo de `News` y `NewsResponseDto` debe contener a la vez `mediaTopics` y `sentiment`. El update de sentimiento selecciona y modifica solo sus cuatro columnas; no escribe `mediaTopicQcodes`, título, descripción, ID, fuente ni fechas RSS.

### Compatibilidad de migraciones

- HU-14 actúa sobre `rss_sources` y no colisiona con las columnas HU-06.
- HU-16 y HU-06 modifican `News`, pero con columnas y constraints diferentes. El conflicto textual en `schema.prisma`, tipos, repositorio y DTO debe resolverse conservando ambos contratos.
- HU-17 crea `DictionaryLanguage`; HU-06 depende de esa migración y debe integrarse después de HU-17.
- La migración HU-06 usará un directorio posterior y único. Se verificará desde una base vacía y desde un esquema previo con noticias ya existentes, y también con la secuencia combinada HU-14/HU-16/HU-17.
- No se renombrará, reordenará ni editará una migración publicada.

## Files Expected During Implementation

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/<timestamp>_add_news_sentiment/migration.sql`
- `backend/src/sentiment/ports/news-sentiment-repository.port.ts`
- `backend/src/sentiment/repositories/prisma-news-sentiment.repository.ts`
- `backend/src/sentiment/services/analyze-and-persist-news-sentiment.service.ts`
- `backend/src/sentiment/types/persisted-news-sentiment.ts`
- `backend/src/sentiment/dto/analyze-news-sentiment-request.dto.ts`
- `backend/src/sentiment/dto/news-sentiment-response.dto.ts`
- `backend/src/sentiment/controllers/news-sentiment.controller.ts`
- `backend/src/sentiment/errors/sentiment-analysis.error.ts`
- `backend/src/sentiment/sentiment.module.ts`
- `backend/src/news/types/news.ts`
- `backend/src/news/repositories/prisma-news.repository.ts`
- `backend/src/news/dto/news-response.dto.ts`
- `backend/test/sentiment/**`
- `backend/test/news/**`
- `docs/openapi.json`
- `openspec/changes/persistencia-valor-humor/**`

No se prevén cambios en dependencias, `backend/src/capture/**`, scheduling, fuentes, frontend, arquitectura ni ADR.

## Test Strategy

- **Unitarias de aplicación:** éxito positivo, negativo, neutral y sin coincidencias; idiomas `es/en`; orden analizar-antes-de-persistir; noticia inexistente; fallo del reader, diccionario y writer; resultado devuelto desde persistencia; reanálisis y concurrencia documentada.
- **Unitarias de API:** UUID/body/idioma, respuesta exacta, `200/400/404/503/500` y sanitización.
- **Unitarias de News:** mapeo de `null`, objeto persistido, conversión Decimal, conservación de todos los campos actuales e incorporación simultánea de `mediaTopics` al reconciliar HU-16.
- **Integración PostgreSQL 16:** migración vacía; migración con noticias preexistentes; constraints; análisis y recuperación; `es/en`; reanálisis; diccionario vacío; cambio posterior del diccionario sin recálculo; fallo real de tabla del diccionario; fallo real de persistencia; inexistencia; duplicado RSS; preservación de IDs, textos, fechas e IPTC.
- **E2E:** POST seguido de GET, noticia nunca analizada, todos los códigos HTTP y OpenAPI generado desde NestJS.
- **Regresión:** HU-01/HU-02/HU-03, News, HU-14, HU-16, HU-17, HU-05, HU-07 y HU-10 cuando sus commits estén reconciliados.
- **Calidad:** Prisma validate/generate, build, Jest completo con cobertura global mínima del 80 %, OpenSpec strict y `git diff --check`.

Las pruebas que alteren o retiren temporalmente tablas solo se ejecutarán en PostgreSQL 16 descartable, serializadas y con restauración en `finally`. Ninguna base compartida se utilizará.

## Risks / Trade-offs

- El endpoint y la ampliación de `GET /news` son necesarios para activar y recuperar la persistencia, pero no están detallados por Issue #7; requieren la aprobación indicada.
- Guardar solo el último resultado impide auditoría histórica. Es coherente con la historia y evita una tabla sin requisito.
- Reutilizar `DictionaryLanguage` crea una dependencia de migración explícita con HU-17; duplicar un enum introduciría dos autoridades para el mismo idioma.
- Las ramas HU-16 y HU-06 tocarán varios archivos News. La reconciliación debe hacerse después de integrar las dependencias y repetirse sobre PostgreSQL 16.
- La política last-write-wins no informa conflictos concurrentes. Añadir versiones u optimistic locking ampliaría el alcance y no está justificado para el último resultado.

## Integration Plan

1. Obtener la aprobación humana única del modelo, endpoint, respuesta y reemplazo.
2. Reconciliar la rama con `main` y con HU-17/HU-05 integradas; incorporar HU-16 si ya fue integrada.
3. Implementar migración, puertos, caso de uso, API y lectura aditiva sin modificar captura.
4. Resolver los solapamientos con HU-16 conservando `mediaTopics` y ejecutar las migraciones combinadas.
5. Ejecutar validaciones locales y PostgreSQL 16 descartable.
6. Crear commits separados de especificación e implementación, publicar solo la rama HU-06 y validar GitHub Actions.
7. Abrir PR a `main` únicamente cuando sus dependencias ya estén integradas y el diff no arrastre historias ajenas.

## Open Question for Human Review

¿Se aprueba como un único contrato HU-06: cuatro columnas anulables en `News`, activación explícita con `POST /api/v1/news/:id/sentiment`, respuesta anidada `{ newsId, sentiment }`, lectura mediante `GET /api/v1/news` y reemplazo atómico last-write-wins sin historial?
