## Why

HumWorld necesita que un administrador pueda controlar con qué frecuencia se actualizan automáticamente las fuentes RSS. HU-01 (captura automática) ya asume la existencia de "una periodicidad configurada" para calcular su siguiente instante de ejecución, pero no define de dónde sale ese valor ni cómo se administra; su propio diseño deja explícitamente la gestión de periodicidad como responsabilidad de HU-18.

## What Changes

- Incorporar un caso de uso que permita al administrador configurar la periodicidad de la captura automática, eligiendo entre un catálogo cerrado de valores admitidos (15 min, 30 min, 1 h, 6 h, 12 h, 24 h).
- Rechazar cualquier valor de periodicidad que no pertenezca a ese catálogo cerrado.
- Incorporar un caso de uso de consulta que permita obtener el valor de periodicidad actualmente configurado.
- Definir que la periodicidad es un único valor global, aplicable a todas las fuentes RSS por igual (no existe periodicidad por fuente).
- Definir el estado inicial: mientras ningún administrador haya configurado un valor, la periodicidad permanece sin configurar y no se dispara ninguna captura automática por ausencia de periodicidad.
- Definir que, al configurar o cambiar la periodicidad, el sistema recalcula de inmediato el siguiente instante de ejecución, tomando como referencia el momento en que se guarda el nuevo valor (no la última ejecución realizada).
- Exponer el valor de periodicidad vigente (incluido el estado "sin configurar") mediante un límite abstracto de salida para su consumo por HU-01, sin definir en este cambio el mecanismo concreto de scheduling ni la interfaz de entrada (API, UI u otra).
- Mantener fuera de este cambio la autorización y el control de acceso del administrador, la interfaz concreta de entrada, la tecnología de scheduling de HU-01, la periodicidad por fuente, y la reacción concreta de HU-01 ante el estado "sin periodicidad configurada" (se gestiona como una actualización aparte sobre el propio change pendiente de `captura-automatica-rss`, fuera del alcance de este delta).

## Capabilities

### New Capabilities

- `config-periodicidad`: configuración y consulta administrativa de la periodicidad global de captura automática, con validación contra un catálogo cerrado de valores, estado inicial "sin configurar", recálculo inmediato del siguiente instante ante un cambio, y exposición del valor vigente mediante un límite abstracto para HU-01.

### Modified Capabilities

Ninguna. `captura-automatica-rss` (HU-01) todavía no está archivada en `openspec/specs/`, por lo que no existe un baseline contra el cual aplicar un delta `MODIFIED` formal. El escenario complementario ("sin periodicidad configurada") se añadirá directamente al change pendiente `captura-automatica-rss` como una actualización aparte, no como parte de este cambio.

## Impact

- Casos de uso administrativos de configuración y consulta de la periodicidad de captura, disparados por un administrador de HumWorld.
- Contrato del límite abstracto de "periodicidad configurada" que consume HU-01 para programar su siguiente ejecución; su interfaz de entrada concreta (API/UI) no se define en este cambio.
- Modelo de datos de la configuración de periodicidad (valor del catálogo, o ausencia de valor); la tecnología concreta de persistencia se aborda en `design.md`.
- Pruebas de comportamiento para: aceptación de cada valor del catálogo, rechazo de valores fuera del catálogo, estado inicial sin configurar, y recálculo inmediato del siguiente instante desde el momento del cambio.
