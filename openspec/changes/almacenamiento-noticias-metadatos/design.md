## Context

Ver `proposal.md` para la motivación. Este diseño parte de dos hechos verificados en el repositorio antes de diseñar:

1. **Contradicción de stack resuelta por decisión humana.** `docs/architecture.md` §4 (baseline confirmado por el Equipo 5) fija Node.js/TypeScript/NestJS y PostgreSQL/Prisma/Prisma Migrate. `.github/copilot-instructions.md`, `openspec/config.yaml` y el contexto inyectado por `openspec instructions` describen en cambio un baseline "provisional" con Python/FastAPI/SQLAlchemy. El código real de `backend/` (NestJS, TypeScript, Jest) ya implementa el módulo `capture` sobre el baseline de `architecture.md`. Se detectó la contradicción antes de proponer y se comunicó para revisión humana; el usuario confirmó explícitamente usar el baseline de `docs/architecture.md` (NestJS/TypeScript/Prisma/PostgreSQL) como fuente de verdad para este cambio, dejando constancia de que `.github/copilot-instructions.md` y `openspec/config.yaml` quedan pendientes de actualizar (fuera de alcance de este cambio).
2. **No existe todavía persistencia ni aplicación arrancable.** Solo existe `backend/src/capture/**` (módulo `capture` de HU-01, con `CAPTURE_OUTPUT_PORT` sin implementación) y sus tests. No hay `main.ts`, módulo raíz, Prisma, Docker Compose ni workflow de CI que ejecute pruebas. Este cambio es, por tanto, el primero en arrancar la aplicación y en introducir persistencia real.

## Goals / Non-Goals

**Goals:**
- Persistir cada ítem capturado como noticia con sus metadatos RSS, sin duplicar noticias ya almacenadas.
- Exponer `GET /api/v1/news` respetando la capa API → servicios → repositorios.
- Implementar `CaptureOutputPort` (ya definido por HU-01) sin alterar su contrato ni la lógica de `CaptureOrchestratorService`.
- Dejar la aplicación arrancable con la infraestructura mínima (Prisma + PostgreSQL + Docker Compose + CI) necesaria para ejecutar y probar lo anterior.

**Non-Goals:**
- CRUD administrativo de noticias, filtros, paginación o búsqueda en el listado.
- Resolver el nombre legible de la fuente (pertenece a HU-15, no implementada todavía).
- Política de reintentos/backoff de captura (pertenece a HU-01, ya cerrada).
- Cualquier decisión de scheduling, purgado o análisis de sentimiento.

## Decisions

### Módulo `news` con capas API → servicio → repositorio (APROBADA)
`backend/src/news/`:
- `news.controller.ts`: expone `GET /api/v1/news`. Valida el contrato HTTP, delega en `NewsService`, mapea el resultado a DTO de respuesta. No consulta datos directamente.
- `news.service.ts`: implementa los casos de uso `listNews()` y `saveCapturedItems(items: RssItem[])`. Depende de `NewsRepositoryPort` (abstracción), no de Prisma.
- `repositories/prisma-news.repository.ts`: implementa `NewsRepositoryPort` usando Prisma Client. Único punto del código con SQL/Prisma.
- `integrations/news-capture-output.adapter.ts`: implementa `CaptureOutputPort` (definido en `capture/ports/capture-output.port.ts`) delegando en `NewsService.saveCapturedItems`. Vive en `news` porque implementa el lado de salida que pertenece a HU-04; no modifica `capture`.

Alternativa descartada: implementar el adaptador dentro de `capture/`. Se descarta porque el propio diseño de HU-01 declara que la persistencia "pertenece a HU-04" y no debe decidirse desde `capture`.

### Wiring del puerto de salida (APROBADA)
`capture.module.ts` importará `NewsModule` y usará el binding de `CAPTURE_OUTPUT_PORT` que `NewsModule` exporta (`{ provide: CAPTURE_OUTPUT_PORT, useClass: NewsCaptureOutputAdapter }`). Es un cambio de composición de módulos (DI), no de lógica de negocio: `CaptureOrchestratorService` y su contrato con `CaptureOutputPort` no se modifican.

### Modelo de datos y deduplicación (APROBADA)
Entidad `News` en `backend/prisma/schema.prisma`:
- `id`: identificador interno (clave primaria).
- `sourceId`: referencia a la fuente RSS de origen (metadato "fuente"; no hay nombre legible disponible hasta HU-15).
- `title`, `link`, `guid`, `description`: opcionales, tal como los entrega `RssItem`.
- `pubDate`: fecha de publicación del feed, opcional.
- `capturedAt`: marca de tiempo interna de cuándo se almacenó (no es un metadato RSS; es necesaria para poder listar de forma determinista y para operar/depurar la persistencia).

Deduplicación: se calcula una clave de identidad `dedupeKey = guid ?? link ?? null` y se aplica una restricción de unicidad sobre `(sourceId, dedupeKey)`. Al recibir un ítem:
- Si `dedupeKey` no es nulo y ya existe una noticia con esa `(sourceId, dedupeKey)`, no se crea una noticia nueva (upsert sin efecto / conflicto ignorado).
- Si `dedupeKey` es nulo (el ítem no trae ni GUID ni enlace), no puede identificarse de forma fiable: se almacena igualmente como noticia nueva. Es un caso borde aceptado y documentado en Risks.

Alternativa descartada: exigir GUID obligatorio para persistir. Se descarta porque `spec.md` de HU-01 no garantiza que todo ítem RSS interpretado tenga GUID, y rechazar ítems válidos sin GUID iría más allá del comportamiento aprobado.

### Manejo de errores (APROBADA)
- En `NewsCaptureOutputAdapter`: cada ítem se persiste de forma aislada (try/catch por ítem); un fallo de persistencia de un ítem no interrumpe el procesamiento de los demás ítems de la misma ejecución, igual que el aislamiento por fuente ya garantizado por HU-01.
- En `NewsController`: los errores no controlados se traducen mediante el manejo de excepciones estándar de NestJS a una respuesta HTTP 5xx con un cuerpo genérico (código y mensaje), sin exponer detalles internos (stack, mensajes de Prisma, etc.).

### Infraestructura mínima para que la aplicación arranque y sea probable (APROBADA)
- `backend/src/main.ts` + módulo raíz: prefijo global `/api/v1`, `ValidationPipe`, y `@nestjs/swagger` documentando `GET /api/v1/news`.
- `docker-compose.yml`: un único servicio `postgres` (imagen oficial, credenciales de desarrollo local no reales) para entorno local reproducible, tal como exige `docs/architecture.md` §15.
- `.env.example`: variable `DATABASE_URL` de ejemplo, sin secretos reales.
- `.github/workflows/ci.yml`: añade un `service: postgres` y pasos para instalar dependencias, generar el cliente Prisma, aplicar migraciones, ejecutar `jest --coverage` (unitarias + integración) y comprobar el umbral de cobertura.

Esta infraestructura se limita a lo estrictamente necesario para ejecutar y probar el módulo `news`; no se añade nada para módulos futuros.

### Alcance del bootstrap de `AppModule` (APROBADA durante implementación)
`CaptureModule` (HU-01) no puede arrancar de forma aislada hoy: `CaptureOrchestratorService` requiere `SOURCE_REGISTRY_PORT` (HU-15, no implementada) y su disparador requiere `PERIODICITY_PROVIDER_PORT` (HU-18, no implementada); ambos puertos quedan deliberadamente sin proveedor según el propio `capture.module.ts`. Importar `CaptureModule` en `AppModule` haría fallar el arranque de la aplicación por un motivo ajeno a este cambio.

Decisión (confirmada por el usuario durante la implementación): `AppModule` importa únicamente `NewsModule` por ahora. El wiring de `CAPTURE_OUTPUT_PORT` (tarea 5.3) se mantiene en `capture.module.ts` y sigue verificado por sus pruebas unitarias aisladas (vía el módulo de testing de Nest), pero `CaptureModule` no se añade a la aplicación arrancable hasta que HU-15 y HU-18 aporten sus puertos. No se crean implementaciones provisionales de esos puertos: sería funcionalidad fuera del alcance aprobado de este cambio.

## Risks / Trade-offs

- **[Ítem sin GUID y sin enlace no puede deduplicarse]** → Se acepta almacenar duplicados en ese caso borde; se documenta como comportamiento conocido y podrá revisarse si se observa en la práctica.
- **[No existe nombre legible de fuente hasta HU-15]** → Se persiste solo `sourceId`; cuando HU-15 aporte un nombre de fuente, un cambio posterior podrá enriquecer la respuesta sin alterar el modelo de deduplicación.
- **[Este cambio arranca por primera vez la aplicación, Docker Compose y la ejecución de pruebas en CI]** → Aumenta el alcance de archivos tocados respecto a un cambio típico de una sola capa; se mitiga manteniendo la infraestructura mínima e indicándolo explícitamente en `proposal.md` (Impact).
- **[Ejecutar pruebas de integración contra PostgreSQL real en CI añade tiempo de pipeline]** → Se usa una imagen ligera (`postgres:16-alpine`) como servicio único del job existente.

## Migration Plan

Se genera una única migración inicial de Prisma que crea la tabla `News` (sin datos previos que migrar, es la primera persistencia del proyecto). Rollback: revertir la migración de Prisma (`prisma migrate resolve` / migración descendente); no hay datos de producción en riesgo porque el proyecto no tiene despliegue previo con esta tabla.

## Open Questions

- ¿Cuándo HU-15 aporte un nombre legible de fuente, se debe enriquecer la respuesta de `GET /api/v1/news` con ese nombre? No cambia el alcance, el enfoque ni las tareas de este cambio; queda para un cambio futuro.
