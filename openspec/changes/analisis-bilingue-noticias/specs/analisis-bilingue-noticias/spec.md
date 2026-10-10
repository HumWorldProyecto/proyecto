## Purpose

Definir el comportamiento observable para analizar una noticia existente en español o inglés mediante selección explícita de idioma y sin persistir el resultado.

## ADDED Requirements

### Requirement: Análisis de noticias en español e inglés
El sistema SHALL producir un resultado de sentimiento para una noticia existente cuando el llamador seleccione explícitamente `es` o `en`. El resultado SHALL contener exactamente el `newsId` solicitado, `score` y `matchedTerms`.

#### Scenario: Noticia española
- **GIVEN** una noticia en español y un diccionario español con términos coincidentes
- **WHEN** se analiza con `language: "es"`
- **THEN** el sistema devuelve su `newsId`, score y número de coincidencias

#### Scenario: Noticia inglesa
- **GIVEN** una noticia en inglés y un diccionario inglés con términos coincidentes
- **WHEN** se analiza con `language: "en"`
- **THEN** el sistema devuelve su `newsId`, score y número de coincidencias

#### Scenario: Resultado positivo y negativo
- **GIVEN** noticias cuyos textos coinciden con pesos positivos o negativos del idioma seleccionado
- **WHEN** se analizan
- **THEN** sus scores reflejan el signo de los pesos coincidentes

### Requirement: Idioma explícito y aislado
El sistema SHALL usar únicamente entradas del diccionario cuyo idioma sea el `language` explícito. Entradas `es` y `en` MUST NOT mezclarse, incluso cuando tengan la misma forma canónica y pesos diferentes. El sistema MUST NOT detectar ni traducir el idioma.

#### Scenario: Misma forma con pesos distintos
- **GIVEN** la misma forma existe en `es` y `en` con pesos diferentes
- **WHEN** se analiza una noticia con uno de los idiomas
- **THEN** solo el peso de ese idioma participa en el resultado

#### Scenario: Término exclusivo del idioma opuesto
- **GIVEN** un texto coincide únicamente con una entrada de otro idioma
- **WHEN** se analiza con el idioma seleccionado
- **THEN** esa entrada no se cuenta

### Requirement: Segmentos y ausencia de coincidencias
El sistema SHALL analizar título y descripción como segmentos separados. Si no existen coincidencias en el idioma seleccionado o su diccionario está vacío, SHALL devolver `score: 0` y `matchedTerms: 0`.

#### Scenario: Frase no cruza título y descripción
- **GIVEN** una frase comienza al final del título y termina al inicio de la descripción
- **WHEN** se analiza la noticia
- **THEN** la frase no coincide entre ambos campos

#### Scenario: Sin coincidencias
- **GIVEN** una noticia cuyos textos no coinciden con entradas del idioma seleccionado
- **WHEN** se analiza
- **THEN** el resultado contiene `score: 0` y `matchedTerms: 0`

#### Scenario: Diccionario del idioma vacío
- **GIVEN** no existen entradas para el idioma seleccionado
- **WHEN** se analiza una noticia con texto
- **THEN** el resultado contiene `score: 0` y `matchedTerms: 0`

### Requirement: Asociación, determinismo y preservación
El resultado SHALL conservar exactamente el `newsId` solicitado. Para la misma noticia, idioma y snapshot de diccionario, el resultado SHALL ser determinista. El análisis MUST NOT crear, actualizar ni eliminar noticias, ni persistir score o coincidencias.

#### Scenario: Resultado asociado
- **GIVEN** dos noticias existentes
- **WHEN** se analiza una de ellas por su identificador
- **THEN** el resultado contiene ese identificador y no el de la otra noticia

#### Scenario: Repetición estable
- **GIVEN** noticia, idioma y diccionario sin cambios
- **WHEN** se repite el análisis
- **THEN** ambas invocaciones devuelven el mismo `newsId`, `score` y `matchedTerms`

#### Scenario: News permanece intacta
- **GIVEN** una noticia existente con todos sus campos
- **WHEN** termina el análisis
- **THEN** la fila conserva sus valores anteriores
- **AND** no existe persistencia del resultado de sentimiento

### Requirement: Noticia inexistente y fallos de lectura
Si `newsId` no existe, el sistema SHALL fallar con el error controlado de noticia inexistente. Si falla la lectura de News o del diccionario, SHALL propagar un error controlado y MUST NOT devolver un resultado neutral.

#### Scenario: Noticia inexistente
- **GIVEN** un `newsId` sin noticia asociada
- **WHEN** se solicita su análisis
- **THEN** el sistema produce un error controlado de noticia inexistente
- **AND** no invoca el motor de sentimiento

#### Scenario: Fallo de lectura de News
- **GIVEN** una indisponibilidad real del almacenamiento de noticias
- **WHEN** se solicita un análisis
- **THEN** el sistema produce un error controlado de lectura
- **AND** no devuelve `score: 0, matchedTerms: 0`

#### Scenario: Fallo de lectura del diccionario
- **GIVEN** una noticia legible y una indisponibilidad real del diccionario
- **WHEN** se solicita un análisis
- **THEN** el sistema produce un error controlado del diccionario
- **AND** no devuelve `score: 0, matchedTerms: 0`

### Requirement: Límites de HU-07
HU-07 MUST reuse `NewsSentimentAnalysisService` y `SentimentAnalyzerPort`. HU-07 MUST NOT crear endpoint, detectar idioma, persistir el resultado, modificar News o Prisma, ni alterar captura RSS, deduplicación o scheduling.

#### Scenario: Composición existente
- **GIVEN** la aplicación con HU-17 y HU-05
- **WHEN** NestJS resuelve el caso de uso de noticias
- **THEN** utiliza los puertos existentes de News y sentimiento
- **AND** no necesita un componente productivo adicional para HU-07
