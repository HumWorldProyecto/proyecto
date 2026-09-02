## Purpose

Definir el comportamiento observable de la configuración y consulta administrativa de la periodicidad global de la captura automática de noticias RSS en HumWorld, incluido su estado inicial y su exposición hacia HU-01.

## ADDED Requirements

### Requirement: Configuración de la periodicidad mediante un catálogo cerrado
El sistema SHALL permitir a un administrador configurar la periodicidad de la captura automática eligiendo uno de los siguientes valores admitidos: 15 minutos, 30 minutos, 1 hora, 6 horas, 12 horas o 24 horas. El sistema MUST NOT aceptar ningún valor de periodicidad que no pertenezca a ese catálogo.

#### Scenario: Configuración con un valor admitido del catálogo
- **GIVEN** el administrador elige uno de los valores del catálogo admitido
- **WHEN** solicita configurar la periodicidad con ese valor
- **THEN** el sistema guarda ese valor como la periodicidad vigente

#### Scenario: Rechazo de un valor fuera del catálogo
- **GIVEN** el administrador indica un valor de periodicidad que no pertenece al catálogo admitido
- **WHEN** solicita configurar la periodicidad con ese valor
- **THEN** el sistema rechaza la configuración
- **AND** conserva la periodicidad vigente previa sin modificarla

### Requirement: Periodicidad global única para todas las fuentes
El sistema SHALL aplicar un único valor de periodicidad a la captura automática de todas las fuentes RSS registradas. El sistema MUST NOT admitir un valor de periodicidad distinto por fuente.

#### Scenario: Un único valor rige toda la captura automática
- **GIVEN** existen varias fuentes RSS registradas en HumWorld
- **AND** el administrador configura un valor de periodicidad
- **WHEN** el sistema determina la periodicidad aplicable a la captura automática
- **THEN** ese mismo valor rige la captura de todas las fuentes registradas

### Requirement: Consulta de la periodicidad vigente
El sistema SHALL permitir consultar el valor de periodicidad actualmente configurado.

#### Scenario: Consulta con un valor configurado
- **GIVEN** el administrador ha configurado previamente un valor de periodicidad
- **WHEN** se consulta la periodicidad vigente
- **THEN** el sistema devuelve ese valor configurado

### Requirement: Ausencia de periodicidad configurada por defecto
Mientras ningún administrador haya configurado un valor de periodicidad, el sistema SHALL mantener la periodicidad en estado "sin configurar" y MUST NOT asumir un valor por defecto.

#### Scenario: Estado inicial sin configuración previa
- **GIVEN** ningún administrador ha configurado todavía un valor de periodicidad
- **WHEN** se consulta la periodicidad vigente
- **THEN** el sistema indica que la periodicidad está sin configurar
- **AND** no devuelve ningún valor del catálogo como si fuera un valor configurado

### Requirement: Recálculo inmediato del siguiente instante ante un cambio de periodicidad
Cuando el administrador configura por primera vez o cambia el valor de periodicidad, el sistema SHALL recalcular de inmediato el siguiente instante de ejecución de la captura automática, tomando como referencia el momento en que se guarda el nuevo valor.

#### Scenario: Cambio de periodicidad reprograma el siguiente instante desde el momento del cambio
- **GIVEN** existe una periodicidad configurada y un siguiente instante de ejecución ya calculado con ese valor
- **WHEN** el administrador configura un nuevo valor de periodicidad
- **THEN** el sistema recalcula el siguiente instante de ejecución usando el nuevo valor
- **AND** toma como referencia el momento en que se guarda el cambio, no el momento de la última ejecución realizada

#### Scenario: Primera configuración establece el primer siguiente instante
- **GIVEN** la periodicidad está en estado "sin configurar"
- **WHEN** el administrador configura un valor de periodicidad por primera vez
- **THEN** el sistema calcula el siguiente instante de ejecución tomando como referencia el momento de esa configuración

### Requirement: Exposición de la periodicidad vigente mediante un límite abstracto
El sistema SHALL exponer el valor de periodicidad vigente, incluido el estado "sin configurar", a través de un límite abstracto de salida para su consumo por la captura automática (HU-01), sin comprometer en este cambio el mecanismo concreto de scheduling ni la interfaz de entrada administrativa (API, UI u otra).

#### Scenario: HU-01 obtiene el valor de periodicidad configurado
- **GIVEN** existe un valor de periodicidad configurado
- **WHEN** el proceso de captura automática obtiene la periodicidad a través del límite abstracto
- **THEN** el límite abstracto entrega ese valor configurado

#### Scenario: HU-01 obtiene el estado "sin configurar"
- **GIVEN** la periodicidad está en estado "sin configurar"
- **WHEN** el proceso de captura automática obtiene la periodicidad a través del límite abstracto
- **THEN** el límite abstracto entrega el estado "sin configurar"
- **AND** no entrega ningún valor del catálogo como si fuera un valor configurado
