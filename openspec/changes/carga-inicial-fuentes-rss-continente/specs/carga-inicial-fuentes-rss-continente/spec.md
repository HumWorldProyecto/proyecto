## Purpose

Definir una carga inicial reproducible de fuentes RSS con cobertura continental explícita, compatible con fuentes anteriores sin geografía y sin alterar los contratos existentes de administración o captura.

## ADDED Requirements

### Requirement: Taxonomía continental opcional de las fuentes
El sistema SHALL permitir asociar opcionalmente cada fuente RSS con exactamente uno de estos continentes: `AFRICA`, `ASIA`, `EUROPE`, `NORTH_AMERICA`, `SOUTH_AMERICA` u `OCEANIA`. Esta taxonomía SHALL tratarse como una decisión de producto del Equipo 5 y MUST NOT incluir Antártida en HU-14.

#### Scenario: Fuente asociada a un continente aprobado
- **GIVEN** una fuente RSS incluida en la carga inicial
- **WHEN** el sistema persiste su asociación geográfica
- **THEN** conserva exactamente uno de los seis continentes aprobados

#### Scenario: Fuente anterior sin geografía
- **GIVEN** una fuente registrada antes de HU-14 sin información geográfica
- **WHEN** se incorpora la capacidad continental
- **THEN** la fuente puede conservar su continente ausente
- **AND** no se inventa una asociación geográfica para ella

#### Scenario: Antártida fuera de la taxonomía operativa
- **GIVEN** la taxonomía aprobada para la carga inicial de HU-14
- **WHEN** se validan sus valores admitidos
- **THEN** Antártida no forma parte del conjunto operativo

### Requirement: Dataset inicial completo y consistente
El sistema SHALL disponer de un dataset inicial versionado en el que cada entrada contenga una URL de fuente RSS y un continente aprobado. El dataset MUST contener al menos una fuente por cada continente aprobado y MUST NOT contener dos entradas cuyas URLs produzcan la misma representación normalizada.

#### Scenario: Cobertura mínima de todos los continentes
- **GIVEN** el dataset inicial aprobado
- **WHEN** se comprueba su cobertura geográfica
- **THEN** contiene al menos una fuente para cada uno de los seis continentes aprobados

#### Scenario: Entrada sin continente
- **GIVEN** una entrada del dataset inicial que no contiene continente
- **WHEN** se valida el dataset antes de persistirlo
- **THEN** el sistema rechaza el dataset completo
- **AND** no escribe ninguna fuente

#### Scenario: URLs normalizadas duplicadas en el dataset
- **GIVEN** dos entradas cuyas URLs producen la misma representación normalizada
- **WHEN** se valida el dataset antes de persistirlo
- **THEN** el sistema rechaza el dataset completo
- **AND** no escribe ninguna fuente

### Requirement: Curación previa de las fuentes del manifiesto
El dataset SHALL incorporar únicamente fuentes aprobadas previamente como RSS público real, no Atom, accesibles por HTTP o HTTPS sin autenticación, estables o canónicas, compatibles con la política SSRF existente e interpretables por `RssOnlyParser`. La selección SHOULD preferir HTTPS y MUST justificar el continente por el origen editorial del medio, no por la ubicación de su hosting. La curación y la carga MUST NOT recurrir a web scraping.

#### Scenario: Candidata apta para el manifiesto
- **GIVEN** una URL candidata para la carga inicial
- **WHEN** se revisa antes de incorporarla al manifiesto
- **THEN** se confirma que expone RSS y no Atom
- **AND** no requiere autenticación, cumple la política SSRF y es interpretable por `RssOnlyParser`
- **AND** se conserva una URL estable o canónica, preferentemente HTTPS

#### Scenario: Correspondencia geográfica editorial
- **GIVEN** una fuente RSS candidata y un continente propuesto
- **WHEN** se revisa su asociación geográfica
- **THEN** el continente se justifica por el origen editorial del medio
- **AND** no se infiere de la ubicación técnica del hosting
- **AND** no se usa scraping para establecer la asociación

### Requirement: Ejecución explícita y sin dependencia de red
El sistema SHALL ejecutar la carga inicial únicamente mediante una acción explícita posterior a las migraciones. La carga MUST NOT ejecutarse durante el arranque de la aplicación y MUST NOT realizar solicitudes HTTP, validaciones remotas, scraping ni otra dependencia de Internet.

#### Scenario: Ejecución intencional después de migraciones
- **GIVEN** que las migraciones de base de datos han finalizado correctamente
- **WHEN** un operador invoca explícitamente la carga inicial
- **THEN** el sistema procesa el dataset versionado

#### Scenario: Arranque normal de la aplicación
- **GIVEN** que la aplicación NestJS se inicia normalmente
- **WHEN** completa su arranque
- **THEN** no ejecuta la carga inicial como efecto lateral

#### Scenario: Entorno sin acceso a Internet
- **GIVEN** un dataset previamente aprobado y un entorno sin acceso de red externa
- **WHEN** se ejecuta la carga inicial
- **THEN** la carga puede completarse usando únicamente el dataset y PostgreSQL
- **AND** no descarga feeds ni páginas enlazadas

### Requirement: Creación de fuentes inexistentes
Cuando una URL normalizada del dataset no corresponda a una fuente existente, el sistema SHALL crear una fuente activa con el continente indicado por el dataset.

#### Scenario: Primera carga de una URL inexistente
- **GIVEN** una entrada válida cuya URL normalizada no existe en el registro de fuentes
- **WHEN** se ejecuta la carga inicial
- **THEN** el sistema crea una fuente activa con esa URL y su continente aprobado

### Requirement: Enriquecimiento de fuentes existentes sin continente
Cuando una URL normalizada del dataset corresponda a una fuente existente cuyo continente esté ausente, el sistema SHALL asignarle el continente del dataset y MUST preservar su identificador y su estado de activación.

#### Scenario: Fuente activa existente sin continente
- **GIVEN** una fuente activa existente con la misma URL normalizada y continente ausente
- **WHEN** se ejecuta la carga inicial
- **THEN** el sistema le asigna el continente del dataset
- **AND** conserva su identificador y su estado activo

#### Scenario: Fuente inactiva existente sin continente
- **GIVEN** una fuente inactiva existente con la misma URL normalizada y continente ausente
- **WHEN** se ejecuta la carga inicial
- **THEN** el sistema le asigna el continente del dataset
- **AND** conserva su identificador y permanece inactiva

### Requirement: Repetición idempotente de la carga
Cuando una URL normalizada ya exista con el mismo continente indicado por el dataset, el sistema MUST conservar la fuente sin duplicarla ni modificar su identificador o estado. Repetir la carga sobre el mismo estado SHALL producir el mismo estado persistido.

#### Scenario: Segunda ejecución sobre el mismo dataset
- **GIVEN** que una ejecución anterior completó la carga inicial
- **WHEN** se ejecuta nuevamente el mismo dataset
- **THEN** no se crean fuentes duplicadas
- **AND** cada fuente conserva su identificador, continente y estado

#### Scenario: Fuente previamente desactivada con el mismo continente
- **GIVEN** una fuente del dataset que existe con el mismo continente y está desactivada
- **WHEN** se repite la carga inicial
- **THEN** la fuente permanece desactivada
- **AND** no se crea otra fuente para su URL

### Requirement: Conflicto geográfico y atomicidad
Cuando una URL normalizada existente tenga un continente diferente del indicado por el dataset, el sistema MUST informar un conflicto controlado, MUST NOT reasignar silenciosamente la fuente y MUST abortar la carga completa. Cualquier otro fallo durante la persistencia MUST revertir todas las escrituras de esa ejecución.

#### Scenario: URL existente con continente diferente
- **GIVEN** una entrada cuya URL normalizada ya existe con un continente distinto
- **WHEN** se ejecuta la carga inicial
- **THEN** el sistema informa el conflicto
- **AND** no modifica el continente, identificador ni estado de la fuente existente
- **AND** revierte cualquier otra escritura de esa ejecución

#### Scenario: Fallo después de procesar entradas previas
- **GIVEN** una ejecución que ya ha procesado una o más entradas
- **WHEN** una entrada posterior produce un fallo
- **THEN** el sistema revierte las creaciones y actualizaciones de toda esa ejecución

### Requirement: Compatibilidad con el CRUD y la captura existentes
HU-14 MUST conservar el CRUD de fuentes basado únicamente en URL, sin añadir campos o filtros geográficos a su contrato REST, y MUST conservar la instantánea de captura formada únicamente por `id` y `url`. Los flujos HU-01, HU-02 y HU-03 MUST continuar funcionando sin depender del continente.

#### Scenario: Alta administrativa con solo URL
- **GIVEN** el contrato vigente de creación de fuentes
- **WHEN** un administrador registra una fuente proporcionando únicamente su URL
- **THEN** el sistema mantiene el comportamiento REST existente
- **AND** la fuente puede quedar sin continente

#### Scenario: Instantánea de fuentes elegibles
- **GIVEN** fuentes activas con o sin continente
- **WHEN** la captura solicita su instantánea elegible
- **THEN** cada elemento sigue conteniendo únicamente `id` y `url`

#### Scenario: Captura automática o manual
- **GIVEN** una fuente elegible asociada o no a un continente
- **WHEN** HU-01, HU-02 o HU-03 inicia su captura
- **THEN** el comportamiento de descarga, interpretación y persistencia de noticias no cambia por HU-14

### Requirement: Geografía asociada únicamente a la fuente
El sistema SHALL persistir el continente en la fuente RSS y MUST NOT copiarlo a las noticias. Una noticia SHALL mantener su referencia estable a la fuente para permitir que capacidades futuras resuelvan el continente mediante esa relación.

#### Scenario: Noticia capturada desde una fuente con continente
- **GIVEN** una noticia capturada desde una fuente asociada a un continente
- **WHEN** la noticia se persiste
- **THEN** mantiene su referencia a la fuente
- **AND** no almacena una copia del continente en la noticia
