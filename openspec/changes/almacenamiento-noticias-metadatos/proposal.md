## Why

La captura automática RSS (HU-01, `captura-automatica-rss`) ya interpreta feeds y entrega ítems mediante un límite abstracto de salida (`CaptureOutputPort`), pero ese límite no tiene todavía ninguna implementación: los ítems capturados se descartan y no existe manera de consultarlos. HU-04 cierra ese vacío: persiste cada noticia capturada junto con sus metadatos RSS y la expone mediante la API REST para que pueda consultarse.

## What Changes

- Añadir el módulo `news` (capa API + servicios + repositorio) que persiste noticias capturadas con sus metadatos RSS: título, enlace, fecha de publicación, fuente de origen, GUID y descripción.
- Implementar el adaptador que conecta `CaptureOutputPort` (ya definido por HU-01) con la persistencia de `news`, sin modificar el contrato ni el comportamiento de la captura.
- Exponer `GET /api/v1/news` para consultar las noticias almacenadas, devolviendo `200` con lista vacía (`[]`) cuando no existan noticias.
- Introducir la primera capa de persistencia del proyecto: PostgreSQL + Prisma ORM + Prisma Migrate (baseline confirmado en `docs/architecture.md` §4), con su esquema y migraciones para la entidad de noticia.
- Arrancar la primera aplicación NestJS ejecutable (`main.ts`, módulo raíz) con prefijo `/api/v1` y documentación OpenAPI/Swagger, ya que hoy el repositorio solo contiene el módulo `capture` sin aplicación arrancable.
- Añadir la infraestructura mínima de Docker Compose (servicio PostgreSQL) y extender el workflow de CI para poder ejecutar pruebas de integración contra una base de datos real, dado que ninguna existe todavía.
- Manejo de errores controlado en el límite de la API y en el repositorio (fallos de persistencia, ítems inválidos) sin filtrar detalles internos ni interrumpir la captura de otras fuentes.

**Fuera de alcance** (no se implementa en este cambio):
- CRUD administrativo de noticias (alta/edición/borrado manual).
- Filtros, paginación, ordenación o búsqueda en `GET /api/v1/news` más allá del listado simple.
- Caducidad o purgado de noticias (pertenece a HU futura de `purge`).
- Clasificación, sentimiento o agregaciones sobre las noticias almacenadas.
- Nombre legible de la fuente: hoy `RssSource` (HU-15, pendiente) solo expone `id` y `url`; la metadata "fuente" se persiste como referencia (`sourceId`), no como nombre de fuente.

## Capabilities

### New Capabilities
- `almacenamiento-noticias-metadatos`: persistencia de noticias capturadas con sus metadatos RSS y su disponibilidad de consulta mediante `GET /api/v1/news`.

### Modified Capabilities
_Ninguna._ La captura automática (`captura-automatica-rss`) no cambia su comportamiento observable: este cambio solo implementa el lado de salida (`CaptureOutputPort`) que su spec ya trata como límite abstracto perteneciente a HU-04.

## Impact

- **Nuevo:** `backend/src/news/**` (controller, service, repository, DTOs, adaptador de `CaptureOutputPort`).
- **Nuevo:** `backend/prisma/schema.prisma` y migraciones Prisma para la entidad de noticia.
- **Nuevo:** `backend/src/main.ts` y módulo raíz de la aplicación (prefijo `/api/v1`, `ValidationPipe`, Swagger) — primera vez que la aplicación es arrancable.
- **Nuevo:** `docker-compose.yml` (servicio PostgreSQL) y `.env.example` (sin secretos, solo variables de conexión).
- **Modificado:** `backend/src/capture/capture.module.ts` u orquestación de módulos para proveer `CAPTURE_OUTPUT_PORT` con la nueva implementación (sin tocar `CaptureOrchestratorService` ni el contrato del puerto).
- **Modificado:** `.github/workflows/ci.yml` para instalar dependencias, ejecutar pruebas (unitarias + integración) contra un servicio PostgreSQL y comprobar cobertura.
- **Modificado:** `backend/package.json` — nuevas dependencias: `@nestjs/platform-express`, `@nestjs/swagger`, `@nestjs/config`, `prisma`, `@prisma/client`, y `class-validator`/`class-transformer` (requeridas en tiempo de ejecución por `ValidationPipe`).
