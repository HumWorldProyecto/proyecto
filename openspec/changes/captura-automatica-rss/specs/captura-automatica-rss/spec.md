## Purpose

Definir el comportamiento observable de la captura automática de noticias desde las fuentes RSS registradas en HumWorld, respetando la periodicidad configurada y aislando los fallos por fuente.

## ADDED Requirements

### Requirement: Ejecución automática según la periodicidad configurada
El sistema SHALL iniciar automáticamente la captura de noticias de acuerdo con la periodicidad actualmente configurada en HumWorld.

#### Scenario: Programación con la periodicidad suministrada
- **GIVEN** HU-18 proporciona una periodicidad configurada
- **WHEN** el sistema programa la siguiente ejecución automática
- **THEN** utiliza esa periodicidad para determinar el siguiente instante de ejecución

#### Scenario: Ejecución al alcanzar el instante programado
- **GIVEN** existe una periodicidad configurada proporcionada por HU-18
- **AND** existe un siguiente instante de ejecución calculado con esa periodicidad
- **WHEN** se alcanza ese instante
- **THEN** el sistema inicia una ejecución automática de captura RSS

### Requirement: Captura sobre las fuentes RSS registradas
En cada ejecución automática, el sistema SHALL intentar la captura sobre las fuentes RSS registradas en HumWorld y MUST excluir toda fuente no registrada.

#### Scenario: Procesamiento de fuentes registradas
- **GIVEN** existe un conjunto de fuentes RSS registradas en HumWorld
- **WHEN** comienza una ejecución automática
- **THEN** el sistema intenta la captura sobre cada una de esas fuentes registradas

#### Scenario: Exclusión de una fuente no registrada
- **GIVEN** existe una dirección RSS que no está registrada en HumWorld
- **WHEN** comienza una ejecución automática
- **THEN** el sistema no realiza solicitudes de captura a esa dirección

### Requirement: Uso exclusivo de RSS
El sistema SHALL procesar exclusivamente contenido RSS para la captura automática y MUST NOT utilizar contenido Atom ni técnicas de web scraping para incorporar noticias.

#### Scenario: Respuesta en formato RSS
- **GIVEN** una fuente RSS registrada en HumWorld
- **WHEN** la fuente responde con un formato RSS admitido que puede interpretarse
- **THEN** el sistema interpreta el feed RSS
- **AND** produce cero o más ítems RSS interpretados para el límite de salida de captura

#### Scenario: Respuesta en formato Atom
- **GIVEN** una fuente registrada en HumWorld
- **WHEN** la fuente responde con contenido Atom
- **THEN** el sistema no produce ítems RSS para el límite de salida a partir de ese contenido

#### Scenario: Respuesta con contenido web no RSS
- **GIVEN** una fuente registrada en HumWorld
- **WHEN** la fuente responde con una página web o con otro contenido que no es RSS
- **THEN** el sistema no produce ítems RSS para el límite de salida a partir de ese contenido
- **AND** no extrae contenido de la respuesta mediante web scraping

#### Scenario: No se realiza web scraping sobre las páginas enlazadas
- **GIVEN** una fuente registrada devuelve un RSS válido
- **AND** los ítems RSS contienen enlaces a páginas web
- **WHEN** se ejecuta la captura automática
- **THEN** el sistema interpreta la información disponible en el RSS
- **AND** produce cero o más ítems RSS interpretados para el límite de salida de captura
- **AND** no realiza solicitudes a las páginas enlazadas con el objetivo de extraer su contenido

### Requirement: Aislamiento de fallos por fuente
El sistema SHALL tratar de forma independiente cada fuente RSS registrada, de modo que el fallo o el contenido inválido de una fuente MUST NOT impedir intentar la captura desde las demás fuentes registradas.

#### Scenario: Una fuente no responde
- **GIVEN** existen al menos dos fuentes RSS registradas en HumWorld
- **AND** una de esas fuentes falla o no responde
- **WHEN** se ejecuta la captura automática
- **THEN** el sistema intenta acceder a la fuente que falla o no responde
- **AND** continúa intentando acceder a las demás fuentes registradas

#### Scenario: Una fuente devuelve contenido RSS inválido
- **GIVEN** existen al menos dos fuentes RSS registradas en HumWorld
- **AND** una de esas fuentes devuelve contenido que no puede interpretarse como RSS válido
- **WHEN** se ejecuta la captura automática
- **THEN** el contenido inválido no produce ítems RSS para el límite de salida
- **AND** el sistema continúa intentando acceder a las demás fuentes registradas

#### Scenario: El fallo de una fuente no impide procesar otra fuente válida
- **GIVEN** existen dos fuentes RSS registradas
- **AND** la primera fuente no responde
- **AND** la segunda fuente devuelve un RSS válido
- **WHEN** se ejecuta la captura automática
- **THEN** el sistema intenta acceder a la primera fuente
- **AND** el fallo de la primera no impide intentar acceder a la segunda
- **AND** el sistema interpreta el RSS válido de la segunda fuente
- **AND** produce cero o más ítems RSS interpretados para el límite de salida de captura

### Requirement: Ejecución sin fuentes configuradas
Cuando no existen fuentes RSS registradas en HumWorld, el sistema MUST NOT realizar solicitudes externas de captura ni producir ítems RSS interpretados para el límite de salida como resultado de esa ejecución.

#### Scenario: Ausencia de fuentes registradas
- **GIVEN** no existe ninguna fuente RSS registrada en HumWorld
- **WHEN** corresponde una ejecución automática
- **THEN** el sistema no realiza solicitudes externas de captura
- **AND** no produce ítems RSS para el límite de salida de captura
