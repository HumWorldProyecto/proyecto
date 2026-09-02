## Purpose

Definir el comportamiento observable de la actualización manual de una única fuente RSS registrada en HumWorld, disparada por un administrador, incluyendo el rechazo de fuentes no registradas y la comunicación del resultado del intento.

## ADDED Requirements

### Requirement: Inicio manual sobre una única fuente RSS registrada
El sistema SHALL permitir que un administrador inicie manualmente la actualización de una única fuente RSS que esté registrada en HumWorld.

#### Scenario: Inicio de actualización manual sobre una fuente registrada
- **GIVEN** una fuente RSS registrada en HumWorld
- **WHEN** el administrador inicia manualmente la actualización de esa fuente
- **THEN** el sistema intenta la captura sobre esa fuente

### Requirement: Exclusión de las demás fuentes configuradas
Cuando se inicia una actualización manual sobre una fuente, el sistema MUST NOT realizar solicitudes de captura a ninguna otra fuente RSS configurada en HumWorld.

#### Scenario: Otras fuentes configuradas no reciben solicitudes
- **GIVEN** existen al menos dos fuentes RSS registradas en HumWorld
- **WHEN** el administrador inicia manualmente la actualización de una de esas fuentes
- **THEN** el sistema no realiza solicitudes de captura a las demás fuentes registradas

### Requirement: Rechazo de fuente no registrada
Cuando la fuente indicada por el administrador no está registrada en HumWorld, el sistema MUST NOT realizar solicitudes externas de captura y SHALL comunicar el rechazo como resultado de la actualización manual.

#### Scenario: Fuente indicada no registrada
- **GIVEN** una dirección RSS que no está registrada en HumWorld
- **WHEN** el administrador inicia manualmente la actualización indicando esa dirección
- **THEN** el sistema no realiza solicitudes externas de captura
- **AND** comunica al límite abstracto de resultado un fallo por fuente no registrada

### Requirement: Uso exclusivo de RSS en la actualización manual
El sistema SHALL procesar exclusivamente contenido RSS al ejecutar una actualización manual y MUST NOT utilizar contenido Atom ni técnicas de web scraping para incorporar noticias.

#### Scenario: Respuesta en formato RSS
- **GIVEN** una fuente RSS registrada en HumWorld
- **WHEN** el administrador inicia manualmente su actualización
- **AND** la fuente responde con un formato RSS admitido que puede interpretarse
- **THEN** el sistema interpreta el feed RSS
- **AND** produce cero o más ítems RSS interpretados para el límite abstracto de salida

#### Scenario: Respuesta en formato Atom o contenido web no RSS
- **GIVEN** una fuente RSS registrada en HumWorld
- **WHEN** el administrador inicia manualmente su actualización
- **AND** la fuente responde con contenido Atom o con una página web que no es RSS
- **THEN** el sistema no produce ítems RSS para el límite de salida a partir de ese contenido
- **AND** no extrae contenido de la respuesta mediante web scraping

#### Scenario: No se realiza web scraping sobre las páginas enlazadas
- **GIVEN** una fuente RSS registrada devuelve un RSS válido
- **AND** los ítems RSS contienen enlaces a páginas web
- **WHEN** el administrador inicia manualmente su actualización
- **THEN** el sistema interpreta la información disponible en el RSS
- **AND** no realiza solicitudes a las páginas enlazadas con el objetivo de extraer su contenido

### Requirement: Finalización finita del intento
El sistema SHALL garantizar una finalización finita del intento de actualización manual cuando la fuente no responde.

#### Scenario: La fuente no responde
- **GIVEN** una fuente RSS registrada en HumWorld
- **WHEN** el administrador inicia manualmente su actualización
- **AND** la fuente no responde
- **THEN** el sistema finaliza el intento en un tiempo finito
- **AND** comunica al límite abstracto de resultado un fallo por falta de respuesta

### Requirement: Comunicación del resultado de la actualización manual
El sistema SHALL comunicar el resultado de cada actualización manual, indicando éxito con los ítems RSS producidos o fallo con su motivo, a través de un límite abstracto de resultado.

#### Scenario: Resultado de una actualización exitosa
- **GIVEN** una fuente RSS registrada en HumWorld responde con un RSS válido
- **WHEN** el administrador inicia manualmente su actualización
- **THEN** el sistema comunica al límite abstracto de resultado un éxito
- **AND** ese resultado incluye los ítems RSS interpretados producidos, si los hubiera

#### Scenario: Resultado de una actualización fallida
- **GIVEN** una fuente RSS registrada en HumWorld devuelve contenido que no puede interpretarse como RSS válido
- **WHEN** el administrador inicia manualmente su actualización
- **THEN** el sistema comunica al límite abstracto de resultado un fallo
- **AND** ese resultado incluye el motivo del fallo
