## Purpose

Definir el comportamiento observable de la gestión administrativa de fuentes RSS en HumWorld: creación, consulta, actualización y desactivación reversible, junto con el contrato del conjunto de fuentes registradas activas que consumen la captura automática (HU-01) y la actualización manual (HU-02).

## ADDED Requirements

### Requirement: Creación de una fuente RSS con URL válida y accesible
El sistema SHALL validar, al crear una fuente RSS, que la URL indicada tiene un formato sintácticamente válido y responde a una solicitud HTTP, registrando la fuente únicamente cuando ambas condiciones se cumplen.

#### Scenario: Creación con URL válida y accesible
- **GIVEN** el administrador aporta una URL con formato sintácticamente válido que responde a una solicitud HTTP
- **WHEN** solicita crear una fuente con esa URL
- **THEN** el sistema registra la fuente
- **AND** la fuente queda activa en el conjunto de fuentes registradas

#### Scenario: Rechazo por URL sintácticamente inválida
- **GIVEN** el administrador aporta una URL con formato inválido
- **WHEN** solicita crear una fuente con esa URL
- **THEN** el sistema rechaza la creación
- **AND** no registra ninguna fuente

#### Scenario: Rechazo por URL inaccesible
- **GIVEN** el administrador aporta una URL con formato sintácticamente válido que no responde a una solicitud HTTP
- **WHEN** solicita crear una fuente con esa URL
- **THEN** el sistema rechaza la creación
- **AND** no registra ninguna fuente

### Requirement: Unicidad de la URL entre fuentes registradas
El sistema MUST NOT permitir que dos fuentes registradas compartan la misma URL, tanto al crear una fuente como al actualizar la URL de una existente, sin importar si las fuentes involucradas están activas o desactivadas.

#### Scenario: Rechazo de creación con URL duplicada
- **GIVEN** existe una fuente registrada con una URL determinada
- **WHEN** el administrador solicita crear una nueva fuente con esa misma URL
- **THEN** el sistema rechaza la creación
- **AND** no registra una fuente adicional con esa URL

#### Scenario: Rechazo de actualización hacia una URL duplicada
- **GIVEN** existen dos fuentes registradas con URLs distintas
- **WHEN** el administrador solicita actualizar una de ellas usando la URL de la otra
- **THEN** el sistema rechaza la actualización
- **AND** conserva la URL original de la fuente que intentó actualizarse

### Requirement: Consulta de una fuente registrada por identificador
El sistema SHALL permitir obtener los datos de una fuente registrada a partir de su identificador, y SHALL rechazar la consulta cuando el identificador no corresponde a ninguna fuente registrada.

#### Scenario: Consulta de una fuente existente
- **GIVEN** una fuente registrada en HumWorld
- **WHEN** el administrador consulta esa fuente por su identificador
- **THEN** el sistema devuelve los datos registrados de la fuente, incluido su estado activo o inactivo

#### Scenario: Consulta de un identificador inexistente
- **GIVEN** un identificador que no corresponde a ninguna fuente registrada
- **WHEN** el administrador consulta una fuente con ese identificador
- **THEN** el sistema rechaza la consulta
- **AND** comunica que la fuente no existe

### Requirement: Consulta del conjunto de fuentes registradas
El sistema SHALL permitir listar el conjunto completo de fuentes registradas en HumWorld, incluyendo tanto las activas como las desactivadas junto con su estado.

#### Scenario: Listado de fuentes activas e inactivas
- **GIVEN** existen fuentes registradas activas y fuentes registradas desactivadas
- **WHEN** el administrador solicita el listado de fuentes
- **THEN** el sistema devuelve todas las fuentes registradas
- **AND** cada fuente indica si está activa o desactivada

### Requirement: Actualización de los datos de una fuente existente
El sistema SHALL permitir actualizar los datos de una fuente registrada existente, y SHALL rechazar la actualización cuando el identificador indicado no corresponde a ninguna fuente registrada.

#### Scenario: Actualización exitosa de una fuente existente
- **GIVEN** una fuente registrada en HumWorld
- **WHEN** el administrador solicita actualizar sus datos con valores válidos
- **THEN** el sistema guarda los nuevos datos de la fuente

#### Scenario: Rechazo de actualización sobre identificador inexistente
- **GIVEN** un identificador que no corresponde a ninguna fuente registrada
- **WHEN** el administrador solicita actualizar una fuente con ese identificador
- **THEN** el sistema rechaza la actualización
- **AND** no crea ni modifica ninguna fuente

### Requirement: Revalidación de la URL al actualizarla
Cuando una actualización modifica la URL de una fuente existente, el sistema SHALL aplicar la misma validación de formato sintáctico y accesibilidad HTTP exigida en la creación, antes de aceptar el cambio.

#### Scenario: Actualización de la URL con un valor válido y accesible
- **GIVEN** una fuente registrada en HumWorld
- **WHEN** el administrador solicita actualizar su URL a una dirección con formato válido que responde a una solicitud HTTP
- **THEN** el sistema guarda la nueva URL de la fuente

#### Scenario: Rechazo de actualización con una URL inválida o inaccesible
- **GIVEN** una fuente registrada en HumWorld
- **WHEN** el administrador solicita actualizar su URL a una dirección con formato inválido, o a una dirección que no responde a una solicitud HTTP
- **THEN** el sistema rechaza la actualización
- **AND** conserva la URL original de la fuente

### Requirement: Desactivación (eliminación lógica) de una fuente
El sistema SHALL permitir desactivar una fuente registrada existente, de modo que deje de pertenecer al conjunto de fuentes registradas activas, sin eliminar su registro ni las noticias ya almacenadas asociadas a ella. El sistema SHALL rechazar la desactivación cuando el identificador indicado no corresponde a ninguna fuente registrada.

#### Scenario: Desactivación de una fuente activa
- **GIVEN** una fuente registrada y activa en HumWorld
- **WHEN** el administrador solicita desactivarla
- **THEN** el sistema marca la fuente como desactivada
- **AND** la fuente deja de pertenecer al conjunto de fuentes registradas activas
- **AND** el registro de la fuente permanece consultable

#### Scenario: Rechazo de desactivación sobre identificador inexistente
- **GIVEN** un identificador que no corresponde a ninguna fuente registrada
- **WHEN** el administrador solicita desactivar una fuente con ese identificador
- **THEN** el sistema rechaza la desactivación

### Requirement: Reactivación de una fuente desactivada
El sistema SHALL permitir reactivar una fuente previamente desactivada, devolviéndola al conjunto de fuentes registradas activas.

#### Scenario: Reactivación de una fuente desactivada
- **GIVEN** una fuente registrada y desactivada en HumWorld
- **WHEN** el administrador solicita reactivarla
- **THEN** el sistema marca la fuente como activa
- **AND** la fuente vuelve a pertenecer al conjunto de fuentes registradas activas

### Requirement: Conservación de las noticias asociadas a una fuente desactivada
Al desactivar una fuente, el sistema MUST NOT eliminar ni modificar las noticias ya almacenadas que están asociadas a esa fuente.

#### Scenario: Noticias intactas tras la desactivación de su fuente
- **GIVEN** una fuente registrada tiene noticias ya almacenadas asociadas a ella
- **WHEN** el administrador desactiva esa fuente
- **THEN** las noticias ya almacenadas asociadas a la fuente permanecen sin cambios

### Requirement: Exposición del conjunto de fuentes registradas activas para la captura
El sistema SHALL exponer únicamente las fuentes registradas activas, a través de un límite abstracto, para su consumo por la captura automática (HU-01) y la actualización manual (HU-02), sin comprometer en este cambio una interfaz de entrada concreta (API, UI u otra).

#### Scenario: El conjunto expuesto excluye las fuentes desactivadas
- **GIVEN** existen fuentes activas y fuentes desactivadas registradas en HumWorld
- **WHEN** el proceso de captura obtiene el conjunto de fuentes registradas a través del límite abstracto
- **THEN** el conjunto entregado incluye únicamente las fuentes activas
- **AND** excluye las fuentes desactivadas
