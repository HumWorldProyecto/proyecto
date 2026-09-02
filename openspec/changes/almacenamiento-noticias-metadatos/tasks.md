## 1. Aplicación arrancable

- [x] 1.1 Añadir dependencias necesarias a `backend/package.json` (`@nestjs/platform-express`, `@nestjs/swagger`, `@nestjs/config`, `prisma`, `@prisma/client`).
- [x] 1.2 Crear `backend/src/app.module.ts` importando `NewsModule` (ver design.md: `CaptureModule` no se importa todavía porque `SOURCE_REGISTRY_PORT`/HU-15 y `PERIODICITY_PROVIDER_PORT`/HU-18 no tienen implementación).
- [x] 1.3 Crear `backend/src/main.ts`: prefijo global `/api/v1`, `ValidationPipe`, y documentación OpenAPI/Swagger reflejando `GET /api/v1/news`.

## 2. Persistencia (Prisma + PostgreSQL)

- [x] 2.1 Crear `backend/prisma/schema.prisma` con el modelo `News` (id, sourceId, title?, link?, guid?, description?, pubDate?, capturedAt, dedupeKey, restricción única sobre `(sourceId, dedupeKey)`).
- [x] 2.2 Generar la migración inicial de Prisma y comprobar que crea la tabla `News`.
- [x] 2.3 Crear `docker-compose.yml` con un servicio `postgres` para entorno local reproducible (puerto host 5433: el 5432 ya está ocupado por un PostgreSQL nativo de Windows en esta máquina).
- [x] 2.4 Crear `.env.example` con `DATABASE_URL` de ejemplo (sin secretos reales).

## 3. Capa de repositorio (`news`)

- [x] 3.1 Definir `NewsRepositoryPort` (abstracción: `findAll()`, `upsertCapturedItem(item)`), independiente de Prisma.
- [x] 3.2 Implementar `PrismaNewsRepository` sobre `NewsRepositoryPort`, calculando `dedupeKey = guid ?? link ?? null` y usando upsert (o inserción ignorando conflicto) por `(sourceId, dedupeKey)`.

## 4. Capa de servicio (`news`)

- [x] 4.1 Implementar `NewsService.listNews()`, delegando en `NewsRepositoryPort` y devolviendo lista vacía cuando no hay noticias.
- [x] 4.2 Implementar `NewsService.saveCapturedItems(items: RssItem[])`, persistiendo cada ítem de forma aislada (un fallo de un ítem no interrumpe los demás).

## 5. Wiring de captura → persistencia

- [x] 5.1 Implementar `NewsCaptureOutputAdapter` (implementa `CaptureOutputPort` de `capture/ports/capture-output.port.ts`) delegando en `NewsService.saveCapturedItems`.
- [x] 5.2 Exportar el binding `{ provide: CAPTURE_OUTPUT_PORT, useClass: NewsCaptureOutputAdapter }` desde `NewsModule`.
- [x] 5.3 Modificar `backend/src/capture/capture.module.ts` para importar `NewsModule` y resolver `CAPTURE_OUTPUT_PORT`, sin tocar `CaptureOrchestratorService` ni el contrato del puerto.

## 6. Capa API (`news`)

- [x] 6.1 Definir el DTO de respuesta de noticia (título, enlace, fecha de publicación, fuente, GUID, descripción) reflejando los metadatos disponibles.
- [x] 6.2 Implementar `NewsController` con `GET /api/v1/news`, delegando en `NewsService.listNews()` y devolviendo `200` con la lista (vacía si no hay noticias).
- [x] 6.3 Asegurar que un fallo interno al consultar noticias responde con un código de error HTTP controlado sin exponer detalles internos.

## 7. Integración continua

- [x] 7.1 Extender `.github/workflows/ci.yml` con un servicio `postgres` (imagen ligera), instalación de dependencias, generación del cliente Prisma y aplicación de migraciones.
- [x] 7.2 Añadir el paso que ejecuta `jest --coverage` (unitarias + integración) en CI y falla el pipeline si no se cumple el umbral de cobertura (umbral 80% aplicado vía `coverageThreshold` en `jest.config.js`).

## 8. Pruebas

- [x] 8.1 Pruebas unitarias de `NewsService` (listado vacío/con datos, deduplicación, aislamiento de fallos al guardar).
- [x] 8.2 Pruebas unitarias de `NewsCaptureOutputAdapter` (delegación correcta, aislamiento de fallos por ítem).
- [x] 8.3 Pruebas unitarias de `NewsController` (200 + lista vacía, 200 + lista con datos, error controlado).
- [x] 8.4 Pruebas de integración de `PrismaNewsRepository` contra PostgreSQL real: persistencia de metadatos y no duplicación de un ítem ya almacenado (incluye el caso borde de ítems sin GUID ni enlace, verificado empíricamente contra PostgreSQL real: cada uno se almacena como fila independiente, tal como documenta design.md).
- [x] 8.5 Prueba de integración end-to-end de `GET /api/v1/news` (sin noticias → 200 `[]`; con noticias almacenadas → 200 con sus metadatos).
- [x] 8.6 Ejecutar la suite completa (`jest --coverage`) y verificar el umbral de cobertura global del 80 % exigido por `docs/architecture.md` (resultado: 99.47% líneas / 96.42% ramas, 44 pruebas).

## 9. Conformidad arquitectónica

- [x] 9.1 Comprobar que la API no accede a datos directamente, que los servicios no dependen de Prisma/SQL fuera del repositorio y que el frontend no se ve afectado (no aplica en este cambio).
- [x] 9.2 Comprobar que `CaptureOrchestratorService` y el contrato de `CaptureOutputPort` no cambiaron.
- [x] 9.3 Confirmar que no se introdujeron tecnologías o dependencias fuera de las aprobadas en `design.md` (con una salvedad documentada: `class-validator`/`class-transformer` como peer-dependencies obligatorias de `ValidationPipe`, y `supertest`/`dotenv` como dependencias de test necesarias para las pruebas de integración/e2e de la sección 8; ninguna introduce tecnología nueva de negocio).
