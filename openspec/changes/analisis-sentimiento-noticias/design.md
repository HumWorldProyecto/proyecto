## Context

HU-05 parte de `origin/main` en `704864488f742e666f6a7a3e6de0b3480add8374`, donde no existe módulo de sentimiento ni diccionario. HU-17 se prepara en paralelo para aportar persistencia CRUD y `DictionaryReaderPort`. PR #41 (HU-16) modifica `News`, `NewsService` y su migración, por lo que esta propuesta evita esos archivos y exige reconciliar la rama antes de cualquier integración futura.

Aplican [ADR-002](../../../docs/adr/ADR-002-stack-node-nest-prisma-jest.md), [ADR-004](../../../docs/adr/ADR-004-monolito-modular-y-separacion-de-responsabilidades.md) y [ADR-005](../../../docs/adr/ADR-005-estrategia-combinada-de-pruebas.md). ADR-003 se conserva porque no se toca captura ni scheduling. `docs/architecture.md` ya reserva `sentiment` para una abstracción sustituible y prohíbe fijar un proveedor sin revisión; este diseño elige la alternativa local aprobada por el encargo Sprint 3.

```text
NewsSentimentAnalysisService
  input: newsId, language
          |             |
          v             |
 NewsForSentimentReaderPort
          |
          v
 existing News: id, title, description
                      |
                      v
            SentimentAnalyzerPort
                      |
          DictionarySentimentAnalyzer
                      |
                      v
          DictionaryReaderPort (HU-17)
                      |
                      v
             snapshot por idioma

result: newsId, score, matchedTerms
        (sin persistencia ni endpoint)
```

## Goals / Non-Goals

**Goals:**

- Definir un motor local, determinista, sustituible y fácil de probar.
- Fijar exactamente matching, repeticiones, ambigüedades, fórmula y redondeo.
- Distinguir ausencia de evidencia de un resultado neutral con coincidencias.
- Asociar el resultado devuelto con un `newsId` sin adelantar persistencia.
- Consultar realmente la noticia existente a través de una abstracción mínima de lectura.
- Separar motor, caso de uso y acceso a News, dejando el caso de uso registrado y utilizable.
- Compartir con HU-17 normalización y lectura, sin acoplarse al CRUD o a Prisma.

**Non-Goals:**

- Elegir vocabulario o pesos y cargar un seed.
- Detectar idioma, traducir, aplicar NLP/LLM, negación o análisis contextual.
- Exponer HTTP, persistir en `News`, ejecutar análisis durante captura o definir reanálisis.
- Modificar HU-16, deduplicación, clasificación IPTC, RSS o scheduling.

## Decision Status

| Decisión | Estado | Fundamento |
| --- | --- | --- |
| Motor basado en diccionario, local y sin dependencias | Aprobada por el encargo Sprint 3 | Decisión MVP |
| Entrada ES/EN y peso entero `[-5, 5]` | Aprobada por el encargo Sprint 3 | Contrato compartido |
| Score promedio de pesos dividido por 5 y acotado | Aprobada por el encargo Sprint 3 | Fórmula propuesta aceptada como base |
| `score=0`, `matchedTerms=0` sin coincidencias | Aprobada por el encargo Sprint 3 | Diferencia ausencia de evidencia |
| Segmentos independientes y matching exacto | Propuesta para revisión | Evita frases entre título/descripción y subcadenas |
| Longest-match de izquierda a derecha | Propuesta para revisión | Resuelve frase frente a término contenido sin doble conteo |
| Repeticiones por ocurrencia no solapada | Propuesta para revisión | Hace explícito `matchedTerms` |
| Cuatro decimales, mitad alejándose de cero | Propuesta para revisión | Resultado estable entre API, tests y persistencia futura |
| Lectura por `newsId` y resultado sin escritura | Aprobada por el ajuste final HU-05 | Satisface asociación real sin invadir HU-06 |
| Idioma explícito, sin detección | Frontera con HU-07 | HU-07 decidirá cómo obtenerlo |

## Decisions

### Contratos de entrada y salida

El puerto de dominio será equivalente a:

```ts
type SentimentLanguage = 'es' | 'en';

interface SentimentAnalysisInput {
  readonly language: SentimentLanguage;
  readonly segments: readonly (string | null | undefined)[];
}

interface SentimentAnalysisResult {
  readonly score: number;
  readonly matchedTerms: number;
}

interface SentimentAnalyzerPort {
  analyze(input: SentimentAnalysisInput): Promise<SentimentAnalysisResult>;
}
```

El método es asíncrono porque obtiene un snapshot de diccionario. El puerto no importa NestJS, Prisma ni DTO HTTP. `DictionarySentimentAnalyzer` implementa el algoritmo inicial y depende únicamente de `DictionaryReaderPort`.

El caso de uso para noticias acepta `{ newsId, language }`. `language` permanece explícito hasta que HU-07 decida su origen. El caso de uso consulta una vez `NewsForSentimentReaderPort.findById(newsId)`, pasa `segments: [news.title, news.description]` al analizador y devuelve `{ newsId, score, matchedTerms }`.

El puerto de lectura pertenece a la capa de aplicación y expone solo una proyección inmutable `{ id, title, description }`. Un adaptador de infraestructura consulta Prisma mediante `select` de esos tres campos. El caso de uso no importa Prisma, repositorios concretos ni DTO HTTP. Si la noticia no existe, lanza un error controlado de noticia inexistente y no invoca el analizador. Si título y descripción no aportan tokens, el analizador devuelve `{ score: 0, matchedTerms: 0 }` sin leer el diccionario. Ninguna ruta crea o actualiza News.

`SentimentModule` registra el adaptador del puerto y `NewsSentimentAnalysisService`, y exporta el caso de uso para consumidores posteriores. De este modo el flujo queda compuesto y ejecutable en pruebas de integración aunque HU-05 todavía no publique un endpoint ni defina un trigger automático.

### Normalización única con HU-17

HU-17 será propietario del normalizador canónico. HU-05 lo reutilizará para entradas y segmentos:

1. reemplazar etiquetas HTML por espacios;
2. Unicode NFKC;
3. minúsculas mediante locale `es` o `en`;
4. secuencias distintas de letras/números Unicode convertidas en espacios;
5. colapso de espacios y `trim`;
6. conservar diacríticos.

El orden de etiquetas antes de tokenizar evita concatenar palabras separadas por markup. El contenido original no cambia. No se decodifican semánticamente entidades, no hay stemming, lematización, fuzzy matching, traducción ni inferencia.

Si HU-17 se implementa primero, el normalizador debe exportarse desde `dictionary/domain` sin depender del módulo Nest. HU-05 no duplicará otra versión. Si la revisión altera esta regla en HU-17, ambos OpenSpec deberán reconciliarse antes de `apply`.

### Algoritmo de matching

Al iniciar una invocación con algún segmento no vacío:

1. solicitar una sola vez el snapshot del idioma;
2. tokenizar cada `term` canónico y preparar las entradas en memoria para esa invocación;
3. procesar cada segmento de izquierda a derecha;
4. en la posición actual, encontrar entradas cuya secuencia completa de tokens coincide;
5. seleccionar la que tenga más tokens; ante empate defensivo, ordenar por `id` ascendente;
6. sumar su peso, incrementar `matchedTerms` y avanzar el número de tokens de la frase;
7. si no coincide ninguna, avanzar un token;
8. reiniciar la posición al pasar al segmento siguiente.

La unicidad `(language, term)` de HU-17 elimina empates normales. El desempate por id hace que un snapshot corrupto o un double de prueba siga siendo determinista.

Esta estrategia evita contar `bueno` además de `muy bueno` en los mismos tokens. Las repeticiones separadas sí cuentan varias veces. No se interpretan negación, intensificadores fuera del diccionario, sarcasmo ni contexto; una frase compuesta debe existir como entrada para tener su propio peso.

### Fórmula exacta

Sea `n` el número de ocurrencias seleccionadas y `S` la suma de sus pesos enteros:

```text
si n = 0:
  score = 0
  matchedTerms = 0

si n > 0:
  raw = S / (5 * n)
  bounded = min(1, max(-1, raw))
  score = roundHalfAwayFromZero(bounded, 4)
  si score es -0, devolver 0
  matchedTerms = n
```

Como cada peso está entre `-5` y `5`, el valor matemático ya cae en `[-1, 1]`; el clamp es una defensa contractual. El redondeo se aplica solo al resultado final, no a pesos ni sumas intermedias. La implementación usará enteros hasta la división y una función explícita, probada en positivos y negativos, en lugar de confiar en formato de presentación.

Un peso cero suma una coincidencia. Pesos `+5` y `-5` producen score cero con dos coincidencias. Los consumidores distinguen esa neutralidad observada de `matchedTerms: 0`; HU-05 no añade etiquetas narrativas como “positivo”, “neutral” o “negativo”.

### Vacío, fallos y mutaciones del diccionario

Si todos los segmentos quedan sin tokens, se devuelve cero sin llamar al puerto. Con texto y snapshot vacío, se devuelve cero sin coincidencias. Si la lectura falla, el error se registra/mapea en la capa que orqueste el caso de uso y se propaga como fallo; nunca se convierte en un resultado neutral.

No habrá caché. Cada análisis usa un snapshot inmutable. Una entrada creada, actualizada o eliminada se observa en la siguiente invocación y no altera una ya iniciada. HU-05 no recalcula resultados previos. HU-06 deberá decidir si persiste revisión, fecha, coincidencias o política de reanálisis; esas decisiones no se adelantan.

### Fronteras con HU-07, HU-10 y HU-06

- **HU-07:** determinará cómo se identifica o proporciona el idioma de una noticia. HU-05 solo exige un valor explícito `es/en` y puede procesar ambos.
- **HU-10:** añadirá un controller/DTO y llamará directamente a `SentimentAnalyzerPort` con `segments: [text]`; no necesita una noticia. HU-05 no fija ruta, cuerpo ni códigos HTTP.
- **HU-06:** decidirá modelo, momento y actualización de persistencia. Podrá consumir `{ newsId, score, matchedTerms }`, pero HU-05 no crea columnas ni relaciones.

La ausencia de disparador automático es intencionada: Issue #6 no establece captura, scheduler, endpoint o persistencia como momento de ejecución, y el encargo prohíbe modificar `NewsService` mientras HU-16 está pendiente. El slice implementable es el motor y el caso de uso invocable. Conectarlo a un trigger requiere la historia que defina ese comportamiento.

### Composición

`SentimentModule` registrará `SentimentAnalyzerPort`, `NewsForSentimentReaderPort`, sus adaptadores y el caso de uso, e importará el proveedor de lectura de HU-17. Exportará el analizador para HU-10 y el caso de uso para HU-06. No crea controller. Su incorporación a `AppModule` verifica composición real; no modifica OpenAPI.

No se añade ninguna dependencia. El matching usa arreglos, Unicode y aritmética estándar de Node 24.

## Files Expected During Implementation

**Nuevos previsibles:**

- `backend/src/sentiment/sentiment.module.ts`
- `backend/src/sentiment/ports/sentiment-analyzer.port.ts`
- `backend/src/sentiment/ports/news-for-sentiment-reader.port.ts`
- `backend/src/sentiment/types/sentiment-analysis.ts`
- `backend/src/sentiment/services/dictionary-sentiment-analyzer.ts`
- `backend/src/sentiment/services/news-sentiment-analysis.service.ts`
- `backend/src/sentiment/adapters/prisma-news-for-sentiment.reader.ts`
- `backend/src/sentiment/errors/sentiment-analysis.error.ts`
- `backend/test/sentiment/**`

**Modificados previsibles:**

- `backend/src/app.module.ts`, únicamente para componer el módulo si la implementación aprobada lo requiere.

HU-05 no debe modificar `backend/prisma/**`, el comportamiento de `backend/src/news/**`, `backend/src/capture/**`, `docs/openapi.json`, dependencias ni frontend. El adaptador de lectura de News vive tras el puerto de aplicación y usa el modelo vigente sin alterarlo. Los tipos/normalizador/puerto de lectura de `backend/src/dictionary/**` deben provenir de HU-17, no duplicarse en esta rama.

## Test Strategy

- **Puerto/tipos:** input inmutable, idioma admitido, score acotado y matchedTerms entero.
- **Normalización compartida:** NFKC, ES/EN, HTML, mayúsculas, puntuación, espacios, diacríticos y no mutación.
- **Matching:** token completo, frase, preferencia de la más larga, empate por id, campos separados, repeticiones, no solapamiento y orden independiente del snapshot.
- **Fórmula:** pesos negativos/positivos/cero, compensación, extremos, varios denominadores, cuatro decimales, mitad alejándose de cero y ausencia de `-0`.
- **Vacíos/fallos:** segmentos nulos, texto sin tokens, diccionario vacío, una lectura por análisis y fallo de lectura no convertido a cero.
- **Cambios:** snapshots inmuebles y creación/actualización/eliminación visibles solo en invocaciones posteriores.
- **Caso News:** recibe solo `newsId` e idioma, carga una proyección existente, conserva `newsId`, pasa título/descripción separados, rechaza ausencia y no escribe News.
- **Acceso News:** verifica una consulta por invocación, selección mínima, fallo controlado, noticia vacía y ausencia total de operaciones de escritura.
- **Integración:** composición con `DictionaryReaderPort` real y PostgreSQL 16 de HU-17, sin endpoint ni migración HU-05.
- **Regresión:** suite completa, build, cobertura global mínima del 80 %, OpenSpec strict y `git diff --check`.

## Risks / Trade-offs

- **Calidad dependiente del contenido.** Sin seed revisado el motor devuelve cero. Un diccionario sesgado o escaso produce resultados limitados; HU-05 no inventa contenido para ocultarlo.
- **Ambigüedad léxica.** Exactitud por tokens y longest-match no entiende contexto, negación o sarcasmo. Mejoras semánticas requieren otra especificación y quizá ADR/dependencias.
- **Cambios no versionados.** El mismo texto puede obtener otro score después de editar el diccionario. Se hace explícito; HU-06 debe decidir trazabilidad antes de persistir.
- **Idioma provisto externamente.** Un idioma incorrecto selecciona el vocabulario incorrecto. HU-07 debe resolverlo; HU-05 no adivina.
- **Integración paralela.** HU-05 depende del contrato HU-17. PR #41 no modifica `AppModule` y HU-05 evita sus archivos `News`/Prisma, por lo que no se prevé un conflicto directo con HU-16; aun así debe reconciliarse desde `main` antes de codificar para ejecutar la suite sobre la composición vigente.
- **Asociación efímera.** La noticia se consulta para ejecutar el análisis y el `newsId` viaja en el resultado, pero el resultado no puede consultarse después. Esa persistencia pertenece a HU-06.

## Integration Plan

1. Revisar y aprobar conjuntamente HU-17 y HU-05 para mantener idéntica normalización y tipos de idioma.
2. Implementar e integrar HU-17 primero, incluida su lectura por idioma y pruebas PostgreSQL.
3. Actualizar HU-05 desde el `main` que contenga HU-17 y cualquier HU-14/HU-16 ya integrada.
4. Implementar HU-05 en `sentiment`, incluido el adaptador de lectura mínima de News, sin cambiar esquema, escrituras, captura u OpenAPI.
5. Ejecutar pruebas unitarias e integración con diccionario real, además de regresiones completas.
6. Dejar HU-07, HU-10 y HU-06 como consumidores posteriores, cada uno con su propio OpenSpec.

## Open Questions for Human Review

La implementación puede autorizarse en una única revisión si el equipo acepta:

1. título y descripción como segmentos separados;
2. matching exacto y longest-match de izquierda a derecha;
3. repeticiones contadas por ocurrencia no solapada;
4. cuatro decimales con mitad alejándose de cero;
5. idioma explícito y ausencia de detección/traducción;
6. consulta real por `newsId`, error controlado si no existe y resultado vinculado sin trigger, endpoint ni persistencia;
7. cambios del diccionario aplicados solo a invocaciones posteriores, sin versionado ni recálculo.
