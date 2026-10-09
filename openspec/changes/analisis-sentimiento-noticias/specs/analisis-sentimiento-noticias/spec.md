## Purpose

Definir el contrato observable y determinista del motor de sentimiento basado en diccionario y del caso de uso que vincula un resultado no persistido con la noticia analizada.

## ADDED Requirements

### Requirement: Puerto sustituible de análisis
El sistema SHALL definir `SentimentAnalyzerPort` sin dependencias de NestJS, Prisma, HTTP ni proveedores externos. El puerto SHALL recibir un idioma `es` o `en` y una colección ordenada de segmentos de texto anulables, y SHALL devolver asíncronamente `score` y `matchedTerms`.

#### Scenario: Contrato mínimo
- **GIVEN** un consumidor con idioma y segmentos
- **WHEN** invoca el puerto de análisis
- **THEN** recibe un número `score` entre `-1` y `1`
- **AND** un entero `matchedTerms` mayor o igual que cero

#### Scenario: Idioma no admitido
- **GIVEN** un idioma distinto de `es` o `en`
- **WHEN** se intenta construir una solicitud de análisis
- **THEN** la solicitud se rechaza como inválida

### Requirement: Normalización compartida
El analizador SHALL normalizar cada segmento y entrada mediante Unicode NFKC, minúsculas según el idioma, etiquetas HTML y secuencias que no sean letras o números convertidas en espacios, colapso de espacios y `trim`. La normalización SHALL conservar diacríticos y MUST NOT modificar el texto original.

#### Scenario: Coincidencia con mayúsculas y puntuación
- **GIVEN** el diccionario contiene `muy bueno`
- **WHEN** se analiza `<p>MUY, bueno!</p>`
- **THEN** se encuentra una coincidencia

#### Scenario: Diacríticos distintos
- **GIVEN** el diccionario contiene `sí`
- **WHEN** se analiza `si`
- **THEN** no se considera una coincidencia de `sí`

#### Scenario: Datos originales intactos
- **GIVEN** una noticia con mayúsculas, HTML y puntuación
- **WHEN** se analiza
- **THEN** la normalización solo afecta la comparación
- **AND** el título y la descripción recibidos no se mutan

### Requirement: Segmentos independientes
Cada segmento SHALL tokenizarse y analizarse por separado. Una frase MUST NOT formarse usando tokens de segmentos diferentes. Para una noticia, el título y la descripción SHALL ser dos segmentos; un valor nulo aporta un segmento vacío.

#### Scenario: Frase dentro de un campo
- **GIVEN** el diccionario contiene `muy bueno`
- **WHEN** el título contiene `muy bueno`
- **THEN** la frase cuenta una vez

#### Scenario: Frase que cruza campos
- **GIVEN** el diccionario contiene `muy bueno`
- **WHEN** el título termina en `muy` y la descripción comienza con `bueno`
- **THEN** la frase no coincide

### Requirement: Lectura del diccionario por idioma
Al comenzar un análisis no vacío, el motor SHALL obtener un snapshot mediante `DictionaryReaderPort` y SHALL considerar solo entradas del idioma solicitado. El snapshot SHALL permanecer estable durante esa invocación y MUST NOT consultarse por cada token.

#### Scenario: Aislamiento por idioma
- **GIVEN** existen entradas españolas e inglesas con formas iguales o distintas
- **WHEN** se analiza con idioma `es`
- **THEN** solo participan entradas españolas

#### Scenario: Una lectura por análisis
- **GIVEN** un texto no vacío con varias palabras
- **WHEN** se analiza
- **THEN** el puerto del diccionario se consulta exactamente una vez

### Requirement: Matching exacto y selección más larga
Una entrada SHALL coincidir solo como secuencia completa y contigua de tokens. En cada posición, si coinciden varias entradas, el motor SHALL elegir la de mayor número de tokens; ante un empate defensivo elegirá el menor `id`. Tras una coincidencia SHALL avanzar hasta el token siguiente a la frase.

#### Scenario: Límite de token
- **GIVEN** el diccionario contiene `bien`
- **WHEN** se analiza `también`
- **THEN** no existe coincidencia por subcadena

#### Scenario: Frase prioritaria sobre palabra contenida
- **GIVEN** existen `bueno` con peso `2` y `muy bueno` con peso `5`
- **WHEN** se analiza `muy bueno`
- **THEN** se cuenta solamente `muy bueno`
- **AND** `matchedTerms` es `1`

#### Scenario: Desempate defensivo
- **GIVEN** un snapshot inválido contiene dos coincidencias de igual longitud en la misma posición
- **WHEN** se analiza
- **THEN** el motor elige de forma estable la entrada con menor identificador

### Requirement: Repeticiones y solapamientos
`matchedTerms` SHALL contar ocurrencias seleccionadas, no entradas únicas. Cada repetición no solapada SHALL aportar nuevamente su peso. Las coincidencias solapadas MUST resolverse mediante el recorrido de izquierda a derecha y la selección más larga.

#### Scenario: Término repetido
- **GIVEN** `bueno` tiene peso `5`
- **WHEN** se analiza `bueno bueno bueno`
- **THEN** `matchedTerms` es `3`
- **AND** la suma de pesos es `15`

#### Scenario: Frase repetida sin solapamiento
- **GIVEN** `muy bueno` tiene peso `4`
- **WHEN** se analiza `muy bueno, muy bueno`
- **THEN** la frase cuenta dos veces

### Requirement: Fórmula y precisión del score
Con `n = matchedTerms > 0` y `S` como suma de pesos por ocurrencia, el resultado SHALL ser `clamp(S / (5 * n), -1, 1)`, redondeado a cuatro decimales con mitad alejándose de cero. El sistema SHALL convertir cualquier resultado `-0` en `0`.

#### Scenario: Promedio normalizado
- **GIVEN** tres ocurrencias con pesos `4`, `2` y `2`
- **WHEN** se calcula el resultado
- **THEN** `matchedTerms` es `3`
- **AND** `score` es `0.5333`

#### Scenario: Límite positivo
- **GIVEN** todas las ocurrencias tienen peso `5`
- **WHEN** se calcula el resultado
- **THEN** `score` es `1`

#### Scenario: Límite negativo
- **GIVEN** todas las ocurrencias tienen peso `-5`
- **WHEN** se calcula el resultado
- **THEN** `score` es `-1`

### Requirement: Diferenciación de ausencia y neutralidad observada
Cuando no existan coincidencias, el motor SHALL devolver `{ score: 0, matchedTerms: 0 }`. Si una o varias coincidencias de peso cero o pesos compensados producen score cero, `matchedTerms` SHALL conservar su cantidad positiva.

#### Scenario: Sin evidencia
- **GIVEN** ningún término coincide
- **WHEN** se analiza el texto
- **THEN** el resultado es `{ "score": 0, "matchedTerms": 0 }`

#### Scenario: Evidencia neutral por peso cero
- **GIVEN** una entrada coincidente con peso `0`
- **WHEN** se analiza
- **THEN** `score` es `0`
- **AND** `matchedTerms` es `1`

#### Scenario: Pesos compensados
- **GIVEN** coinciden pesos `5` y `-5`
- **WHEN** se analiza
- **THEN** `score` es `0`
- **AND** `matchedTerms` es `2`

### Requirement: Texto vacío y diccionario vacío
Si todos los segmentos son nulos, vacíos o quedan sin tokens tras normalizar, el motor SHALL devolver cero sin consultar el diccionario. Si el texto tiene tokens pero el snapshot del idioma está vacío, SHALL devolver `{ score: 0, matchedTerms: 0 }`.

#### Scenario: Título y descripción vacíos
- **GIVEN** título nulo y descripción formada solo por separadores
- **WHEN** se analiza la noticia
- **THEN** el resultado es cero sin coincidencias
- **AND** no se consulta el diccionario

#### Scenario: Diccionario sin entradas
- **GIVEN** texto no vacío y cero entradas del idioma solicitado
- **WHEN** se analiza
- **THEN** el resultado es `{ "score": 0, "matchedTerms": 0 }`

### Requirement: Fallos del diccionario no son neutralidad
Si `DictionaryReaderPort` falla al obtener el snapshot, el análisis SHALL fallar de forma controlada y MUST NOT devolver `{ score: 0, matchedTerms: 0 }`. El error no SHALL exponer SQL, credenciales ni detalles internos.

#### Scenario: PostgreSQL no disponible
- **GIVEN** un texto no vacío
- **WHEN** la lectura del diccionario falla
- **THEN** la operación de análisis falla con un error controlado
- **AND** no informa un resultado neutral o sin evidencia

### Requirement: Cambios del diccionario afectan análisis posteriores
Cada invocación SHALL usar un único snapshot. Una creación, actualización o eliminación completada después de obtenerlo MUST NOT alterar el análisis en curso y SHALL participar en la siguiente invocación. HU-05 MUST NOT recalcular resultados ya devueltos.

#### Scenario: Peso actualizado entre invocaciones
- **GIVEN** una entrada produjo un resultado con un peso anterior
- **WHEN** se actualiza el peso y se realiza otro análisis
- **THEN** la nueva invocación usa el peso actualizado
- **AND** el resultado anterior permanece sin cambios

#### Scenario: Término eliminado entre invocaciones
- **GIVEN** una entrada coincidió en un análisis previo
- **WHEN** se elimina y se repite el análisis
- **THEN** la nueva invocación ya no cuenta esa entrada

### Requirement: Lectura y análisis de una noticia existente
El sistema SHALL exponer un caso de uso interno que reciba `newsId` y un `language` explícito, consulte la noticia mediante `NewsForSentimentReaderPort` y analice su `title` y `description` como segmentos separados. El caso de uso SHALL devolver `{ newsId, score, matchedTerms }` y SHALL conservar el identificador sin modificación. HU-05 MUST NOT recibir título o descripción del llamador, guardar el resultado ni escribir en `News`.

#### Scenario: Análisis vinculado a datos existentes
- **GIVEN** una noticia existente identificada por `newsId`
- **WHEN** se invoca el caso de uso
- **THEN** el caso de uso obtiene una proyección inmutable con `id`, `title` y `description`
- **AND** envía título y descripción al analizador como segmentos separados
- **AND** el resultado contiene el mismo `newsId`
- **AND** el score y las coincidencias proceden del analizador

#### Scenario: Noticia inexistente
- **GIVEN** un `newsId` que no corresponde a una noticia
- **WHEN** se invoca el caso de uso
- **THEN** falla con un error controlado de noticia inexistente
- **AND** no se invoca el analizador ni se informa un resultado neutral

#### Scenario: Noticia sin texto analizable
- **GIVEN** una noticia existente cuyo título y descripción son nulos, vacíos o solo separadores
- **WHEN** se invoca el caso de uso
- **THEN** devuelve `{ newsId, score: 0, matchedTerms: 0 }`
- **AND** no se consulta el diccionario

#### Scenario: Sin escritura en News
- **GIVEN** un análisis completado
- **WHEN** termina HU-05
- **THEN** no se ha creado ni actualizado una columna de sentimiento en `News`
- **AND** la persistencia y recuperación posterior quedan para HU-06

### Requirement: Capas y composición utilizables
`NewsSentimentAnalysisService` SHALL depender de `NewsForSentimentReaderPort` y `SentimentAnalyzerPort`, nunca de Prisma directamente. Un adaptador de infraestructura SHALL implementar la lectura mínima de noticias. `SentimentModule` SHALL registrar y exportar el caso de uso; el contrato MUST NOT quedar como una interfaz sin composición ni prueba de uso.

#### Scenario: Composición real
- **GIVEN** la aplicación compilada con HU-17 y HU-05
- **WHEN** NestJS resuelve `NewsSentimentAnalysisService`
- **THEN** sus puertos de lectura de News y análisis tienen proveedores concretos
- **AND** el caso de uso puede ejecutarse sin controller HTTP

#### Scenario: Separación de acceso
- **GIVEN** una ejecución del caso de uso
- **WHEN** necesita los textos de una noticia
- **THEN** consulta `NewsForSentimentReaderPort` exactamente una vez
- **AND** el adaptador selecciona solo `id`, `title` y `description`
- **AND** no existe operación de creación o actualización de News

### Requirement: Límites con historias futuras
HU-05 MUST NOT publicar endpoints, detectar idioma, persistir resultados ni modificar captura, deduplicación o scheduling. Su puerto SHALL admitir `es/en` explícito y segmentos genéricos para que HU-07 resuelva idioma, HU-10 invoque directamente el analizador con un segmento y HU-06 persista posteriormente el resultado asociado.

#### Scenario: Texto directo futuro
- **GIVEN** HU-10 necesita analizar texto sin noticia
- **WHEN** reutiliza el puerto HU-05 en el futuro
- **THEN** puede enviar un único segmento y un idioma explícito
- **AND** HU-05 no ha creado anticipadamente el endpoint

#### Scenario: Persistencia futura
- **GIVEN** HU-06 necesita conservar un resultado
- **WHEN** consuma el resultado asociado
- **THEN** dispone de `newsId`, `score` y `matchedTerms`
- **AND** HU-05 no ha decidido el esquema ni la política de actualización de HU-06
