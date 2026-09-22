## Purpose

Definir el comportamiento observable de la actualización manual síncrona de una única fuente RSS activa mediante su identificador estable, reutilizando la captura y la salida de noticias existentes y comunicando un resultado HTTP seguro y verificable.

## ADDED Requirements

### Requirement: Inicio manual por identificador estable
El sistema SHALL permitir iniciar la actualización manual de una única fuente mediante `POST /api/v1/sources/:id/capture`, sin body, utilizando `:id` como identificador estable de la fuente.

#### Scenario: Captura manual exitosa por ID
- **GIVEN** existe una fuente RSS activa con un identificador estable
- **WHEN** se envía `POST /api/v1/sources/:id/capture` con ese identificador y sin body
- **AND** la fuente responde con un RSS válido
- **THEN** el sistema captura e interpreta exclusivamente esa fuente
- **AND** responde `200 OK`

### Requirement: Exclusión de las demás fuentes
Una actualización manual MUST limitarse a la fuente seleccionada y MUST NOT realizar solicitudes de captura a ninguna otra fuente configurada.

#### Scenario: Las demás fuentes no reciben solicitudes
- **GIVEN** existen varias fuentes RSS activas
- **WHEN** se inicia manualmente la captura de una de ellas mediante su ID
- **THEN** el sistema realiza solicitudes de captura únicamente a la fuente seleccionada
- **AND** no solicita las demás fuentes

### Requirement: Selección de una fuente activa elegible
Antes de cualquier solicitud externa, el sistema SHALL distinguir si el ID corresponde a una fuente inexistente, inactiva o activa elegible. Solo una fuente activa elegible puede capturarse.

#### Scenario: Fuente inexistente
- **GIVEN** el ID indicado no corresponde a una fuente registrada
- **WHEN** se solicita su actualización manual
- **THEN** el sistema no realiza solicitudes externas
- **AND** responde `404 Not Found`

#### Scenario: Fuente inactiva
- **GIVEN** el ID indicado corresponde a una fuente registrada pero inactiva
- **WHEN** se solicita su actualización manual
- **THEN** el sistema no realiza solicitudes externas
- **AND** responde `409 Conflict`

### Requirement: Resultado exitoso e itemsParsed
Cuando la fuente devuelve un RSS válido, el sistema SHALL entregar los ítems interpretados al mismo flujo de salida utilizado por la captura automática y SHALL responder `200 OK` con `sourceId`, `status: "completed"` e `itemsParsed`. `itemsParsed` MUST representar únicamente la cantidad de ítems interpretados del RSS y MUST NOT presentarse como cantidad de filas persistidas.

#### Scenario: RSS válido con ítems
- **GIVEN** una fuente activa elegible devuelve un RSS válido con ítems
- **WHEN** se completa su actualización manual
- **THEN** los ítems interpretados se entregan al flujo compartido de salida de noticias
- **AND** la respuesta es `200 OK`
- **AND** contiene el ID de la fuente, `status` igual a `completed` e `itemsParsed` igual a la cantidad de ítems interpretados

#### Scenario: RSS válido sin ítems
- **GIVEN** una fuente activa elegible devuelve un RSS válido sin ítems
- **WHEN** se completa su actualización manual
- **THEN** la respuesta es `200 OK`
- **AND** contiene el ID de la fuente, `status` igual a `completed` e `itemsParsed` igual a `0`

#### Scenario: Ítems ya existentes
- **GIVEN** una fuente activa elegible devuelve un RSS válido con ítems que HU-04 ya había almacenado para esa fuente e identidad
- **WHEN** se completa su actualización manual
- **THEN** HU-04 evita crear registros duplicados
- **AND** la respuesta es `200 OK`
- **AND** `itemsParsed` refleja los ítems interpretados aunque no se hayan insertado filas nuevas

### Requirement: Uso exclusivo de RSS y ausencia de scraping
El sistema SHALL procesar exclusivamente contenido RSS y MUST NOT utilizar Atom ni técnicas de web scraping durante una actualización manual.

#### Scenario: Atom, HTML o RSS inválido
- **GIVEN** una fuente activa elegible devuelve Atom, HTML o contenido que no puede interpretarse como RSS válido
- **WHEN** se ejecuta su actualización manual
- **THEN** el sistema no produce ítems para el flujo de salida a partir de ese contenido
- **AND** responde `502 Bad Gateway`
- **AND** no expone mensajes internos ni detalles técnicos del upstream

#### Scenario: No se consultan páginas enlazadas
- **GIVEN** una fuente activa elegible devuelve un RSS válido cuyos ítems contienen enlaces a páginas web
- **WHEN** se ejecuta su actualización manual
- **THEN** el sistema interpreta solamente la información disponible en el RSS
- **AND** no realiza solicitudes a las páginas enlazadas para extraer contenido

### Requirement: Comunicación segura de fallos
El sistema SHALL clasificar los fallos mediante categorías estables independientes de `Error.message`, finalizar cada intento en tiempo finito y comunicar el estado HTTP correspondiente sin exponer información interna.

#### Scenario: Error de red, upstream o HTTP no satisfactorio
- **GIVEN** una fuente activa elegible no puede obtenerse por un error de red, del upstream o por una respuesta HTTP no satisfactoria
- **WHEN** se ejecuta su actualización manual
- **THEN** el sistema responde `502 Bad Gateway`
- **AND** no expone mensajes internos ni detalles técnicos del upstream

#### Scenario: Timeout de captura
- **GIVEN** una fuente activa elegible no responde dentro del deadline de captura
- **WHEN** se ejecuta su actualización manual
- **THEN** el intento finaliza en tiempo finito
- **AND** el sistema responde `504 Gateway Timeout`
- **AND** no expone mensajes internos ni detalles técnicos del upstream

#### Scenario: Error interno inesperado
- **GIVEN** ocurre un error inesperado que no pertenece a una categoría controlada de la actualización manual
- **WHEN** el sistema comunica el resultado
- **THEN** responde `500 Internal Server Error`
- **AND** no expone detalles internos

### Requirement: Exclusión de capturas simultáneas por fuente
El sistema MUST mantener como máximo una captura en curso por `sourceId` dentro de cada instancia del backend. Una segunda activación sobre la misma fuente MUST NOT iniciar otra captura ni quedar encolada.

#### Scenario: Petición manual sobre una fuente ocupada
- **GIVEN** existe una captura automática o manual en curso para una fuente
- **WHEN** se solicita manualmente capturar la misma fuente
- **THEN** el sistema no inicia ni encola otra captura
- **AND** responde `409 Conflict`

#### Scenario: Captura automática alcanza una fuente ocupada
- **GIVEN** existe una captura manual en curso para una fuente
- **WHEN** una ejecución automática alcanza esa misma fuente
- **THEN** el sistema no inicia ni encola una segunda captura de esa fuente
- **AND** conserva el comportamiento del scheduler y continúa sin ejecutar esa fuente de forma concurrente
