## Purpose

Definir el contrato REST observable para analizar directamente un texto mediante el motor de sentimiento HU-05 y el diccionario HU-17, sin crear noticias ni persistir solicitudes o resultados.

## ADDED Requirements

### Requirement: Endpoint versionado de análisis directo
El sistema SHALL exponer `POST /api/v1/sentiment/analyze` con entrada JSON formada por `text` y `language`, y SHALL responder `200` con exactamente `score` y `matchedTerms`. La operación MUST NOT crear un recurso.

#### Scenario: Análisis directo satisfactorio
- **GIVEN** existe `excelente` en español con peso `5`
- **WHEN** se envía `{ "text": "La recuperación fue excelente", "language": "es" }`
- **THEN** la respuesta HTTP es `200`
- **AND** el cuerpo es `{ "score": 1, "matchedTerms": 1 }`

#### Scenario: Respuesta mínima
- **GIVEN** una solicitud válida
- **WHEN** termina el análisis
- **THEN** la respuesta contiene solo `score` y `matchedTerms`
- **AND** no incluye el texto de entrada ni metadatos de una noticia

### Requirement: Idioma explícito
La solicitud SHALL admitir únicamente `es` o `en` explícitos. El sistema MUST NOT inferir, traducir ni sustituir el idioma.

#### Scenario: Español e inglés
- **GIVEN** entradas distintas para español e inglés
- **WHEN** se analiza un texto con uno de esos idiomas
- **THEN** participa exclusivamente el snapshot del idioma solicitado

#### Scenario: Idioma ausente o no admitido
- **GIVEN** falta `language` o su valor no es `es` ni `en`
- **WHEN** se envía la solicitud
- **THEN** la respuesta HTTP es `400`
- **AND** el motor no se invoca

### Requirement: Validación del cuerpo y del texto
El sistema SHALL exigir un cuerpo JSON, `text` de tipo string y al menos un carácter distinto de espacio. JSON mal formado, cuerpo ausente, tipos incorrectos y texto vacío o solo en blanco SHALL responder `400` sin invocar el motor.

#### Scenario: Texto vacío
- **GIVEN** `text` es `""` o contiene solo espacios
- **WHEN** se envía la solicitud
- **THEN** la respuesta HTTP es `400`
- **AND** no se consulta el diccionario

#### Scenario: Tipo incorrecto
- **GIVEN** `text` es nulo, numérico, objeto o colección
- **WHEN** se envía la solicitud
- **THEN** la respuesta HTTP es `400`

#### Scenario: Texto válido sin tokens analizables
- **GIVEN** `text` contiene caracteres no blancos pero queda sin tokens tras la normalización HU-05
- **WHEN** se analiza
- **THEN** la respuesta es `200` con `{ "score": 0, "matchedTerms": 0 }`
- **AND** no se consulta el diccionario

### Requirement: Límite publicado de entrada
`text` SHALL admitir como máximo 10.000 puntos de código Unicode. El sistema SHALL responder `413` al exceder el límite y MUST NOT invocar el motor ni leer el diccionario.

#### Scenario: Límite exacto
- **GIVEN** un texto de 10.000 puntos de código Unicode
- **WHEN** se envía con idioma válido
- **THEN** el tamaño se acepta para análisis

#### Scenario: Exceso de tamaño
- **GIVEN** un texto de 10.001 puntos de código Unicode
- **WHEN** se envía
- **THEN** la respuesta HTTP es `413`
- **AND** el motor no se invoca

### Requirement: Reutilización del motor HU-05
HU-10 SHALL invocar `SentimentAnalyzerPort` una vez con el idioma solicitado y `segments: [text]`. HU-10 MUST NOT duplicar normalización, matching, longest-match, repeticiones, fórmula, límites del score ni redondeo.

#### Scenario: Un único segmento
- **GIVEN** una solicitud válida
- **WHEN** el caso de uso delega el análisis
- **THEN** el texto completo se pasa como un único segmento
- **AND** se conserva el idioma explícito

#### Scenario: Respuesta determinista
- **GIVEN** texto, idioma y snapshot de diccionario iguales
- **WHEN** se repite la solicitud
- **THEN** ambas respuestas tienen el mismo `score` y `matchedTerms`

### Requirement: Cero coincidencias y diccionario vacío
Una solicitud válida sin coincidencias o con snapshot vacío SHALL responder `200` con `{ "score": 0, "matchedTerms": 0 }`; estos casos MUST NOT tratarse como error.

#### Scenario: Sin coincidencias
- **GIVEN** el diccionario contiene entradas que no coinciden
- **WHEN** se analiza el texto
- **THEN** la respuesta es `200` con score cero y cero coincidencias

#### Scenario: Diccionario vacío
- **GIVEN** no existen entradas para el idioma
- **WHEN** se analiza texto válido
- **THEN** la respuesta es `200` con score cero y cero coincidencias

### Requirement: Fallos sanitizados del diccionario
Si HU-05 no puede leer el diccionario, HU-10 SHALL responder `503` y MUST NOT convertir el fallo en un resultado neutral. Otros fallos inesperados SHALL responder `500`. Ninguna respuesta SHALL exponer SQL, credenciales, URL de conexión ni detalles internos.

#### Scenario: PostgreSQL no disponible
- **GIVEN** una solicitud válida
- **WHEN** la consulta real del diccionario falla
- **THEN** la respuesta HTTP es `503`
- **AND** no contiene un resultado de sentimiento
- **AND** el cuerpo no expone detalles internos

#### Scenario: Fallo inesperado
- **GIVEN** el caso de uso produce un error no clasificado
- **WHEN** el controller lo procesa
- **THEN** la respuesta HTTP es `500`
- **AND** el cuerpo está sanitizado

### Requirement: Operación efímera sin noticias
HU-10 MUST NOT guardar el texto o el resultado, crear o actualizar noticias, ni añadir tablas, columnas o migraciones. La operación MUST NOT alterar captura RSS, deduplicación o scheduling.

#### Scenario: Sin persistencia
- **GIVEN** una base sin noticias
- **WHEN** se completa un análisis directo
- **THEN** continúa sin noticias
- **AND** no existe almacenamiento de la solicitud o del resultado

#### Scenario: Regresión de captura
- **GIVEN** la incorporación del endpoint
- **WHEN** se ejecuta la suite existente
- **THEN** captura, deduplicación y scheduling mantienen su comportamiento anterior

### Requirement: Documentación OpenAPI sincronizada
Swagger y `docs/openapi.json` SHALL publicar el request, la respuesta y los códigos `200`, `400`, `413`, `500` y `503` del endpoint real.

#### Scenario: Contrato publicado
- **GIVEN** la aplicación compilada
- **WHEN** se genera OpenAPI desde NestJS
- **THEN** existe solo `POST /api/v1/sentiment/analyze` para HU-10
- **AND** referencia los DTO de entrada y salida
- **AND** declara todos los códigos definidos
