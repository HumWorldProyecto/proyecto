## Why

HumWorld necesita que un administrador pueda actualizar manualmente varias fuentes RSS en una sola operación e incorporar las noticias disponibles de todas las fuentes seleccionadas. HU-03 debe ampliar el flujo real ya entregado por HU-01, HU-02 y HU-04, sin duplicar la descarga, el parsing, la persistencia ni el control de solapamientos existente.

## What Changes

- Incorporar un caso de uso de captura manual múltiple que reciba una selección explícita de fuentes y no capture fuentes ajenas a ella.
- Reutilizar el caso de uso manual unitario y la unidad compartida de captura por fuente, incluidos `SourceRegistryPort`, `SourceCaptureService`, `CaptureOutputPort` y `SourceCaptureGuard`.
- Exponer `POST /api/v1/sources/capture` con un body JSON `sourceIds`, deduplicar los identificadores preservando su primera aparición y exigir al menos dos identificadores efectivos.
- Procesar secuencialmente las fuentes efectivas, con aislamiento por fuente, de modo que un fallo individual no detenga las capturas posteriores.
- Responder `200 OK` a todo request batch válido mediante una unión discriminada de resultados por fuente; responder `400 Bad Request` sin iniciar capturas cuando el request sea inválido.
- Mantener exclusivamente la captura RSS, sin scraping ni acceso a páginas enlazadas.
- No cambiar el esquema Prisma, las dependencias, el scheduler ni los contratos aprobados de HU-01, HU-02 o HU-04.

## Capabilities

### New Capabilities

- `actualizacion-manual-multiples-rss`: selección y actualización manual de varias fuentes RSS mediante una sola operación, con alcance limitado a las fuentes seleccionadas y resultados observables por fuente.

### Modified Capabilities

Ninguna. HU-03 compone las capacidades existentes sin modificar sus requisitos aprobados.

## Impact

- `capture`: nuevo coordinador de captura múltiple, contrato de entrada/salida, controller y DTO, componiendo el flujo unitario existente.
- `sources`: consulta de las fuentes seleccionadas mediante los contratos existentes, sin acceso directo desde captura a Prisma ni a `SourcesService`.
- `news`: reutilización sin cambios de `CaptureOutputPort` y de la deduplicación/persistencia entregada por HU-04.
- API y Swagger: nueva operación `POST /api/v1/sources/capture` con request y respuesta batch documentados, coexistiendo con el endpoint unitario de HU-02.
- Pruebas: cobertura unitaria, de integración y E2E del flujo múltiple, incluidos aislamiento de resultados y regresión de los flujos automático y manual unitario.

Quedan fuera de alcance frontend, autenticación/autorización, Atom, scraping, retries/backoff, cambios del scheduler, cambios de persistencia, migraciones y dependencias nuevas.
