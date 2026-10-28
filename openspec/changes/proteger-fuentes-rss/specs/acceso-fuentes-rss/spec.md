## ADDED Requirements

### Requirement: Configuración de acceso válida antes de servir peticiones
El sistema SHALL requerir dos credenciales de aplicación, consulta y gestión, configuradas externamente, diferentes y no vacías. MUST NOT usar credenciales predeterminadas ni servir peticiones con configuración inválida. Los fallos de configuración SHALL ser genéricos sin valores.

#### Scenario: Configuración inválida
- **GIVEN** falta alguna credencial, está vacía, contiene solo espacios o ambas son iguales
- **WHEN** se intenta iniciar la aplicación
- **THEN** el arranque falla antes de aceptar peticiones sin revelar las credenciales.

#### Scenario: Configuración válida
- **GIVEN** ambas credenciales son diferentes y no vacías
- **WHEN** la aplicación arranca
- **THEN** puede atender peticiones bajo la política P12 sin crear identidades personales.

### Requirement: Autenticar antes de ejecutar una operación protegida
El sistema SHALL recibir las credenciales exclusivamente mediante X-API-Key y devolver 401 genérico cuando falta la cabecera, está vacía o es inválida. SHALL aplicar este control antes de validar datos funcionales, buscar entidades o invocar servicios.

#### Scenario: Consulta de una fuente inexistente sin clave
- **GIVEN** la fuente no existe y no se presenta clave válida
- **WHEN** se solicita su detalle
- **THEN** se devuelve 401 y no se ejecuta la búsqueda.

#### Scenario: Cuerpo inválido sin clave
- **GIVEN** una petición de escritura tiene cuerpo mal formado o inválido y no tiene clave válida
- **WHEN** llega a una operación protegida
- **THEN** una petición JSON parseable se rechaza con 401 antes de la validación funcional, sin invocar el servicio. La sintaxis HTTP/JSON inválida conserva los rechazos del servidor antes de los guards.

### Requirement: Perfiles de consulta y gestión en toda la familia de fuentes
GET /api/v1/sources, GET /api/v1/sources/{id} y GET /api/v1/dashboards/geography SHALL aceptar consulta o gestión. POST /api/v1/sources, PUT/PATCH/DELETE /api/v1/sources/{id}, POST /api/v1/sources/{id}/capture, POST /api/v1/sources/capture y PUT /api/v1/dashboards/sources/{id}/geography SHALL aceptar únicamente gestión. Una credencial válida de consulta en escritura SHALL recibir 403 sin efectos ni llamadas al servicio. Las claves identifican aplicaciones consumidoras, no personas.

#### Scenario: Lecturas autorizadas
- **GIVEN** cualquiera de las dos claves válidas
- **WHEN** se realiza cualquiera de las tres consultas protegidas
- **THEN** la operación mantiene sus datos y códigos funcionales vigentes.

#### Scenario: Consulta intenta una escritura
- **GIVEN** la clave válida de consulta
- **WHEN** se invoca cualquiera de las siete escrituras protegidas
- **THEN** se devuelve 403 antes de validar el cuerpo funcional o invocar el servicio, sin cambios persistidos.

#### Scenario: Gestión realiza operaciones funcionales
- **GIVEN** la clave válida de gestión
- **WHEN** se consulta o modifica una fuente mediante una ruta protegida
- **THEN** se mantienen los códigos de éxito y los errores funcionales actuales, incluido 404 para fuente inexistente.

### Requirement: Contrato y cliente sin exposición de credenciales
OpenAPI SHALL declarar una API key en la cabecera X-API-Key, seguridad y respuesta 401 en las diez operaciones y 403 en las siete escrituras, conservando las demás respuestas. El cliente web SHALL recibir la clave durante el uso y enviarla en esa cabecera sin incorporarla al código distribuido, URL, respuestas, logs o almacenamiento persistente. Las operaciones de humor fuera del alcance SHALL conservar su contrato.

#### Scenario: Contrato exportado y Swagger
- **GIVEN** una aplicación configurada
- **WHEN** se abre Swagger o se exporta OpenAPI
- **THEN** se puede autorizar mediante la cabecera y se observa la matriz sin ejemplos con valores de claves.

#### Scenario: Operador proporciona o retira una clave en la web
- **GIVEN** la interfaz web sin credencial incrustada
- **WHEN** el operador proporciona una clave o la retira
- **THEN** las peticiones protegidas usan la clave actual solo en memoria; los rechazos 401/403 son comprensibles y la clave no se persiste.

### Requirement: Sustituir credenciales e invalidar las anteriores
El sistema SHALL permitir cambiar las credenciales mediante configuración y reinicio, rechazando la anterior y admitiendo la nueva conforme a su perfil. Las credenciales de CI SHALL ser diferentes de las locales y mantenerse fuera del repositorio.

#### Scenario: Rotación de la credencial de gestión
- **GIVEN** una aplicación que acepta las dos claves configuradas
- **WHEN** se sustituye gestión por un nuevo valor y se reinicia
- **THEN** la anterior devuelve 401, la nueva conserva permisos de gestión y consulta conserva su acceso.
