## Purpose

Definir el comportamiento observable de la gestión de fuentes RSS mediante la API REST de HumWorld: creación, consulta, listado, actualización, desactivación reversible y exposición de fuentes activas elegibles hacia la captura automática (HU-01) y la actualización manual (HU-02).

## ADDED Requirements

### Requirement: API REST de gestión de fuentes RSS
El sistema SHALL exponer la gestión básica de fuentes como JSON bajo la base `/api/v1` mediante `POST /sources`, `GET /sources`, `GET /sources/:id`, `PUT /sources/:id`, `PATCH /sources/:id` y `DELETE /sources/:id`. Estas operaciones SHALL estar documentadas mediante Swagger/OpenAPI y MUST NOT exigir autenticación durante Sprint 1.

#### Scenario: Operaciones de fuentes publicadas en el contrato OpenAPI
- **GIVEN** la aplicación está disponible
- **WHEN** se consulta su contrato OpenAPI
- **THEN** el contrato describe las seis operaciones REST de gestión de fuentes
- **AND** sus cuerpos y respuestas se representan como JSON cuando contienen datos

### Requirement: Creación de una fuente RSS con URL válida y accesible
El sistema SHALL validar, al crear una fuente RSS, que la URL indicada tiene un formato sintácticamente válido, usa el esquema HTTP o HTTPS, no contiene credenciales embebidas y responde a una solicitud HTTP dentro de un tiempo finito. Solo cuando todas estas condiciones se cumplen SHALL registrar la fuente con estado activo.

#### Scenario: Creación con URL válida y accesible
- **GIVEN** el administrador aporta una URL sintácticamente válida y accesible mediante HTTP
- **WHEN** envía `POST /api/v1/sources` con esa URL
- **THEN** el sistema registra una fuente activa
- **AND** responde `201 Created` con la fuente creada

#### Scenario: Rechazo por URL sintácticamente inválida
- **GIVEN** el administrador aporta una URL con formato inválido
- **WHEN** envía `POST /api/v1/sources` con esa URL
- **THEN** el sistema responde `400 Bad Request`
- **AND** no registra ninguna fuente

#### Scenario: Rechazo por esquema no permitido
- **GIVEN** el administrador aporta una URL sintácticamente válida cuyo esquema no es HTTP ni HTTPS
- **WHEN** envía `POST /api/v1/sources` con esa URL
- **THEN** el sistema responde `400 Bad Request`
- **AND** no registra ninguna fuente

#### Scenario: Rechazo de una URL con credenciales embebidas
- **GIVEN** el administrador aporta una URL HTTP o HTTPS que incluye usuario o contraseña
- **WHEN** envía `POST /api/v1/sources` con esa URL
- **THEN** el sistema responde `400 Bad Request`
- **AND** no registra ninguna fuente

#### Scenario: Rechazo por URL inaccesible
- **GIVEN** el administrador aporta una URL sintácticamente válida que no responde mediante HTTP dentro del tiempo permitido
- **WHEN** envía `POST /api/v1/sources` con esa URL
- **THEN** el sistema responde `400 Bad Request`
- **AND** no registra ninguna fuente

### Requirement: Unicidad de la URL entre todas las fuentes
El sistema MUST NOT permitir que dos fuentes compartan la misma URL normalizada, tanto al crear como al actualizar, sin importar si están activas o desactivadas.

#### Scenario: Rechazo de creación con URL duplicada
- **GIVEN** existe una fuente activa o desactivada con una URL determinada
- **WHEN** el administrador intenta crear otra fuente cuya URL produce la misma representación normalizada
- **THEN** el sistema responde `409 Conflict`
- **AND** no registra una fuente adicional

#### Scenario: Rechazo de actualización hacia una URL duplicada
- **GIVEN** existen dos fuentes con URLs distintas
- **WHEN** el administrador intenta asignar a una de ellas una URL cuya representación normalizada coincide con la de la otra
- **THEN** el sistema responde `409 Conflict`
- **AND** conserva sin cambios la fuente que intentó actualizarse

### Requirement: Consulta de una fuente por identificador
El sistema SHALL permitir obtener una fuente registrada a partir de su identificador estable.

#### Scenario: Consulta de una fuente existente
- **GIVEN** una fuente registrada en HumWorld
- **WHEN** se envía `GET /api/v1/sources/:id` con su identificador
- **THEN** el sistema responde `200 OK`
- **AND** devuelve el identificador, la URL, el estado y las marcas temporales de la fuente

#### Scenario: Consulta de un identificador inexistente
- **GIVEN** un identificador que no corresponde a ninguna fuente
- **WHEN** se envía `GET /api/v1/sources/:id` con ese identificador
- **THEN** el sistema responde `404 Not Found`

### Requirement: Listado y filtrado de fuentes
El sistema SHALL permitir listar todas las fuentes y SHALL admitir como mínimo un filtro simple para seleccionar fuentes activas o desactivadas.

#### Scenario: Listado completo
- **GIVEN** existen fuentes activas y desactivadas
- **WHEN** se envía `GET /api/v1/sources` sin filtro
- **THEN** el sistema responde `200 OK`
- **AND** devuelve todas las fuentes con su estado

#### Scenario: Filtro de fuentes activas
- **GIVEN** existen fuentes activas y desactivadas
- **WHEN** se envía `GET /api/v1/sources?active=true`
- **THEN** el sistema responde `200 OK`
- **AND** devuelve únicamente las fuentes activas

#### Scenario: Filtro de fuentes desactivadas
- **GIVEN** existen fuentes activas y desactivadas
- **WHEN** se envía `GET /api/v1/sources?active=false`
- **THEN** el sistema responde `200 OK`
- **AND** devuelve únicamente las fuentes desactivadas

#### Scenario: Rechazo de un filtro de estado inválido
- **GIVEN** un valor de filtro distinto de `true` o `false`
- **WHEN** se envía `GET /api/v1/sources` con ese valor en `active`
- **THEN** el sistema responde `400 Bad Request`

### Requirement: Reemplazo completo y actualización parcial
El sistema SHALL permitir reemplazar completamente los datos editables de una fuente mediante `PUT` y actualizar parcialmente sus datos o estado mediante `PATCH`. Una operación sobre un identificador inexistente MUST NOT crear una fuente.

#### Scenario: Reemplazo completo de una fuente existente
- **GIVEN** una fuente registrada
- **WHEN** se envía `PUT /api/v1/sources/:id` con todos sus datos editables válidos
- **THEN** el sistema guarda el reemplazo
- **AND** responde `200 OK` con la fuente actualizada

#### Scenario: Actualización parcial de una fuente existente
- **GIVEN** una fuente registrada
- **WHEN** se envía `PATCH /api/v1/sources/:id` con uno o más cambios válidos
- **THEN** el sistema modifica únicamente los datos indicados
- **AND** responde `200 OK` con la fuente actualizada

#### Scenario: Rechazo de actualización sobre identificador inexistente
- **GIVEN** un identificador que no corresponde a ninguna fuente
- **WHEN** se intenta actualizar mediante `PUT` o `PATCH`
- **THEN** el sistema responde `404 Not Found`
- **AND** no crea ni modifica ninguna fuente

### Requirement: Revalidación de la URL al actualizarla
Cuando un `PUT` o `PATCH` modifica la URL, el sistema SHALL aplicar todas las validaciones exigidas en la creación: sintaxis válida, esquema HTTP/HTTPS, ausencia de credenciales embebidas y accesibilidad HTTP dentro del timeout finito.

#### Scenario: Actualización a una URL válida y accesible
- **GIVEN** una fuente registrada
- **WHEN** se actualiza su URL a una dirección válida, accesible y única
- **THEN** el sistema guarda la nueva URL normalizada
- **AND** responde `200 OK`

#### Scenario: Rechazo de actualización cuando la URL incumple una validación
- **GIVEN** una fuente registrada
- **WHEN** se intenta actualizar su URL a una dirección sintácticamente inválida, con esquema no permitido, con credenciales embebidas o inaccesible dentro del timeout
- **THEN** el sistema responde `400 Bad Request`
- **AND** conserva la URL y el estado anteriores

### Requirement: Desactivación mediante eliminación lógica
El sistema SHALL interpretar `DELETE /api/v1/sources/:id` como una desactivación, sin borrar físicamente la fuente ni sus noticias asociadas.

#### Scenario: Desactivación de una fuente existente
- **GIVEN** una fuente registrada y activa
- **WHEN** se envía `DELETE /api/v1/sources/:id`
- **THEN** el sistema marca la fuente como desactivada
- **AND** responde `204 No Content` sin cuerpo
- **AND** la fuente permanece consultable

#### Scenario: DELETE sobre una fuente ya desactivada
- **GIVEN** una fuente registrada que ya está desactivada
- **WHEN** se envía nuevamente `DELETE /api/v1/sources/:id`
- **THEN** la fuente permanece desactivada
- **AND** el sistema responde `204 No Content` sin cuerpo

#### Scenario: Rechazo de desactivación sobre identificador inexistente
- **GIVEN** un identificador que no corresponde a ninguna fuente
- **WHEN** se envía `DELETE /api/v1/sources/:id`
- **THEN** el sistema responde `404 Not Found`

### Requirement: Reactivación de una fuente desactivada
El sistema SHALL permitir reactivar una fuente mediante una actualización parcial de su estado.

#### Scenario: Reactivación mediante PATCH
- **GIVEN** una fuente registrada y desactivada
- **WHEN** se envía `PATCH /api/v1/sources/:id` solicitando el estado activo
- **THEN** el sistema marca la fuente como activa
- **AND** responde `200 OK`
- **AND** la fuente vuelve a ser elegible para capturas posteriores

### Requirement: Conservación de noticias asociadas
La desactivación o reactivación de una fuente MUST NOT eliminar ni modificar las noticias ya almacenadas que están asociadas a ella.

#### Scenario: Noticias intactas tras cambiar el estado de su fuente
- **GIVEN** una fuente tiene noticias almacenadas asociadas
- **WHEN** el administrador desactiva o reactiva esa fuente
- **THEN** las noticias asociadas permanecen sin cambios

### Requirement: Exposición de fuentes activas elegibles para la captura
El sistema SHALL exponer a HU-01 y HU-02 una instantánea que contenga únicamente el identificador estable y la URL de cada fuente activa elegible. Las fuentes desactivadas MUST quedar excluidas.

#### Scenario: Instantánea de fuentes elegibles
- **GIVEN** existen fuentes activas y desactivadas
- **WHEN** un proceso de captura solicita las fuentes elegibles
- **THEN** recibe una instantánea formada únicamente por las fuentes activas
- **AND** cada elemento contiene su identificador estable y su URL
- **AND** la instantánea no cambia si el registro se modifica después de haber sido obtenida
