## Context

La motivación y el alcance funcional se describen en `proposal.md`; los comportamientos verificables están en `specs/config-periodicidad/spec.md`. El repositorio todavía no declara una pila tecnológica ni una implementación previa de persistencia o scheduling.

HU-01 (`captura-automatica-rss`) consume la periodicidad que administra este cambio mediante un límite abstracto, sin definir su contrato interno definitivo; a su vez, HU-01 todavía no está archivada en `openspec/specs/`, por lo que este cambio no puede expresar un delta `MODIFIED` formal sobre ella (ver `proposal.md`). El escenario de reacción de HU-01 ante el estado "sin configurar" se gestiona como una actualización aparte sobre el change pendiente `captura-automatica-rss`.

```text
Administrador
     |
     v
Configurar / consultar periodicidad  (este cambio)
     |
     v
Catálogo cerrado (15m, 30m, 1h, 6h, 12h, 24h)
     |
     v
Valor vigente (o "sin configurar")
     |
     v
límite abstracto de periodicidad
     |
     v
Disparador automático de HU-01 (fuera de este cambio)
```

## Goals / Non-Goals

**Goals:**

- Restringir la periodicidad a un catálogo cerrado de valores, evitando validación de rangos numéricos libres.
- Distinguir de forma inequívoca el estado "sin configurar" de cualquier valor del catálogo, para que HU-01 pueda decidir no programar ejecuciones.
- Garantizar que un cambio de periodicidad recalcule el siguiente instante desde el momento del cambio, de forma determinista y verificable.
- Mantener el límite abstracto hacia HU-01 desacoplado de la interfaz de entrada concreta y de la tecnología de persistencia.

**Non-Goals:**

- Diseñar la interfaz de entrada concreta (API, UI o CLI) que usará el administrador.
- Diseñar la autenticación o el control de acceso del administrador.
- Decidir el mecanismo concreto de scheduling de HU-01 ni su política de ejecuciones solapadas.
- Definir periodicidad por fuente o cualquier forma de configuración distinta de un único valor global.
- Modificar el spec ya existente de `captura-automatica-rss`; esa actualización se gestiona por separado.

## Decisions

Las decisiones aprobadas son elecciones técnicas de este cambio y no añaden requisitos funcionales a `spec.md`. Las decisiones pendientes se documentan como alternativas o preguntas abiertas y no constituyen compromisos de implementación.

### Decisiones APROBADAS

#### Catálogo cerrado de valores en vez de intervalo libre o cron

La periodicidad admite únicamente 15 min, 30 min, 1 h, 6 h, 12 h o 24 h. Se descartó un intervalo numérico libre (exige validar rangos y evita periodicidades absurdas o excesivamente agresivas para las fuentes RSS) y una expresión cron completa (sobredimensionada frente a la necesidad real y más difícil de validar y comunicar al administrador).

#### Periodicidad global única

Un solo valor rige la captura automática de todas las fuentes RSS registradas. Se descartó una periodicidad por fuente para mantener el contrato con HU-01 simple (un valor, no un mapa de valores) y porque la redacción original de HU-01 ya asume un único valor global.

#### Sin valor por defecto

El sistema no asume ningún valor de periodicidad antes de la primera configuración administrativa; el estado inicial es explícitamente "sin configurar". Se prefirió evitar un valor "mágico" implícito que el administrador no eligió.

#### Recálculo inmediato desde el momento del cambio

Al configurar o cambiar la periodicidad, el siguiente instante de ejecución se recalcula usando como referencia el momento en que se guarda el nuevo valor, no la última ejecución realizada. Esto evita que un cambio hacia un intervalo más corto que el tiempo transcurrido desde la última ejecución produzca un instante ya pasado.

#### Exposición mediante límite abstracto

El valor vigente (incluido "sin configurar") se expone a HU-01 mediante un límite abstracto, siguiendo el mismo patrón ya usado entre HU-01 y HU-15 para el conjunto de fuentes registradas. Este cambio no define el contrato interno definitivo de HU-01 ni su mecanismo de scheduling.

### Decisiones PENDIENTES

#### Persistencia concreta de la configuración

No se ha seleccionado la tecnología de almacenamiento para el valor de periodicidad vigente. La elección permanece abierta y no condiciona el comportamiento definido en `spec.md`.

#### Interfaz de entrada concreta

No se ha decidido si el administrador configurará la periodicidad mediante una API, una UI web u otro mecanismo. Queda fuera de este cambio.

#### Interacción con una ejecución de HU-01 en curso

Este cambio garantiza que el siguiente instante se recalcula de inmediato, pero no decide si ese recálculo debe interrumpir una ejecución de captura ya en curso en HU-01. Esa decisión depende de la política de ejecuciones solapadas que HU-01 dejó pendiente en su propio diseño.

#### Auditoría de cambios de periodicidad

No se ha aprobado registrar quién ni cuándo cambió la periodicidad. Podría evaluarse en un incremento posterior si surge una necesidad de trazabilidad administrativa.

## Risks / Trade-offs

- **[El catálogo cerrado limita la flexibilidad del administrador]** → Es una restricción deliberada para evitar periodicidades arbitrariamente agresivas frente a las fuentes RSS; puede ampliarse más adelante si se demuestra la necesidad.
- **[Sin valor por defecto, HU-01 podría implementarse sin contemplar el estado "sin configurar"]** → Se registra explícitamente en `proposal.md` como una actualización aparte y pendiente sobre el change `captura-automatica-rss`, para no dejarlo como una brecha silenciosa.
- **[El recálculo inmediato puede coincidir con una ejecución de HU-01 en curso]** → No se resuelve en este cambio; queda ligado a la política de solapamientos pendiente en el diseño de HU-01.
- **[El contrato interno definitivo con HU-01 todavía no está definido en ambos sentidos]** → Mantener el límite abstracto y evitar decidir aquí reglas que pertenecen a HU-01.

## Migration Plan

No se requiere migración de datos; es una capacidad nueva. La estrategia concreta de persistencia y activación se definirá cuando se seleccione la tecnología correspondiente, sin alterar el comportamiento funcional definido en `spec.md`.

## Open Questions

- ¿Qué tecnología concreta de persistencia se usará para guardar la periodicidad configurada?
- ¿Qué interfaz de entrada concreta (API/UI/CLI) usará el administrador para configurarla?
- ¿Debe el recálculo inmediato interrumpir una ejecución de HU-01 en curso, o solo afectar al siguiente instante futuro?
- ¿Se incorporará auditoría de cambios de periodicidad (quién y cuándo) en un incremento posterior?
