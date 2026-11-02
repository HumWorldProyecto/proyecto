## ADDED Requirements

### Requirement: Caducidad global configurable
El administrador SHALL configurar el periodo de permanencia de las noticias en días desde su captura. Sin configurar o con la política desactivada, el sistema MUST NOT eliminar noticias por caducidad. La periodicidad de captura SHALL conservarse independiente.

#### Scenario: Configurar y consultar
- **GIVEN** una clave de gestión válida
- **WHEN** el administrador guarda un periodo válido
- **THEN** el periodo queda persistido y puede consultarse tras reiniciar.

#### Scenario: Valor inválido o ausencia de configuración
- **GIVEN** política sin configurar o una entrada inválida
- **WHEN** se consulta o intenta configurar la caducidad
- **THEN** no se asume un periodo por defecto ni se cambia el valor previo ante entrada inválida.

### Requirement: Purga exclusiva de noticias caducadas
El sistema SHALL eliminar únicamente noticias cuya fecha de captura sea estrictamente anterior al instante actual menos el periodo configurado. Una noticia en el límite o más reciente MUST permanecer. Fuentes, medios, diccionario y configuración MUST conservarse.

#### Scenario: Frontera temporal
- **GIVEN** noticias anteriores, iguales y posteriores al umbral de captura
- **WHEN** se ejecuta una purga
- **THEN** solo las anteriores se eliminan; se conservan las otras noticias, fuentes y configuración.

#### Scenario: Sin periodo configurado
- **GIVEN** política sin configurar
- **WHEN** ocurre una revisión automática o se pide purgar manualmente
- **THEN** no se elimina ninguna noticia y el resultado permite reconocer la falta de configuración.

### Requirement: Purga manual verificable
El administrador SHALL consultar una vista previa e iniciar la purga manual. La interfaz SHALL pedir confirmación explícita. Una política cambiada respecto de la vista previa MUST causar rechazo sin borrado hasta refrescarla. El cliente MUST NOT elegir un umbral arbitrario de borrado.

#### Scenario: Confirmación con política vigente
- **GIVEN** vista previa con periodo vigente y noticias caducadas
- **WHEN** el administrador confirma la purga con gestión
- **THEN** se aplica el criterio vigente y se devuelve el número eliminado; una repetición sin nuevos caducados devuelve cero.

#### Scenario: Cambió la política o no hay permiso
- **GIVEN** política cambiada o clave insuficiente
- **WHEN** se solicita la purga
- **THEN** se rechaza sin ejecutar borrado.

### Requirement: Revisión automática reutiliza el caso de uso
El sistema SHALL revisar automáticamente la caducidad configurada mediante el scheduling ratificado y ejecutar el mismo criterio de purga manual. Las ejecuciones simultáneas en una instancia MUST NOT solaparse y un fallo MUST NOT impedir futuras revisiones.

#### Scenario: Disparo automático
- **GIVEN** política configurada y noticias caducadas
- **WHEN** el job dispara la revisión
- **THEN** invoca el caso de uso compartido y conserva noticias vigentes.

#### Scenario: Solapamiento o fallo
- **GIVEN** una ejecución en curso o una revisión que falla
- **WHEN** se recibe otro disparo o llega una revisión futura
- **THEN** se evita el solapamiento de esa instancia y se permite reintentar tras terminar el fallo.
