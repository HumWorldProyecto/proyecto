## Purpose

Definir el comportamiento observable de la persistencia de noticias capturadas junto con sus metadatos RSS y su disponibilidad para consulta mediante la API REST de HumWorld.

## ADDED Requirements

### Requirement: Persistencia de una noticia capturada con sus metadatos RSS
Cuando la captura RSS entrega un ítem interpretado, el sistema SHALL almacenarlo como noticia junto con los metadatos disponibles del feed: título, enlace, fecha de publicación, fuente de origen, GUID y descripción.

#### Scenario: Ítem capturado con todos los metadatos disponibles
- **GIVEN** la captura RSS entrega un ítem interpretado con título, enlace, fecha de publicación, fuente, GUID y descripción
- **WHEN** el sistema procesa ese ítem
- **THEN** almacena una noticia con esos metadatos asociados

#### Scenario: Ítem capturado con metadatos opcionales ausentes
- **GIVEN** la captura RSS entrega un ítem interpretado cuyo feed de origen no incluye todos los metadatos opcionales (por ejemplo, sin descripción o sin fecha de publicación)
- **WHEN** el sistema procesa ese ítem
- **THEN** almacena la noticia conservando los metadatos disponibles del ítem

### Requirement: No duplicar una noticia ya almacenada
El sistema MUST NOT crear una noticia adicional para un ítem que ya fue almacenado previamente desde la misma fuente.

#### Scenario: El mismo ítem se captura en dos ejecuciones distintas
- **GIVEN** una noticia ya almacenada, capturada de una fuente RSS
- **WHEN** una ejecución de captura posterior entrega nuevamente ese mismo ítem de esa fuente
- **THEN** el sistema no almacena una noticia adicional para ese ítem
- **AND** la noticia ya almacenada permanece disponible para consulta

### Requirement: Consulta de noticias almacenadas
El sistema SHALL exponer una operación de consulta que devuelva las noticias almacenadas junto con sus metadatos RSS.

#### Scenario: Existen noticias almacenadas
- **GIVEN** existen una o más noticias almacenadas
- **WHEN** se consulta la operación de listado de noticias
- **THEN** el sistema responde con código HTTP 200
- **AND** la respuesta contiene las noticias almacenadas con sus metadatos (título, enlace, fecha de publicación, fuente, GUID y descripción cuando estén disponibles)

#### Scenario: No existen noticias almacenadas
- **GIVEN** no existe ninguna noticia almacenada
- **WHEN** se consulta la operación de listado de noticias
- **THEN** el sistema responde con código HTTP 200
- **AND** la respuesta contiene una lista vacía

### Requirement: Manejo controlado de errores de persistencia y de consulta
Un fallo al almacenar un ítem capturado o al consultar las noticias almacenadas MUST NOT dejar al sistema en un estado indefinido ni exponer detalles internos del error.

#### Scenario: Fallo al almacenar un ítem capturado
- **GIVEN** el sistema recibe un ítem interpretado válido desde la captura RSS
- **WHEN** ocurre un fallo al intentar almacenarlo
- **THEN** el sistema contiene el fallo sin interrumpir el procesamiento de los demás ítems o fuentes de esa ejecución de captura

#### Scenario: Fallo al consultar las noticias almacenadas
- **GIVEN** ocurre un fallo interno al procesar una consulta de listado de noticias
- **WHEN** se realiza esa consulta
- **THEN** el sistema responde con un código de error HTTP controlado
- **AND** la respuesta no expone detalles internos de la causa del fallo
