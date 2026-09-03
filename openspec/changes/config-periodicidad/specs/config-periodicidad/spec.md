## Purpose

Definir el comportamiento observable de la configuración y consulta de la periodicidad global de captura automática, incluida su API REST, el estado inicial sin configurar, el recálculo ante cambios y la exposición inequívoca hacia HU-01.

## ADDED Requirements

### Requirement: Configuración REST mediante un catálogo cerrado
El sistema SHALL permitir configurar la periodicidad mediante `PUT /api/v1/config` con JSON y uno de estos valores expresados en minutos: 15, 30, 60, 360, 720 o 1440. El sistema MUST NOT aceptar otro valor. La operación SHALL estar documentada mediante Swagger/OpenAPI y MUST NOT exigir autenticación durante Sprint 1.

#### Scenario: PUT con un valor admitido
- **GIVEN** el administrador elige un valor del catálogo
- **WHEN** envía `PUT /api/v1/config` con `capturePeriodicityMinutes` igual a ese valor
- **THEN** el sistema guarda el valor como periodicidad vigente
- **AND** responde `200 OK` con `{ "capturePeriodicityMinutes": <valor> }`

#### Scenario: PUT con un valor no admitido
- **GIVEN** existe o no una periodicidad configurada
- **WHEN** se envía `PUT /api/v1/config` con un valor que no pertenece al catálogo
- **THEN** el sistema responde `400 Bad Request`
- **AND** conserva sin cambios el estado de periodicidad previo

#### Scenario: PUT idempotente con el valor ya vigente
- **GIVEN** existe una periodicidad configurada y un siguiente instante programado
- **WHEN** se envía `PUT /api/v1/config` con el mismo valor vigente
- **THEN** el sistema responde `200 OK` con la configuración vigente
- **AND** no escribe de nuevo ni modifica `updatedAt`
- **AND** no emite una notificación de cambio
- **AND** no cancela, reemplaza ni reprograma el job futuro
- **AND** conserva el siguiente instante ya programado

### Requirement: Periodicidad global única para todas las fuentes
El sistema SHALL aplicar un único estado de periodicidad a la captura automática de todas las fuentes RSS. El sistema MUST NOT admitir periodicidades distintas por fuente.

#### Scenario: Un único valor rige toda la captura automática
- **GIVEN** existen varias fuentes RSS registradas
- **AND** se ha configurado una periodicidad
- **WHEN** el sistema determina la periodicidad aplicable a la captura automática
- **THEN** el mismo valor rige la captura de todas las fuentes

### Requirement: Consulta REST del estado vigente
El sistema SHALL exponer `GET /api/v1/config` como JSON y permitir distinguir inequívocamente un valor configurado del estado sin configurar. La operación SHALL estar documentada mediante Swagger/OpenAPI y MUST NOT exigir autenticación durante Sprint 1.

#### Scenario: GET con periodicidad configurada
- **GIVEN** la periodicidad vigente es 30 minutos
- **WHEN** se envía `GET /api/v1/config`
- **THEN** el sistema responde `200 OK`
- **AND** devuelve `{ "capturePeriodicityMinutes": 30 }`

#### Scenario: GET sin periodicidad configurada
- **GIVEN** la periodicidad está sin configurar
- **WHEN** se envía `GET /api/v1/config`
- **THEN** el sistema responde `200 OK`
- **AND** devuelve `{ "capturePeriodicityMinutes": null }`

### Requirement: Ausencia de valor funcional por defecto
Mientras no se haya guardado una periodicidad válida, el sistema SHALL mantener el estado sin configurar y MUST NOT asumir ningún valor del catálogo.

#### Scenario: Estado inicial sin configuración previa
- **GIVEN** no se ha configurado todavía una periodicidad
- **WHEN** el sistema obtiene el estado vigente
- **THEN** obtiene el estado sin configurar
- **AND** no obtiene un valor del catálogo como valor implícito

### Requirement: Recálculo inmediato desde el momento efectivo del cambio
Cuando se configura por primera vez o se modifica la periodicidad a un valor diferente, el sistema SHALL recalcular inmediatamente el siguiente instante futuro tomando como referencia el momento en que el nuevo estado queda persistido. El cambio MUST NOT interrumpir una captura que ya esté ejecutándose.

#### Scenario: Cambio de periodicidad reemplaza el siguiente instante futuro
- **GIVEN** existe una periodicidad y un siguiente instante ya programado
- **WHEN** se guarda un valor de periodicidad diferente
- **THEN** el sistema cancela o reemplaza únicamente la programación futura anterior
- **AND** calcula el nuevo siguiente instante con el nuevo valor desde el momento efectivo del cambio
- **AND** no usa como referencia la última captura ejecutada
- **AND** no interrumpe una captura que esté en curso

#### Scenario: Primera configuración establece el primer siguiente instante
- **GIVEN** la periodicidad está sin configurar y no hay captura automática programada
- **WHEN** se guarda por primera vez un valor admitido
- **THEN** el sistema calcula el primer siguiente instante desde el momento efectivo de esa configuración

### Requirement: Exposición tipada de la periodicidad hacia HU-01
El sistema SHALL exponer mediante un límite abstracto uno de dos estados inequívocos: configurado con un valor del catálogo o sin configurar. El sistema MUST NOT representar ambos estados mediante un número simple.

#### Scenario: HU-01 obtiene un estado configurado
- **GIVEN** existe una periodicidad configurada
- **WHEN** HU-01 obtiene el estado mediante el límite abstracto
- **THEN** recibe el estado configurado junto con el valor vigente

#### Scenario: HU-01 obtiene el estado sin configurar
- **GIVEN** no existe una periodicidad configurada
- **WHEN** HU-01 obtiene el estado mediante el límite abstracto
- **THEN** recibe explícitamente el estado sin configurar
- **AND** no recibe ningún valor del catálogo
