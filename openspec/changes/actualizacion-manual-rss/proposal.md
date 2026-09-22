## Why

HumWorld necesita permitir que un administrador incorpore sin demora las noticias de una fuente RSS concreta, sin esperar al siguiente ciclo de captura automática. Después de Sprint 1 ya existen la captura segura de HU-01, la persistencia y deduplicación de HU-04, el registro de fuentes activas de HU-15 y la periodicidad de HU-18. HU-02 debe incorporar el disparo manual reutilizando ese flujo real, sin crear una segunda implementación de descarga, parsing o persistencia.

## What Changes

- Exponer `POST /api/v1/sources/:id/capture`, síncrono y sin body, para capturar exclusivamente la fuente identificada por su ID estable.
- Extender el contrato de registro de fuentes para seleccionar por ID y distinguir `missing`, `inactive` y `eligible`, manteniendo intacta la instantánea activa que utiliza HU-01.
- Responder `404 Not Found` para una fuente inexistente y `409 Conflict` para una fuente inactiva, sin realizar solicitudes externas en ninguno de los dos casos.
- Evolucionar la lógica de captura por fuente de HU-01 hacia una unidad reutilizable por los flujos automático y manual, conservando `HttpRssFetcher`, `RssOnlyParser` y `CaptureOutputPort` como únicos puntos de descarga, interpretación y salida hacia HU-04.
- Aplicar un guard en memoria por `sourceId`, compartido por ambos flujos, que impida dos capturas simultáneas de la misma fuente dentro de una instancia, sin encolar una segunda ejecución.
- Comunicar resultados mediante categorías estables y una respuesta exitosa `200 OK` con `sourceId`, `status: "completed"` e `itemsParsed`.
- Definir `itemsParsed` como la cantidad de ítems interpretados del RSS, sin presentarla como cantidad persistida ni introducir `storedCount`.
- Mapear contenido no RSS o inválido y fallos de red/upstream a `502 Bad Gateway`, timeout a `504 Gateway Timeout`, fuente ocupada a `409 Conflict` y fallos inesperados a `500 Internal Server Error`, sin exponer detalles internos.
- Mantener la deduplicación y persistencia existentes de HU-04; un feed válido vacío o cuyos ítems ya existan sigue siendo una actualización exitosa.
- Diferir autenticación y autorización conforme al alcance actual del producto, sin introducir usuarios, roles, guards ni dependencias de seguridad en HU-02.

## Capabilities

### New Capabilities

- `actualizacion-manual-rss`: actualización manual síncrona de una única fuente RSS activa mediante API REST, reutilizando la captura y persistencia existentes, con resultado observable y control de solapamiento por fuente.

### Modified Capabilities

Ninguna. HU-02 consume y amplía contratos internos ya existentes sin cambiar los requisitos funcionales de HU-01, HU-04, HU-15 o HU-18.

## Impact

- `capture`: unidad compartida por fuente, caso de uso manual, guard por `sourceId`, controller, DTO, errores tipados y wiring.
- `sources`: extensión de `SourceRegistryPort` y de su adaptador para seleccionar una fuente por ID y estado sin acoplar captura a Prisma ni a `SourcesService`.
- `news`: reutilización sin cambios de `CaptureOutputPort`, la identidad GUID/link y la deduplicación por fuente.
- API y Swagger: nuevo endpoint bajo `/api/v1/sources/:id/capture` y sus respuestas `200`, `404`, `409`, `502`, `504` y `500`.
- Pruebas unitarias, de integración PostgreSQL y E2E para el flujo manual, además de regresiones de HU-01, scheduler y seguridad SSRF.

Quedan fuera de alcance HU-03, la actualización manual de múltiples fuentes, Channel/Media, frontend, Atom, scraping, retries/backoff, cambios funcionales del scheduler de HU-01/HU-18, sentimiento, clasificación IPTC, migración a NestJS 11, cambios de Prisma, migraciones y dependencias nuevas.
