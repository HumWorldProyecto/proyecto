## Purpose

Definir el comportamiento observable de la gestión CRUD del diccionario ponderado que consumirá el análisis de sentimiento de HumWorld, incluido su contrato REST, normalización, persistencia, errores y puerto interno de lectura.

## ADDED Requirements

### Requirement: Representación de una entrada del diccionario
El sistema SHALL representar cada entrada mediante `id`, `term`, `language` y `weight`. `id` SHALL ser un UUID persistente; `language` SHALL ser `es` o `en`; y `weight` SHALL ser un entero entre `-5` y `+5`, incluidos ambos extremos y el valor cero.

#### Scenario: Entrada válida en español
- **GIVEN** un término normalizable y un peso entero dentro del rango
- **WHEN** se crea una entrada con `language: "es"`
- **THEN** la respuesta contiene un UUID, el término canónico, `language: "es"` y el peso indicado

#### Scenario: Peso cero explícito
- **GIVEN** una entrada válida con peso `0`
- **WHEN** se crea la entrada
- **THEN** el sistema la conserva como evidencia neutral explícita
- **AND** no la confunde con ausencia de coincidencias

### Requirement: Normalización canónica del término
El sistema SHALL normalizar cada término antes de validarlo, compararlo o almacenarlo mediante Unicode NFKC, minúsculas según su idioma, sustitución de secuencias que no sean letras o números por un espacio, colapso de espacios y `trim`. La normalización SHALL conservar los diacríticos.

#### Scenario: Canonicalización de mayúsculas, puntuación y espacios
- **GIVEN** el término `  MUY,   BUENO! ` en español
- **WHEN** se normaliza la entrada
- **THEN** el término canónico es `muy bueno`

#### Scenario: Conservación de diacríticos
- **GIVEN** los términos españoles `sí` y `si`
- **WHEN** se normalizan
- **THEN** permanecen como formas canónicas distintas

#### Scenario: Rechazo de una forma vacía
- **GIVEN** un término formado solo por espacios o puntuación
- **WHEN** se intenta crear o actualizar una entrada
- **THEN** el sistema responde `400 Bad Request`
- **AND** no cambia el diccionario

#### Scenario: Rechazo por longitud
- **GIVEN** un término cuya forma canónica supera 200 caracteres Unicode
- **WHEN** se intenta crear o actualizar una entrada
- **THEN** el sistema responde `400 Bad Request`

### Requirement: API REST del diccionario
El sistema SHALL publicar `POST /api/v1/dictionary`, `GET /api/v1/dictionary`, `GET /api/v1/dictionary/:id`, `PATCH /api/v1/dictionary/:id` y `DELETE /api/v1/dictionary/:id`. Los cuerpos y respuestas con contenido SHALL ser JSON y todas las operaciones SHALL aparecer en Swagger/OpenAPI.

#### Scenario: Contrato publicado
- **GIVEN** la aplicación está disponible
- **WHEN** se genera el contrato OpenAPI
- **THEN** aparecen las cinco operaciones del diccionario con sus DTO y códigos de respuesta

#### Scenario: Ausencia de endpoints adicionales
- **GIVEN** el contrato HU-17
- **WHEN** se inspeccionan las rutas nuevas
- **THEN** no existe importación masiva, búsqueda, paginación, restauración ni endpoint de análisis

### Requirement: Creación validada
`POST /api/v1/dictionary` SHALL aceptar `term`, `language` y `weight`, normalizar el término y responder `201 Created` con la entrada persistida. Datos ausentes, valores inválidos, idioma ajeno, peso no entero o peso fuera de rango SHALL producir `400 Bad Request` sin escritura. Propiedades ajenas MUST NOT persistirse ni aparecer en la respuesta.

#### Scenario: Creación correcta
- **GIVEN** no existe `muy bueno` en español
- **WHEN** se envía `{ "term": "Muy bueno", "language": "es", "weight": 4 }`
- **THEN** el sistema responde `201 Created`
- **AND** persiste `{ "term": "muy bueno", "language": "es", "weight": 4 }` con un UUID

#### Scenario: Idioma no admitido
- **GIVEN** una entrada con `language: "fr"`
- **WHEN** se intenta crear
- **THEN** el sistema responde `400 Bad Request`
- **AND** no persiste la entrada

#### Scenario: Peso inválido
- **GIVEN** un peso decimal o menor que `-5` o mayor que `5`
- **WHEN** se intenta crear
- **THEN** el sistema responde `400 Bad Request`
- **AND** no persiste la entrada

### Requirement: Unicidad por idioma y término canónico
El sistema MUST NOT conservar dos entradas con el mismo `language` y `term` canónico. Una colisión detectada antes o durante la escritura SHALL responder `409 Conflict`. La misma forma canónica MAY existir una vez en `es` y una vez en `en`.

#### Scenario: Duplicado tras normalizar
- **GIVEN** existe `muy bueno` en español
- **WHEN** se intenta crear ` MUY, BUENO! ` también en español
- **THEN** el sistema responde `409 Conflict`
- **AND** permanece una sola entrada

#### Scenario: Misma forma en idiomas distintos
- **GIVEN** existe una forma canónica en español
- **WHEN** se crea la misma forma canónica en inglés
- **THEN** el sistema responde `201 Created`
- **AND** ambas entradas conservan idiomas distintos

### Requirement: Listado determinista
`GET /api/v1/dictionary` SHALL responder `200 OK` con todas las entradas, ordenadas por `language`, luego `term` y finalmente `id`, sin filtros ni paginación en HU-17. Cuando el diccionario esté vacío SHALL devolver `[]`.

#### Scenario: Diccionario vacío
- **GIVEN** no existen entradas
- **WHEN** se consulta la colección
- **THEN** el sistema responde `200 OK` con `[]`

#### Scenario: Orden estable
- **GIVEN** existen entradas en ambos idiomas y con términos distintos
- **WHEN** se consulta la colección repetidamente sin escrituras intermedias
- **THEN** ambas respuestas contienen el mismo orden por idioma, término e identificador

### Requirement: Consulta por identificador
`GET /api/v1/dictionary/:id` SHALL responder `200 OK` con la entrada cuando exista, `400 Bad Request` para un identificador que no sea UUID y `404 Not Found` para un UUID ausente.

#### Scenario: Consulta existente
- **GIVEN** una entrada persistida
- **WHEN** se consulta mediante su UUID
- **THEN** el sistema devuelve exactamente `id`, `term`, `language` y `weight`

#### Scenario: UUID inexistente
- **GIVEN** un UUID válido que no corresponde a una entrada
- **WHEN** se consulta el detalle
- **THEN** el sistema responde `404 Not Found`

### Requirement: Actualización parcial atómica
`PATCH /api/v1/dictionary/:id` SHALL aceptar uno o varios de `term`, `language` y `weight`, exigir al menos uno, aplicar toda validación de creación y conservar el `id`. Un fallo de validación, inexistencia o duplicado MUST dejar intacta la entrada previa.

#### Scenario: Cambio de peso
- **GIVEN** una entrada existente
- **WHEN** se actualiza solo su peso con un entero válido
- **THEN** el sistema responde `200 OK`
- **AND** conserva el identificador, término e idioma

#### Scenario: Actualización vacía
- **GIVEN** una entrada existente
- **WHEN** se envía un objeto sin campos actualizables
- **THEN** el sistema responde `400 Bad Request`
- **AND** no modifica la entrada

#### Scenario: Colisión causada por actualización
- **GIVEN** existen dos entradas distintas
- **WHEN** una actualización haría coincidir idioma y término canónico con la otra
- **THEN** el sistema responde `409 Conflict`
- **AND** conserva ambas entradas anteriores

### Requirement: Eliminación física
`DELETE /api/v1/dictionary/:id` SHALL eliminar físicamente una entrada existente y responder `204 No Content` sin cuerpo. Un UUID ausente SHALL producir `404 Not Found`; un identificador mal formado SHALL producir `400 Bad Request`.

#### Scenario: Eliminación existente
- **GIVEN** una entrada persistida
- **WHEN** se elimina por su UUID
- **THEN** el sistema responde `204 No Content` sin cuerpo
- **AND** las lecturas posteriores ya no incluyen la entrada

#### Scenario: Eliminación inexistente
- **GIVEN** un UUID que no corresponde a una entrada
- **WHEN** se intenta eliminar
- **THEN** el sistema responde `404 Not Found`

### Requirement: Puerto de lectura para análisis
El módulo de diccionario SHALL exportar un puerto interno de solo lectura que reciba un idioma admitido y devuelva un snapshot inmutable de entradas de ese idioma, ordenado por término e identificador. El puerto MUST NOT exponer Prisma, DTO HTTP ni operaciones de escritura.

#### Scenario: Snapshot por idioma
- **GIVEN** existen entradas españolas e inglesas
- **WHEN** un consumidor solicita el snapshot español
- **THEN** recibe solo entradas `es` con `id`, `term`, `language` y `weight`
- **AND** el orden es estable

#### Scenario: Cambio aplicado a lecturas futuras
- **GIVEN** un consumidor ya obtuvo un snapshot
- **WHEN** otra operación actualiza o elimina una entrada
- **THEN** el snapshot anterior no muta
- **AND** una lectura posterior refleja el cambio

### Requirement: Diccionario inicialmente vacío
La migración HU-17 SHALL crear la estructura del diccionario sin insertar términos ni pesos editoriales. La API y el puerto de lectura MUST funcionar correctamente con cero filas.

#### Scenario: Migración sin seed editorial
- **GIVEN** una base PostgreSQL 16 vacía
- **WHEN** se aplican todas las migraciones del proyecto
- **THEN** la tabla del diccionario existe
- **AND** contiene cero entradas hasta que se use el CRUD

### Requirement: Límite de seguridad actual
HU-17 MUST NOT inventar autenticación, autorización, roles, API keys ni headers privilegiados. Mientras el producto carezca de una capacidad de seguridad aprobada, las operaciones SHALL seguir el mismo perímetro no autenticado de la API vigente y OpenAPI SHALL declarar la limitación administrativa.

#### Scenario: CRUD sin mecanismo ficticio
- **GIVEN** una solicitud válida sin credenciales
- **WHEN** usa una operación HU-17
- **THEN** no se rechaza por ausencia de un mecanismo de autenticación inexistente
- **AND** la documentación indica que el rol administrador aún no se hace cumplir técnicamente

### Requirement: Errores internos controlados
Un fallo inesperado de persistencia SHALL producir una respuesta controlada `500 Internal Server Error` sin exponer SQL, credenciales ni trazas. El sistema MUST NOT informar éxito ni confundir el fallo con colección vacía, inexistencia o duplicado.

#### Scenario: PostgreSQL falla durante una escritura
- **GIVEN** una solicitud válida
- **WHEN** el repositorio no puede completar la operación
- **THEN** el sistema responde `500 Internal Server Error`
- **AND** no expone detalles internos
