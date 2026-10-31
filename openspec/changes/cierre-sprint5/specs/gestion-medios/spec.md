## ADDED Requirements

### Requirement: Gestión de medios con varias fuentes
El administrador SHALL crear, listar, consultar, renombrar y eliminar medios identificados por nombre, y asociar o desvincular fuentes RSS existentes. Un medio SHALL agrupar varias fuentes y una fuente SHALL pertenecer como máximo a un medio, admitiendo fuentes sin medio.

#### Scenario: Mantener un medio y sus fuentes
- **GIVEN** fuentes registradas
- **WHEN** se crea un medio, se asocian fuentes y se renombra
- **THEN** se recupera el medio actualizado y sus fuentes asociadas sin crear noticias ni modificar sus análisis.

#### Scenario: Eliminar o desvincular sin pérdida de noticias
- **GIVEN** un medio con fuentes y noticias analizadas
- **WHEN** se elimina el medio o se desvincula una fuente
- **THEN** se conservan fuentes/noticias/identificadores/análisis y las fuentes afectadas quedan sin ese medio.

#### Scenario: Entidad inexistente o entrada inválida
- **GIVEN** identificador inexistente o nombre inválido
- **WHEN** se intenta gestionar o asociar entidades
- **THEN** se rechaza sin crear relaciones inválidas ni borrar fuentes.

### Requirement: Permisos y contratos de administración
Las consultas de medios, política y vista previa SHALL aceptar consulta o gestión; sus mutaciones SHALL requerir gestión mediante P12. Ausencia/invalidez SHALL devolver 401, permiso insuficiente 403 antes de servicios. OpenAPI y web SHALL reflejar operaciones y errores sin persistir claves en cliente.

#### Scenario: Denegación antes de efectos
- **GIVEN** clave ausente o de consulta al mutar
- **WHEN** llega una operación administrativa nueva
- **THEN** se rechaza con 401 o 403 y no cambia la persistencia.
