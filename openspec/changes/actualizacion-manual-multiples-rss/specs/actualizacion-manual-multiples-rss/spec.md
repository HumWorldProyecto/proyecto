## Purpose

Permitir que un administrador actualice manualmente varias fuentes RSS seleccionadas en una sola operación e incorpore las noticias disponibles sin capturar fuentes ajenas a esa selección.

## ADDED Requirements

### Requirement: Endpoint y entrada de captura múltiple
El sistema SHALL exponer `POST /api/v1/sources/capture` con un body JSON requerido que contenga `sourceIds` como array de strings no vacíos. El sistema MUST NOT imponer un máximo de identificadores no definido por esta historia.

#### Scenario: Request estructuralmente válido
- **GIVEN** un body con `sourceIds` como array de strings no vacíos
- **WHEN** el administrador solicita `POST /api/v1/sources/capture`
- **THEN** el sistema evalúa la selección efectiva para la captura múltiple

#### Scenario: Request estructuralmente inválido
- **GIVEN** un body ausente, un `sourceIds` que no es array o un elemento que no es un string no vacío
- **WHEN** el administrador solicita la captura múltiple
- **THEN** el sistema responde `400 Bad Request`
- **AND** no inicia ninguna captura

#### Scenario: Cantidad de IDs sin máximo arbitrario
- **GIVEN** un request que contiene al menos dos identificadores efectivos válidos
- **WHEN** la cantidad de identificadores supera dos
- **THEN** el sistema no rechaza el request únicamente por esa cantidad

### Requirement: Deduplicación y cardinalidad efectiva
El sistema SHALL deduplicar `sourceIds` preservando la primera aparición de cada valor y SHALL exigir al menos dos identificadores efectivos después de deduplicar.

#### Scenario: Identificadores repetidos con cardinalidad suficiente
- **GIVEN** `sourceIds` igual a `[A, B, A]`
- **WHEN** el sistema construye la selección efectiva
- **THEN** la selección efectiva es `[A, B]`
- **AND** cada fuente se captura como máximo una vez

#### Scenario: Duplicados reducen la selección a una fuente
- **GIVEN** `sourceIds` igual a `[A, A]`
- **WHEN** el sistema construye la selección efectiva
- **THEN** responde `400 Bad Request`
- **AND** no inicia ninguna captura

#### Scenario: Se proporciona una sola fuente
- **GIVEN** `sourceIds` contiene un único identificador
- **WHEN** el sistema valida la selección efectiva
- **THEN** responde `400 Bad Request`
- **AND** no inicia ninguna captura

### Requirement: Procesamiento secuencial y determinista
El sistema SHALL procesar secuencialmente los identificadores efectivos y SHALL mantener en `results` el mismo orden producido por la deduplicación.

#### Scenario: La segunda captura espera a la primera
- **GIVEN** una selección efectiva `[A, B]`
- **WHEN** comienza la captura múltiple
- **THEN** la captura de B no comienza antes de que la captura de A se haya resuelto

#### Scenario: Orden estable de resultados
- **GIVEN** una selección efectiva `[A, B, C]`
- **WHEN** concluye la captura múltiple con cualquier combinación de resultados individuales
- **THEN** `results` conserva el orden A, B, C

### Requirement: Aislamiento por fuente
El sistema SHALL aislar el resultado de cada fuente, continuar con las fuentes posteriores después de cualquier fallo individual y responder `200 OK` a todo request batch válido independientemente de sus resultados individuales.

#### Scenario: Un fallo no detiene fuentes posteriores
- **GIVEN** una selección efectiva `[A, B, C]` donde A se completa, B falla y C puede completarse
- **WHEN** se ejecuta la captura múltiple
- **THEN** el sistema intenta capturar A, B y C en ese orden
- **AND** responde `200 OK` con un resultado para cada fuente

#### Scenario: Error individual no se convierte en error HTTP global
- **GIVEN** un request batch válido cuya fuente produce un error esperado de captura
- **WHEN** concluye la operación
- **THEN** el error aparece dentro de `results`
- **AND** no se transforma en una respuesta global `404`, `409`, `502` o `504`

#### Scenario: Error desconocido durante una fuente
- **GIVEN** que el caso de uso unitario produce un error no tipado al procesar una fuente
- **WHEN** el coordinador procesa ese error
- **THEN** registra para esa fuente `errorCode: "unexpected"`
- **AND** continúa con la fuente posterior

#### Scenario: Fallo global fuera del aislamiento
- **GIVEN** un fallo realmente inesperado fuera del procesamiento aislado por fuente
- **WHEN** el framework no puede completar la operación batch
- **THEN** el sistema puede responder `500 Internal Server Error` sin exponer detalles internos

### Requirement: Respuesta discriminada por fuente
El sistema SHALL responder los requests batch válidos con `{"results": [...]}`, incluyendo exactamente un resultado por cada `sourceId` efectivo. Cada resultado SHALL ser una unión discriminada por `status`.

#### Scenario: Resultado exitoso
- **GIVEN** una fuente capturada correctamente con tres ítems interpretados
- **WHEN** el sistema construye su resultado
- **THEN** devuelve `{"sourceId":"...","status":"completed","itemsParsed":3}`
- **AND** `itemsParsed` representa ítems RSS interpretados, no noticias persistidas

#### Scenario: Resultado fallido
- **GIVEN** una fuente cuyo procesamiento produce una categoría de error estable
- **WHEN** el sistema construye su resultado
- **THEN** devuelve `{"sourceId":"...","status":"failed","errorCode":"<categoría>"}`

#### Scenario: Respuesta sanitizada
- **GIVEN** un fallo individual con información técnica interna
- **WHEN** el sistema serializa el resultado fallido
- **THEN** no expone `Error.message`, stack, URL de fuente, DNS/IP ni detalles del upstream

### Requirement: Taxonomía estable de errores individuales
El sistema SHALL usar exclusivamente `source-not-found`, `source-inactive`, `source-busy`, `fetch/upstream`, `parse/invalid-rss`, `timeout` y `unexpected` como valores de `errorCode`.

#### Scenario: Fuente inexistente
- **GIVEN** un identificador efectivo que no corresponde a una fuente
- **WHEN** se procesa esa fuente
- **THEN** su resultado fallido contiene `errorCode: "source-not-found"`

#### Scenario: Fuente inactiva
- **GIVEN** un identificador efectivo correspondiente a una fuente inactiva
- **WHEN** se procesa esa fuente
- **THEN** su resultado fallido contiene `errorCode: "source-inactive"`

#### Scenario: Fuente ocupada
- **GIVEN** una fuente cuyo `sourceId` ya está protegido por el guard compartido
- **WHEN** se intenta procesar esa fuente
- **THEN** su resultado fallido contiene `errorCode: "source-busy"`
- **AND** las fuentes posteriores continúan

#### Scenario: Fallo de red o upstream
- **GIVEN** una fuente cuya descarga falla por red o upstream
- **WHEN** se procesa esa fuente
- **THEN** su resultado fallido contiene `errorCode: "fetch/upstream"`

#### Scenario: RSS inválido
- **GIVEN** una fuente que devuelve contenido no RSS o RSS inválido
- **WHEN** se procesa esa fuente
- **THEN** su resultado fallido contiene `errorCode: "parse/invalid-rss"`

#### Scenario: Timeout
- **GIVEN** una fuente cuya captura supera el timeout existente
- **WHEN** se procesa esa fuente
- **THEN** su resultado fallido contiene `errorCode: "timeout"`

#### Scenario: Fallo inesperado tipado
- **GIVEN** una fuente cuyo procesamiento produce la categoría estable `unexpected`
- **WHEN** se procesa esa fuente
- **THEN** su resultado fallido contiene `errorCode: "unexpected"`

### Requirement: Alcance limitado a la selección
El sistema SHALL intentar capturar exclusivamente las fuentes RSS identificadas en la selección efectiva.

#### Scenario: Existen fuentes no seleccionadas
- **GIVEN** que el sistema contiene fuentes seleccionadas y fuentes no seleccionadas
- **WHEN** el administrador inicia la actualización manual múltiple
- **THEN** el sistema no inicia una captura como parte de esa operación para ninguna fuente no seleccionada

### Requirement: Incorporación de noticias disponibles
El sistema SHALL incorporar las noticias disponibles obtenidas correctamente desde todas las fuentes RSS seleccionadas que puedan ser capturadas.

#### Scenario: Todas las fuentes seleccionadas entregan noticias
- **GIVEN** que cada fuente seleccionada entrega un canal RSS válido con noticias disponibles
- **WHEN** finaliza la actualización manual múltiple
- **THEN** el sistema incorpora las noticias disponibles de cada una de las fuentes seleccionadas

#### Scenario: Una fuente falla entre dos fuentes exitosas
- **GIVEN** que la primera y la tercera fuente entregan noticias y la segunda fuente falla
- **WHEN** finaliza la actualización manual múltiple
- **THEN** el sistema incorpora las noticias disponibles de la primera y la tercera fuente
- **AND** conserva el resultado fallido de la segunda

#### Scenario: Una fuente seleccionada no contiene noticias nuevas
- **GIVEN** que una fuente seleccionada no contiene noticias nuevas y otra fuente seleccionada sí las contiene
- **WHEN** finaliza la actualización manual múltiple
- **THEN** el sistema incorpora las noticias disponibles de la segunda fuente sin inventar noticias para la primera

### Requirement: Captura limitada a RSS
El sistema SHALL obtener contenido de las fuentes seleccionadas exclusivamente mediante sus canales RSS y MUST NOT realizar web scraping de las páginas enlazadas.

#### Scenario: Una noticia contiene un enlace a una página web
- **GIVEN** que un ítem RSS contiene un enlace a una página web externa
- **WHEN** el sistema procesa el ítem durante la actualización manual múltiple
- **THEN** el sistema usa el contenido provisto por RSS sin descargar ni extraer contenido de la página enlazada
