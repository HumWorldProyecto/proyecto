## Purpose

Definir el comportamiento observable para almacenar, reemplazar y recuperar el último resultado de sentimiento asociado a una noticia, reutilizando el análisis HU-05 y sin alterar captura ni clasificación.

## ADDED Requirements

### Requirement: Estado persistido asociado a la noticia
El sistema SHALL conservar para cada noticia analizada el último `score`, `matchedTerms`, `language` y `analyzedAt`. Los cuatro valores SHALL pertenecer al mismo análisis y SHALL almacenarse atómicamente. `score` SHALL estar entre `-1` y `1`, `matchedTerms` SHALL ser un entero no negativo y `language` SHALL ser `es` o `en`.

#### Scenario: Resultado positivo persistido
- **GIVEN** una noticia existente cuyo análisis produce un score positivo
- **WHEN** se completa la persistencia
- **THEN** el score, las coincidencias, el idioma y la fecha quedan asociados a esa noticia
- **AND** una lectura posterior devuelve esos mismos valores

#### Scenario: Resultado negativo persistido
- **GIVEN** una noticia existente cuyo análisis produce un score negativo
- **WHEN** se completa la persistencia
- **THEN** la lectura posterior conserva el signo, la precisión y el número de coincidencias

#### Scenario: Neutralidad con evidencia
- **GIVEN** un análisis con score `0` y `matchedTerms` mayor que `0`
- **WHEN** se persiste
- **THEN** la lectura posterior conserva las coincidencias positivas
- **AND** no lo confunde con ausencia de análisis

### Requirement: Ausencia de análisis y resultado sin evidencia
Una noticia nunca analizada SHALL exponer `sentiment: null`. Un análisis exitoso sin coincidencias SHALL persistir y exponer score `0`, `matchedTerms` `0`, el idioma explícito y la fecha. Un estado parcial MUST NOT almacenarse.

#### Scenario: Noticia nunca analizada
- **GIVEN** una noticia creada antes o después de la migración y nunca analizada
- **WHEN** se consulta
- **THEN** su campo `sentiment` es `null`

#### Scenario: Análisis sin coincidencias
- **GIVEN** una noticia existente sin términos coincidentes o un diccionario vacío para el idioma
- **WHEN** se solicita el análisis
- **THEN** se persiste score `0` y `matchedTerms` `0`
- **AND** se persisten también idioma y fecha

#### Scenario: Estado incompleto rechazado
- **GIVEN** un intento de almacenar solo una parte del resultado
- **WHEN** PostgreSQL valida la escritura
- **THEN** la operación se rechaza
- **AND** la fila conserva su estado anterior

### Requirement: Activación explícita por API
El sistema SHALL exponer `POST /api/v1/news/:id/sentiment` con un cuerpo JSON `{ "language": "es" | "en" }`. Una solicitud válida SHALL analizar título y descripción de la noticia mediante HU-05, persistir el resultado y responder `200` con `{ newsId, sentiment }`. El sistema MUST NOT inferir el idioma.

#### Scenario: Análisis en español
- **GIVEN** una noticia existente y entradas españolas coincidentes
- **WHEN** se envía el POST con `{ "language": "es" }`
- **THEN** se usa exclusivamente el diccionario español
- **AND** la respuesta contiene el resultado persistido y el mismo `newsId`

#### Scenario: Análisis en inglés
- **GIVEN** una noticia existente y entradas inglesas coincidentes
- **WHEN** se envía el POST con `{ "language": "en" }`
- **THEN** se usa exclusivamente el diccionario inglés
- **AND** la respuesta contiene el resultado persistido

#### Scenario: Entrada inválida
- **GIVEN** un identificador no UUID, JSON inválido o un idioma ausente o distinto de `es` y `en`
- **WHEN** se envía la solicitud
- **THEN** la API responde `400`
- **AND** no analiza ni persiste un resultado

### Requirement: Recuperación sin recálculo
`GET /api/v1/news` SHALL incluir en cada noticia un campo `sentiment` nullable. Cuando exista, SHALL contener exactamente `score`, `matchedTerms`, `language` y `analyzedAt`. La consulta MUST NOT analizar, reanalizar ni cambiar datos.

#### Scenario: Recuperación del resultado
- **GIVEN** una noticia con análisis persistido
- **WHEN** se lista nuevamente
- **THEN** su objeto `sentiment` contiene el último resultado completo
- **AND** los campos anteriores de la noticia mantienen sus valores

#### Scenario: Consulta repetida estable
- **GIVEN** una noticia y un resultado persistido sin un nuevo POST
- **WHEN** se realizan varias consultas aunque cambie el diccionario
- **THEN** todas devuelven el mismo resultado almacenado
- **AND** `analyzedAt` no cambia

### Requirement: Análisis antes de escritura
El sistema SHALL persistir solo después de que la lectura de la noticia y el análisis HU-05 terminen correctamente. Un fallo de News, diccionario o motor MUST NOT crear un resultado neutral ni modificar el resultado previamente almacenado.

#### Scenario: Noticia inexistente
- **GIVEN** un UUID sin noticia asociada
- **WHEN** se solicita el análisis
- **THEN** la API responde `404`
- **AND** no invoca persistencia

#### Scenario: Fallo del diccionario
- **GIVEN** una noticia existente y el almacenamiento del diccionario no disponible
- **WHEN** se solicita el análisis
- **THEN** la API responde `503` con un error sanitizado
- **AND** no crea score cero ni reemplaza un resultado anterior

#### Scenario: Fallo de lectura de News
- **GIVEN** PostgreSQL no permite leer la noticia
- **WHEN** se solicita el análisis
- **THEN** la operación falla de forma controlada
- **AND** no intenta persistir el resultado

### Requirement: Escritura atómica y fallos PostgreSQL
La persistencia SHALL actualizar únicamente los cuatro campos de sentimiento mediante una operación atómica. Si PostgreSQL rechaza o no completa la actualización, el sistema SHALL informar un fallo controlado, MUST NOT devolver éxito y SHALL conservar el resultado anterior completo.

#### Scenario: Fallo durante la actualización
- **GIVEN** una noticia con o sin análisis anterior y un análisis nuevo ya calculado
- **WHEN** PostgreSQL falla al persistirlo
- **THEN** la API responde `503` con datos internos sanitizados
- **AND** no queda un resultado parcial
- **AND** un resultado anterior permanece sin cambios

#### Scenario: Eliminación concurrente
- **GIVEN** una noticia encontrada para análisis que desaparece antes de la escritura
- **WHEN** se intenta persistir
- **THEN** la API responde `404`
- **AND** no crea otra noticia

### Requirement: Reanálisis explícito
Cada POST válido SHALL realizar un análisis nuevo y reemplazar conjuntamente el resultado anterior. Cambiar el idioma o el diccionario MUST NOT modificar datos persistidos sin un nuevo POST. El sistema MUST NOT conservar historial dentro del alcance de HU-06.

#### Scenario: Reemplazo por nuevo resultado
- **GIVEN** una noticia con resultado persistido
- **WHEN** un POST posterior obtiene otro score o número de coincidencias
- **THEN** los cuatro campos anteriores se reemplazan por los del nuevo análisis
- **AND** la consulta devuelve solo el resultado nuevo

#### Scenario: Cambio de idioma explícito
- **GIVEN** una noticia analizada previamente en español
- **WHEN** se reanaliza explícitamente en inglés
- **THEN** score, coincidencias, idioma y fecha corresponden conjuntamente al análisis inglés

#### Scenario: Cambio de diccionario sin reanálisis
- **GIVEN** una noticia con resultado persistido
- **WHEN** se modifica el diccionario y no se envía otro POST
- **THEN** el resultado persistido permanece idéntico

### Requirement: Concurrencia coherente
Cada persistencia SHALL escribir un objeto completo. Si dos reanálisis de la misma noticia concurren, el último update confirmado SHALL determinar el resultado completo recuperado; campos de ejecuciones distintas MUST NOT mezclarse.

#### Scenario: Dos reanálisis concurrentes
- **GIVEN** dos solicitudes válidas concurrentes para una noticia
- **WHEN** ambas completan sus escrituras
- **THEN** la consulta devuelve íntegramente uno de los dos resultados
- **AND** corresponde a la última escritura confirmada

### Requirement: Preservación de News, captura e IPTC
Analizar, persistir o reanalizar MUST NOT modificar el identificador, fuente, título, descripción, enlace, GUID, fechas RSS, fecha de captura ni Media Topics de la noticia. Capturar nuevamente un duplicado MUST NOT borrar, reemplazar ni recalcular su sentimiento. HU-06 MUST NOT alterar deduplicación, captura RSS ni scheduling.

#### Scenario: Campos existentes preservados
- **GIVEN** una noticia con todos sus metadatos y Media Topics
- **WHEN** se persiste o reemplaza su sentimiento
- **THEN** todos esos valores permanecen idénticos

#### Scenario: Duplicado capturado posteriormente
- **GIVEN** una noticia con sentimiento persistido
- **WHEN** captura procesa otra vez el mismo `sourceId` y `dedupeKey`
- **THEN** conserva el resultado de sentimiento
- **AND** mantiene el comportamiento de deduplicación anterior

### Requirement: Migración aditiva compatible
La migración HU-06 SHALL ser posterior e independiente de las migraciones HU-14, HU-16 y HU-17, MUST NOT modificar migraciones publicadas y SHALL aceptar noticias preexistentes dejándolas sin análisis. La integración SHALL conservar tanto `mediaTopicQcodes` de HU-16 como los campos de sentimiento.

#### Scenario: Base vacía
- **GIVEN** PostgreSQL 16 sin esquema
- **WHEN** se aplican todas las migraciones en orden
- **THEN** se crea un esquema válido con diccionario, Media Topics y sentimiento

#### Scenario: Noticias preexistentes
- **GIVEN** un esquema anterior con noticias almacenadas
- **WHEN** se aplica la migración HU-06
- **THEN** no se modifica ningún campo histórico
- **AND** las noticias quedan con `sentiment: null`

#### Scenario: Compatibilidad HU-16
- **GIVEN** una noticia con `mediaTopicQcodes`
- **WHEN** se aplica HU-06 y se analiza la noticia
- **THEN** sus QCodes permanecen intactos
- **AND** el resultado de sentimiento se almacena de forma independiente

### Requirement: Contrato OpenAPI sincronizado
Swagger y `docs/openapi.json` SHALL documentar el POST, su body, la respuesta y los códigos `200`, `400`, `404`, `500` y `503`, y SHALL documentar `sentiment` nullable en la respuesta de `GET /api/v1/news`.

#### Scenario: Documento generado
- **GIVEN** la aplicación compilada
- **WHEN** se genera OpenAPI desde NestJS
- **THEN** el contrato publicado coincide con las rutas y DTO reales
- **AND** distingue una noticia nunca analizada de un resultado con score cero
