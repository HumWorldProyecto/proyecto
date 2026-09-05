## Why

HumWorld necesita mantener actualizada su información mediante capturas automáticas desde el conjunto de fuentes que HU-15 proporciona como elegible para captura. HU-01 define la obtención e interpretación de esos feeds, cuando HU-18 proporciona una periodicidad, hasta producir cero o más ítems RSS interpretados para el flujo posterior, sin incluir su persistencia.

## What Changes

- Incorporar la ejecución automática de captura sobre el conjunto de fuentes que HU-15 proporciona para captura.
- Leer al arrancar el estado vigente de HU-18 y configurar el job automático únicamente cuando esté `configured`; si está `unconfigured`, no registrar ningún job.
- Mantener una suscripción a los cambios posteriores de HU-18 para reemplazar o retirar únicamente el job futuro, sin administrar el valor de periodicidad ni interrumpir una captura en curso.
- Considerar correctamente capturada una fuente del conjunto proporcionado cuando responde con un formato RSS admitido y el sistema puede interpretar su feed para producir cero o más ítems RSS.
- Entregar los ítems RSS interpretados a un límite abstracto de salida para el flujo posterior, sin afirmar que hayan sido almacenados.
- Limitar la captura a RSS, sin admitir Atom ni utilizar técnicas de web scraping.
- Aislar los fallos y contenidos inválidos por fuente, de modo que no impidan intentar las demás fuentes de la instantánea de ejecución.
- Evitar solicitudes de captura y la producción de ítems cuando el conjunto proporcionado por HU-15 está vacío.
- Excluir del proceso automático cualquier fuente que no forme parte del conjunto proporcionado por HU-15 para esa ejecución.
- Mantener fuera de este cambio la gestión y validación administrativa de fuentes, la gestión de periodicidad y la definición de la persistencia, los duplicados, los datos mínimos y la actualización de noticias existentes.

## Capabilities

### New Capabilities

- `captura-automatica-rss`: ejecución automática, cuando existe periodicidad configurada, de intentos de captura sobre las fuentes proporcionadas por HU-15, interpretación exclusiva de RSS y producción de ítems para un límite abstracto de salida, con aislamiento de fallos por fuente y comportamiento definido cuando no existen fuentes elegibles.

### Modified Capabilities

Ninguna.

## Impact

- Reconciliación del módulo de captura existente con la arquitectura NestJS documentada y con los contratos OpenSpec ya definidos por HU-15 y HU-18.
- Consumo, sin redefinirlo, del conjunto elegible que expone HU-15 como instantánea para cada ejecución.
- Consumo, sin administrar el valor, de `PeriodicityProviderPort` para el estado inicial y de `PeriodicityChangeNotifierPort` para los cambios posteriores definidos por HU-18.
- Sustitución de los adaptadores provisionales de HTTP, parsing y scheduling por las decisiones técnicas ratificadas en el diseño: `@nestjs/axios`, `rss-parser` y `@nestjs/schedule`, con timeout central configurable y guard RSS-only.
- Límite abstracto de salida para entregar ítems RSS interpretados a HU-04, cuyo contrato de persistencia e identidad se define en su propio cambio.
- Integración pendiente de `CaptureModule` en la aplicación cuando estén disponibles las implementaciones de los límites de HU-15 y HU-18.
- Pruebas de comportamiento para arranque configurado/sin configurar, notificaciones y lifecycle de suscripción, selección de fuentes, aislamiento de fallos, exclusión de formatos no RSS y conjunto proporcionado vacío.
