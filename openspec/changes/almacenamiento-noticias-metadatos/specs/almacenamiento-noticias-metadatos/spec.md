## Purpose

Definir el comportamiento observable del almacenamiento de las noticias capturadas junto con sus metadatos RSS, incluyendo la identidad de una noticia, el descarte de ítems sin datos esenciales, la recaptura ignorada de noticias ya almacenadas y el aislamiento de fallos de almacenamiento por ítem.

## ADDED Requirements

### Requirement: Almacenamiento de una noticia con sus metadatos RSS
Cuando el sistema recibe un ítem RSS interpretado con sus datos esenciales, el sistema SHALL almacenar la noticia junto con los metadatos proporcionados por su fuente RSS.

#### Scenario: Almacenamiento de un ítem con metadatos completos
- **GIVEN** el límite abstracto de entrada recibe un ítem RSS interpretado con título, enlace y otros metadatos proporcionados por la fuente (por ejemplo, fecha de publicación, descripción o autor)
- **WHEN** el sistema procesa esa entrega
- **THEN** almacena la noticia
- **AND** almacena junto a ella los metadatos proporcionados por su fuente RSS

#### Scenario: Almacenamiento de un ítem con metadatos parciales
- **GIVEN** el límite abstracto de entrada recibe un ítem RSS interpretado con título y enlace, pero sin otros metadatos opcionales
- **WHEN** el sistema procesa esa entrega
- **THEN** almacena la noticia con los metadatos que la fuente proporcionó
- **AND** no rechaza la noticia por la ausencia de metadatos opcionales

### Requirement: Identidad de una noticia capturada
El sistema SHALL determinar que dos ítems RSS interpretados corresponden a la misma noticia cuando comparten el mismo `guid` proporcionado por el ítem, o cuando el ítem no trae `guid` y comparten el mismo enlace.

#### Scenario: Dos entregas con el mismo guid
- **GIVEN** una noticia ya almacenada a partir de un ítem con un `guid` determinado
- **WHEN** el sistema recibe un nuevo ítem entregado con ese mismo `guid`
- **THEN** el sistema reconoce que corresponde a la misma noticia ya almacenada

#### Scenario: Dos entregas sin guid pero con el mismo enlace
- **GIVEN** una noticia ya almacenada a partir de un ítem sin `guid`, identificada por su enlace
- **WHEN** el sistema recibe un nuevo ítem entregado sin `guid` pero con ese mismo enlace
- **THEN** el sistema reconoce que corresponde a la misma noticia ya almacenada

### Requirement: Recaptura ignorada de una noticia ya almacenada
Cuando un ítem entregado corresponde a una noticia que ya está almacenada, el sistema SHALL ignorar esa recaptura y MUST NOT modificar el registro existente ni crear un registro adicional para esa noticia.

#### Scenario: Recaptura de una noticia ya almacenada
- **GIVEN** una noticia ya está almacenada a partir de una entrega anterior
- **WHEN** el sistema recibe un nuevo ítem entregado que corresponde a esa misma noticia
- **THEN** el sistema no modifica el registro existente
- **AND** no crea un registro adicional para esa noticia

#### Scenario: Recaptura proveniente de una entrega manual sobre una noticia capturada automáticamente
- **GIVEN** una noticia ya está almacenada a partir de una entrega de la captura automática
- **WHEN** el sistema recibe, desde una actualización manual, un nuevo ítem entregado que corresponde a esa misma noticia
- **THEN** el sistema no modifica el registro existente
- **AND** no crea un registro adicional para esa noticia

### Requirement: Descarte de ítems sin datos esenciales
Cuando un ítem RSS interpretado entregado no incluye título o no incluye enlace, el sistema MUST NOT almacenar ese ítem.

#### Scenario: Ítem entregado sin título
- **GIVEN** el límite abstracto de entrada recibe un ítem RSS interpretado sin título
- **WHEN** el sistema procesa esa entrega
- **THEN** el sistema no almacena ese ítem

#### Scenario: Ítem entregado sin enlace
- **GIVEN** el límite abstracto de entrada recibe un ítem RSS interpretado sin enlace
- **WHEN** el sistema procesa esa entrega
- **THEN** el sistema no almacena ese ítem

### Requirement: Aislamiento de fallos de almacenamiento por ítem
Cuando una entrega incluye varios ítems RSS interpretados, el sistema SHALL tratar el almacenamiento de cada ítem de forma independiente, de modo que el fallo al almacenar uno de ellos MUST NOT impedir almacenar los demás ítems de esa misma entrega.

#### Scenario: Un ítem sin datos esenciales no impide almacenar los demás ítems de la entrega
- **GIVEN** una entrega incluye dos ítems RSS interpretados: uno sin título y otro con título, enlace y metadatos completos
- **WHEN** el sistema procesa esa entrega
- **THEN** el sistema no almacena el ítem sin título
- **AND** almacena el ítem con datos completos junto con sus metadatos

### Requirement: Metadatos limitados a los proporcionados por el ítem entregado
El sistema SHALL almacenar únicamente los metadatos incluidos en el ítem RSS interpretado entregado y MUST NOT obtener metadatos adicionales mediante solicitudes a otras páginas o fuentes.

#### Scenario: Un ítem con enlace a una página externa
- **GIVEN** el límite abstracto de entrada recibe un ítem RSS interpretado cuyo enlace apunta a una página web
- **WHEN** el sistema almacena esa noticia
- **THEN** almacena únicamente los metadatos incluidos en el ítem entregado
- **AND** no realiza solicitudes a esa página para obtener metadatos adicionales
