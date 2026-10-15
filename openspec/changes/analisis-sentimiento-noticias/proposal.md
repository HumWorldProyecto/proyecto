## Why

La Issue [#6 — HU-05 Análisis de sentimiento de noticias](https://github.com/HumWorldProyecto/proyecto/issues/6) exige calcular sentimiento y asociar el resultado con la noticia analizada. El repositorio todavía no dispone de un motor, un puerto sustituible ni un contrato de resultado. La propuesta coordina HU-05 con el diccionario de HU-17 y deja límites explícitos para HU-07, HU-10 y HU-06.

## What Changes

- Crear un límite `sentiment` con `SentimentAnalyzerPort`, un analizador local basado en diccionario y un contrato `{ score, matchedTerms }`.
- Recibir un idioma explícito `es` o `en` y uno o varios segmentos de texto; para una noticia se usan título y descripción como segmentos separados y para HU-10 podrá usarse un único segmento.
- Leer mediante `DictionaryReaderPort` un snapshot del idioma solicitado, sin depender del CRUD HTTP ni de Prisma.
- Normalizar texto y términos con el contrato compartido de HU-17, conservando diacríticos y sin modificar datos almacenados.
- Encontrar frases completas como secuencias contiguas de tokens. En cada posición se elige la coincidencia más larga y el recorrido avanza tras ella, evitando contar simultáneamente una frase y sus subfrases.
- Contar cada ocurrencia no solapada, incluidas repeticiones del mismo término, y calcular `score = clamp(sum(weights) / (5 * matchedTerms), -1, 1)`.
- Redondear el score a cuatro decimales con mitad alejándose de cero y normalizar `-0` a `0`.
- Devolver `score: 0, matchedTerms: 0` para texto vacío, diccionario vacío o ausencia de coincidencias. Un peso cero o pesos compensados producen `score: 0` con `matchedTerms > 0`, distinguiendo neutralidad observada de ausencia de evidencia.
- Añadir un caso de uso interno que reciba `newsId` e idioma explícito, obtenga la noticia existente mediante `NewsForSentimentReaderPort`, analice su título y descripción y devuelva `{ newsId, score, matchedTerms }` sin persistirlo.
- Separar el motor de sentimiento, la orquestación del caso de uso y el adaptador de lectura de noticias. La implementación del caso de uso SHALL quedar registrada y utilizable; no será una interfaz sin consumidor real.
- Mantener Node 24, NestJS 10.4 y Jest 29 sin nuevas dependencias, servicios externos, modelos descargados, credenciales ni llamadas de red.

**Fuera de alcance:**

- Detectar automáticamente el idioma, traducir texto o decidir cómo HU-07 obtiene el idioma de una noticia.
- Crear un endpoint de análisis directo; pertenece a HU-10.
- Persistir score, coincidencias o trazabilidad en `News`; pertenece a HU-06.
- Modificar el modelo Prisma `News`, escribir noticias, captura RSS, deduplicación, scheduling, clasificación IPTC o contratos REST existentes mientras HU-16 está pendiente. Solo se permite el adaptador mínimo de lectura requerido por el caso de uso.
- Semillas editoriales, stemming, lematización, fuzzy matching, negación, sarcasmo, NLP o LLM.

## Capabilities

### New Capabilities

- `analisis-sentimiento-noticias`: cálculo determinista y local de sentimiento sobre segmentos de una noticia, con asociación efímera al identificador de la noticia.

### Modified Capabilities

Ninguna.

## Impact

- Nuevo límite `backend/src/sentiment/**` con contratos, motor de reglas, caso de uso para noticias y adaptador mínimo de lectura por `newsId`.
- Dependencia interna de solo lectura hacia el `DictionaryReaderPort` definido por HU-17; la implementación HU-05 deberá partir de un `main` que ya contenga HU-17 o reconciliarse con su rama aprobada.
- Pruebas unitarias exhaustivas del cálculo y pruebas de integración de la composición con el diccionario.
- No se prevén cambios de esquema Prisma, escritura en News, `backend/src/capture/**`, OpenAPI ni dependencias durante HU-05. El adaptador seleccionará únicamente `id`, `title` y `description` de la noticia existente.
- ADR-002, ADR-004 y ADR-005 se respetan; ADR-003 no se modifica. No se propone un ADR nuevo para un algoritmo local dentro del módulo previsto `sentiment`.

“Asociado a la noticia” significa que el caso de uso parte de un `newsId`, carga esa noticia a través del puerto de lectura y conserva el identificador en el resultado. La noticia inexistente produce un error controlado; una noticia existente sin texto analizable produce `{ newsId, score: 0, matchedTerms: 0 }`. Persistir o recuperar el análisis después corresponde expresamente a HU-06.
