## Purpose

Definir el comportamiento observable de la identidad y persistencia de noticias capturadas con sus metadatos RSS, así como su disponibilidad para consulta mediante la API REST de HumWorld.

## ADDED Requirements

### Requirement: Persistencia de una noticia identificable con sus metadatos RSS

Cuando la captura RSS entrega un ítem con una identidad válida, el sistema SHALL almacenarlo como noticia junto con los metadatos disponibles del feed: título, enlace, fecha de publicación, fuente de origen, GUID y descripción.

#### Scenario: Ítem identificable con todos los metadatos disponibles

- **GIVEN** la captura RSS entrega un ítem identificable con título, enlace, fecha de publicación, fuente, GUID y descripción
- **WHEN** el sistema procesa ese ítem
- **THEN** almacena una noticia con esos metadatos asociados

#### Scenario: Ítem identificable con metadatos opcionales ausentes

- **GIVEN** la captura RSS entrega un ítem identificable cuyo feed de origen no incluye todos los metadatos opcionales
- **WHEN** el sistema procesa ese ítem
- **THEN** almacena la noticia conservando los metadatos disponibles del ítem

### Requirement: Resolución de identidad de una noticia capturada

Antes de persistir un ítem, el sistema SHALL normalizar su GUID y su enlace considerando ausentes los valores nulos, vacíos o compuestos solo por espacios. Si existe un GUID normalizado no vacío, SHALL utilizarlo como identidad primaria; si no existe GUID y sí un enlace normalizado no vacío, SHALL utilizar el enlace como identidad fallback. Si ambos están ausentes, el sistema MUST NOT almacenar el ítem.

#### Scenario: GUID presente como identidad primaria

- **GIVEN** un ítem capturado contiene un GUID no vacío y también un enlace no vacío
- **WHEN** el sistema resuelve su identidad
- **THEN** utiliza el GUID normalizado como identidad de la noticia

#### Scenario: Enlace presente como identidad fallback

- **GIVEN** un ítem capturado no contiene un GUID no vacío
- **AND** contiene un enlace no vacío
- **WHEN** el sistema resuelve su identidad
- **THEN** utiliza el enlace normalizado como identidad de la noticia

#### Scenario: Valores vacíos o compuestos solo por espacios

- **GIVEN** un ítem capturado contiene un GUID nulo, vacío o compuesto solo por espacios
- **AND** contiene un enlace nulo, vacío o compuesto solo por espacios
- **WHEN** el sistema normaliza esos valores
- **THEN** considera ausentes tanto el GUID como el enlace

#### Scenario: GUID válido sin enlace ni título

- **GIVEN** un ítem capturado contiene un GUID no vacío
- **AND** no contiene enlace ni título
- **WHEN** el sistema procesa ese ítem
- **THEN** lo considera identificable mediante el GUID
- **AND** almacena la noticia con los metadatos disponibles

#### Scenario: Ítem sin GUID ni enlace

- **GIVEN** un ítem capturado no contiene GUID ni enlace
- **WHEN** el sistema procesa ese ítem
- **THEN** no almacena una noticia a partir de él

### Requirement: Unicidad de una noticia dentro de su fuente

El sistema MUST NOT crear una noticia adicional cuando recibe desde una misma fuente un ítem cuya identidad normalizada ya fue almacenada. La misma identidad recibida desde fuentes diferentes SHALL corresponder a registros independientes.

#### Scenario: Mismo GUID en la misma fuente

- **GIVEN** una fuente ya produjo una noticia almacenada con un GUID determinado
- **WHEN** esa misma fuente entrega nuevamente un ítem con el mismo GUID normalizado
- **THEN** el sistema mantiene una sola noticia para esa fuente e identidad

#### Scenario: Mismo enlace fallback en la misma fuente

- **GIVEN** una fuente ya produjo una noticia almacenada identificada por su enlace porque no tenía GUID
- **WHEN** esa misma fuente entrega nuevamente un ítem sin GUID y con el mismo enlace normalizado
- **THEN** el sistema mantiene una sola noticia para esa fuente e identidad

#### Scenario: Misma identidad en fuentes diferentes

- **GIVEN** una fuente produjo una noticia identificada por un GUID o por un enlace fallback
- **WHEN** otra fuente diferente entrega un ítem con la misma identidad normalizada
- **THEN** el sistema permite una noticia independiente para cada fuente

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

### Requirement: Manejo controlado de errores y descartes

Un fallo al almacenar un ítem o al consultar las noticias almacenadas MUST NOT dejar al sistema en un estado indefinido ni exponer detalles internos. Descartar un ítem sin identidad MUST NOT considerarse un error de persistencia ni impedir procesar los ítems siguientes.

#### Scenario: Fallo al almacenar un ítem identificable

- **GIVEN** el sistema recibe un ítem identificable desde la captura RSS
- **WHEN** ocurre un fallo al intentar almacenarlo
- **THEN** el sistema contiene el fallo sin interrumpir el procesamiento de los demás ítems o fuentes de esa ejecución de captura

#### Scenario: Fallo al consultar las noticias almacenadas

- **GIVEN** ocurre un fallo interno al procesar una consulta de listado de noticias
- **WHEN** se realiza esa consulta
- **THEN** el sistema responde con un código de error HTTP controlado
- **AND** la respuesta no expone detalles internos de la causa del fallo

#### Scenario: Descarte sin identidad y continuación

- **GIVEN** una secuencia contiene un ítem sin GUID ni enlace seguido de un ítem identificable
- **WHEN** el sistema procesa la secuencia
- **THEN** descarta el primer ítem sin tratarlo como un error de persistencia
- **AND** continúa procesando el ítem identificable siguiente
