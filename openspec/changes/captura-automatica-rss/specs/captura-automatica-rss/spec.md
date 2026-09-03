## Purpose

Definir el comportamiento observable de la captura automática de noticias desde el conjunto de fuentes que HU-15 proporciona para captura, respetando la periodicidad o su ausencia según HU-18 y aislando los fallos por fuente.

## ADDED Requirements

### Requirement: Ejecución automática según la periodicidad configurada
El sistema SHALL programar e iniciar capturas automáticas únicamente cuando HU-18 proporciona una periodicidad configurada. Mientras HU-18 indique que no existe periodicidad configurada, el sistema MUST NOT programar ni iniciar una ejecución automática.

#### Scenario: Programación con la periodicidad suministrada
- **GIVEN** HU-18 proporciona una periodicidad configurada
- **WHEN** el sistema programa la siguiente ejecución automática
- **THEN** utiliza esa periodicidad para determinar el siguiente instante de ejecución

#### Scenario: Ejecución al alcanzar el instante programado
- **GIVEN** existe una periodicidad configurada proporcionada por HU-18
- **AND** existe un siguiente instante de ejecución calculado con esa periodicidad
- **WHEN** se alcanza ese instante
- **THEN** el sistema inicia una ejecución automática de captura RSS

#### Scenario: Ausencia de periodicidad configurada
- **GIVEN** HU-18 indica que no existe una periodicidad configurada
- **WHEN** el sistema evalúa la programación de la captura automática
- **THEN** no programa una ejecución automática
- **AND** no realiza solicitudes externas de captura como consecuencia de una activación automática

### Requirement: Captura sobre el conjunto proporcionado por HU-15
En cada ejecución automática, el sistema SHALL intentar la captura sobre una instantánea del conjunto de fuentes que HU-15 proporciona para captura y MUST excluir toda fuente ajena a ese conjunto.

#### Scenario: Procesamiento del conjunto proporcionado
- **GIVEN** HU-15 proporciona un conjunto de fuentes para captura
- **WHEN** comienza una ejecución automática
- **THEN** el sistema intenta la captura sobre cada fuente incluida en la instantánea obtenida al comenzar esa ejecución

#### Scenario: Exclusión de una fuente ajena al conjunto proporcionado
- **GIVEN** existe una dirección que no forma parte del conjunto proporcionado por HU-15 para la ejecución
- **WHEN** comienza una ejecución automática
- **THEN** el sistema no realiza solicitudes de captura a esa dirección

### Requirement: Uso exclusivo de RSS
El sistema SHALL procesar exclusivamente contenido RSS para la captura automática y MUST NOT utilizar contenido Atom ni técnicas de web scraping para incorporar noticias.

#### Scenario: Respuesta en formato RSS
- **GIVEN** una fuente incluida en el conjunto proporcionado por HU-15
- **WHEN** la fuente responde con un formato RSS admitido que puede interpretarse
- **THEN** el sistema interpreta el feed RSS
- **AND** produce cero o más ítems RSS interpretados para el límite de salida de captura

#### Scenario: Respuesta en formato Atom
- **GIVEN** una fuente incluida en el conjunto proporcionado por HU-15
- **WHEN** la fuente responde con contenido Atom
- **THEN** el sistema no produce ítems RSS para el límite de salida a partir de ese contenido

#### Scenario: Respuesta con contenido web no RSS
- **GIVEN** una fuente incluida en el conjunto proporcionado por HU-15
- **WHEN** la fuente responde con una página web o con otro contenido que no es RSS
- **THEN** el sistema no produce ítems RSS para el límite de salida a partir de ese contenido
- **AND** no extrae contenido de la respuesta mediante web scraping

#### Scenario: No se realiza web scraping sobre las páginas enlazadas
- **GIVEN** una fuente incluida en el conjunto proporcionado por HU-15 devuelve un RSS válido
- **AND** los ítems RSS contienen enlaces a páginas web
- **WHEN** se ejecuta la captura automática
- **THEN** el sistema interpreta la información disponible en el RSS
- **AND** produce cero o más ítems RSS interpretados para el límite de salida de captura
- **AND** no realiza solicitudes a las páginas enlazadas con el objetivo de extraer su contenido

### Requirement: Aislamiento de fallos por fuente
El sistema SHALL tratar de forma independiente cada fuente incluida en la instantánea de ejecución, de modo que el fallo o el contenido inválido de una fuente MUST NOT impedir intentar la captura desde las demás fuentes de esa instantánea.

#### Scenario: Una fuente no responde
- **GIVEN** la instantánea de ejecución contiene al menos dos fuentes
- **AND** una de esas fuentes falla o no responde
- **WHEN** se ejecuta la captura automática
- **THEN** el sistema intenta acceder a la fuente que falla o no responde
- **AND** continúa intentando acceder a las demás fuentes de la instantánea

#### Scenario: Una fuente devuelve contenido RSS inválido
- **GIVEN** la instantánea de ejecución contiene al menos dos fuentes
- **AND** una de esas fuentes devuelve contenido que no puede interpretarse como RSS válido
- **WHEN** se ejecuta la captura automática
- **THEN** el contenido inválido no produce ítems RSS para el límite de salida
- **AND** el sistema continúa intentando acceder a las demás fuentes de la instantánea

#### Scenario: El fallo de una fuente no impide procesar otra fuente válida
- **GIVEN** la instantánea de ejecución contiene dos fuentes
- **AND** la primera fuente no responde
- **AND** la segunda fuente devuelve un RSS válido
- **WHEN** se ejecuta la captura automática
- **THEN** el sistema intenta acceder a la primera fuente
- **AND** el fallo de la primera no impide intentar acceder a la segunda
- **AND** el sistema interpreta el RSS válido de la segunda fuente
- **AND** produce cero o más ítems RSS interpretados para el límite de salida de captura

### Requirement: Ejecución con un conjunto proporcionado vacío
Cuando HU-15 proporciona un conjunto vacío para captura, el sistema MUST NOT realizar solicitudes externas de captura ni producir ítems RSS interpretados para el límite de salida como resultado de esa ejecución.

#### Scenario: Ausencia de fuentes en el conjunto proporcionado
- **GIVEN** HU-15 proporciona un conjunto vacío para captura
- **WHEN** corresponde una ejecución automática
- **THEN** el sistema no realiza solicitudes externas de captura
- **AND** no produce ítems RSS para el límite de salida de captura
