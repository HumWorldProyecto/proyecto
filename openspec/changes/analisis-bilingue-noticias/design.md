## Context

HU-07 parte de `origin/hu05/analisis-sentimiento-noticias` en `bbbf7d857ce27125588a244534b206ffc0197183`. La Issue #8 contiene dos criterios: producir un resultado para noticias en español y para noticias en inglés. El encargo de Sprint 3 aclara las fronteras de aceptación, prohíbe detección automática y pide el menor cambio posible.

La auditoría de la base confirma que HU-05 ya implementa:

- `SentimentAnalyzerPort.analyze({ language, segments })` con `language: 'es' | 'en'`.
- `NewsSentimentAnalysisService.analyzeNews({ newsId, language })` y resultado `{ newsId, score, matchedTerms }`.
- lectura mínima de `id`, `title` y `description` mediante `NewsForSentimentReaderPort` y Prisma.
- título y descripción como segmentos independientes.
- snapshot del diccionario mediante `DictionaryReaderPort.listByLanguage(language)`.
- errores controlados para noticia inexistente, lectura de News y lectura del diccionario.
- ausencia de endpoint y de escritura en News.

Aplican [ADR-002](../../../docs/adr/ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](../../../docs/adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) y [ADR-005](../../../docs/adr/ADR-005-estrategia-combinada-de-pruebas.md). El diseño mantiene el stack, las capas y la estrategia combinada. No cambia ninguna decisión arquitectónica.

```text
NewsSentimentAnalysisService
        | newsId, language explícito
        +--> NewsForSentimentReaderPort --> News { id, title, description }
        +--> SentimentAnalyzerPort
                  +--> DictionaryReaderPort.listByLanguage(language)
        |
        +--> { newsId, score, matchedTerms }
             (sin persistencia)
```

## Goals / Non-Goals

**Goals:**

- Demostrar en PostgreSQL real que el caso de uso produce resultados para noticias españolas e inglesas.
- Demostrar que una misma forma puede tener pesos distintos por idioma sin contaminación cruzada.
- Confirmar asociación al `newsId`, determinismo, errores no neutrales y preservación de News.
- Evitar duplicar pruebas ya suficientes de HU-05.

**Non-Goals:**

- Añadir código productivo si la implementación actual satisface todos los requisitos.
- Detectar idioma, publicar HTTP o persistir resultados.
- Redefinir matching, normalización, fórmula o redondeo.

## Decisions

### Reutilización sin cambios productivos

HU-07 adopta el caso de uso HU-05 como implementación funcional. El llamador debe suministrar `language: 'es' | 'en'`; el sistema no deduce el idioma desde el texto, la fuente o la noticia. El contrato permanece:

```ts
analyzeNews({ newsId, language }): Promise<{
  newsId: string;
  score: number;
  matchedTerms: number;
}>
```

No se crea un facade, servicio, puerto o enum adicional porque solo repetiría contratos existentes. Tampoco se cambia `NewsSentimentAnalysisService`, el adaptador Prisma, `SentimentModule` o `AppModule`.

### Alcance de las pruebas nuevas

Una suite `bilingual-news-sentiment.acceptance.spec.ts` importará `SentimentModule` y usará PostgreSQL 16 real. Añadirá exclusivamente evidencia conjunta que falta:

1. noticias positivas y negativas en español e inglés con asociación al ID correcto;
2. la misma forma con pesos distintos en `es` y `en`, demostrando aislamiento por idioma;
3. repetición determinista sobre una noticia y preservación de la fila completa;
4. fallos reales de lectura de News y del diccionario, sin convertirlos en neutralidad.

Las pruebas HU-05 existentes ya cubren y se reutilizan en la regresión completa:

| Criterio | Evidencia existente |
| --- | --- |
| Sin coincidencias y diccionario vacío | `sentiment.integration.spec.ts` |
| Título y descripción independientes | integración y `dictionary-sentiment-analyzer.spec.ts` |
| Noticia inexistente | integración y `news-sentiment-analysis.service.spec.ts` |
| Resultado asociado a `newsId` | integración y servicio unitario |
| Ausencia de modificaciones en News | `sentiment.integration.spec.ts` |
| Propagación de fallos del reader | pruebas unitarias de motor, servicio y adaptador |

No se duplicarán esos escenarios en la nueva suite salvo cuando sean parte inseparable de una frontera bilingüe.

### Fallos reales de datos

En PostgreSQL descartable, la suite renombrará temporalmente `news` o `dictionary_entries`, invocará el caso de uso y comprobará respectivamente `NewsForSentimentReadError` o `SentimentDictionaryReadError`. Cada tabla se restaurará en `finally`. La configuración Jest serial existente evita concurrencia sobre la base y la prueba solo se ejecutará en una base efímera dedicada.

### Invariantes

- Un análisis con `es` nunca usa entradas `en`, ni a la inversa.
- Sin coincidencias se devuelve `score: 0, matchedTerms: 0`.
- Un fallo de lectura produce error controlado, no un resultado neutral.
- El `newsId` devuelto coincide exactamente con el solicitado.
- Repetir con noticia, idioma y diccionario iguales devuelve el mismo resultado.
- Ningún análisis crea, actualiza o elimina News.

## Files

- `openspec/changes/analisis-bilingue-noticias/**`
- `backend/test/sentiment/bilingual-news-sentiment.acceptance.spec.ts`

No se prevén archivos productivos nuevos o modificados.

## Test Strategy

- **Aceptación/integración:** nueva suite sobre `SentimentModule`, Prisma y PostgreSQL 16.
- **Reutilización:** ejecución de las suites HU-05 ya existentes para escenarios generales del motor y el caso de uso.
- **Regresión:** Jest completo con cobertura global mínima del 80 %.
- **Calidad:** Prisma validate/generate, build, OpenSpec strict y `git diff --check`.
- **Alcance:** diff vacío en `backend/src/**`, `backend/prisma/**`, dependencias, OpenAPI, News y Capture.

## Risks / Trade-offs

- HU-07 no elige el idioma. Es una frontera explícita del encargo y evita inventar reglas de detección; cualquier automatización posterior necesita especificación propia.
- Las alteraciones temporales de tabla verifican fallos reales, pero solo son seguras en la base descartable y serial definida por este diseño.
- La rama hereda HU-17/HU-05. Publicarla para CI no elimina esa dependencia ni autoriza un PR a `main`.
