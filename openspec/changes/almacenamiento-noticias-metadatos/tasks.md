## 1. Aplicación arrancable

- [x] 1.1 Añadir las dependencias de NestJS, Swagger, configuración y Prisma necesarias para la aplicación y la persistencia de HU-04.
- [x] 1.2 Crear `backend/src/app.module.ts` importando `NewsModule`; este bootstrap demuestra la API de noticias, no la composición completa de captura.
- [x] 1.3 Crear `backend/src/main.ts` con prefijo global `/api/v1`, `ValidationPipe` y documentación OpenAPI/Swagger de `GET /api/v1/news`.

## 2. Persistencia (Prisma + PostgreSQL)

- [x] 2.1 Crear el modelo inicial `News` con metadatos, `dedupeKey` nullable y restricción única sobre `(sourceId, dedupeKey)`; este estado inicial no representa el esquema final aprobado.
- [x] 2.2 Crear y verificar la migración inicial de la tabla `News`.
- [x] 2.3 Crear `docker-compose.yml` con PostgreSQL para un entorno local reproducible.
- [x] 2.4 Crear `.env.example` con `DATABASE_URL` de ejemplo y sin secretos reales.
- [ ] 2.5 Cambiar el modelo final para que `dedupeKey` sea obligatorio, manteniendo la restricción única `(sourceId, dedupeKey)`.
- [ ] 2.6 Crear y verificar una migración nueva que aplique `NOT NULL`, trate explícitamente cualquier dato local previo incompatible y conserve la restricción única, sin modificar la migración inicial.

## 3. Capa de repositorio (`news`)

- [ ] 3.1 Cambiar `NewsRepositoryPort` para recibir un ítem identificado con `sourceId`, `dedupeKey` tipada (`guid:` o `link:`), no vacía y los metadatos disponibles, manteniéndolo independiente de Prisma.
- [ ] 3.2 Adaptar `PrismaNewsRepository` para persistir la clave tipada no nula, aplicar el upsert por `(sourceId, dedupeKey)` y no escribir cuando el prefijo sea inválido o su valor esté vacío como defensa adicional.

## 4. Capa de servicio/dominio (`news`)

- [x] 4.1 Mantener `NewsService.listNews()` delegado al repositorio, con lista vacía y traducción controlada de errores de consulta.
- [ ] 4.2 Resolver en servicio/dominio la identidad de cada ítem: aplicar únicamente `trim`, priorizar GUID y construir `guid:<valor-normalizado>`, usar enlace como fallback y construir `link:<valor-normalizado>`, no cambiar mayúsculas/minúsculas ni canonicalizar URLs, descartar sin error cuando ambos falten y continuar tras fallos reales de persistencia.

## 5. Wiring de captura → persistencia

- [x] 5.1 Mantener `NewsCaptureOutputAdapter` como implementación de `CaptureOutputPort`, traduciendo los ítems y delegando el lote en `NewsService.saveCapturedItems`.
- [x] 5.2 Exportar desde `NewsModule` el binding `{ provide: CAPTURE_OUTPUT_PORT, useClass: NewsCaptureOutputAdapter }`.
- [x] 5.3 Mantener la importación de `NewsModule` en `CaptureModule` para resolver internamente `CAPTURE_OUTPUT_PORT`, sin modificar `CaptureOrchestratorService` ni el contrato del puerto.
- [ ] 5.4 Importar `CaptureModule` en `AppModule` cuando existan proveedores reales compatibles para HU-15 y HU-18, y verificar la resolución completa de dependencias sin dobles provisionales.

## 6. Capa API (`news`)

- [x] 6.1 Definir el DTO de respuesta con la fuente y los metadatos RSS disponibles.
- [x] 6.2 Implementar `GET /api/v1/news` delegando en `NewsService.listNews()` y devolviendo `200` con la lista, vacía cuando corresponda.
- [x] 6.3 Traducir un fallo interno de consulta a un error HTTP controlado sin exponer detalles internos.

## 7. Integración continua

- [x] 7.1 Ejecutar en CI las operaciones necesarias de Prisma contra un servicio PostgreSQL antes de las pruebas.
- [x] 7.2 Ejecutar cobertura en CI y aplicar el umbral global configurado del 80 %.

## 8. Pruebas

- [ ] 8.1 Actualizar las pruebas unitarias de servicio/dominio para cubrir `trim` sin otras transformaciones, prioridad del GUID, fallback por enlace, claves `guid:`/`link:`, diferencia entre GUID `abc` y enlace `abc`, GUID sin enlace/título, descarte sin identidad, continuidad del lote y aislamiento de fallos reales de persistencia.
- [x] 8.2 Mantener las pruebas unitarias de `NewsCaptureOutputAdapter` como evidencia de traducción y delegación al servicio, sin atribuirle el aislamiento que corresponde a `NewsService`.
- [x] 8.3 Mantener las pruebas unitarias de `NewsController` para lista vacía, lista con metadatos y error controlado.
- [ ] 8.4 Reconciliar las pruebas de integración de `PrismaNewsRepository`: eliminar la expectativa que almacena ítems sin GUID/enlace y cubrir clave tipada no nula, `NOT NULL`, unicidad por fuente, separación `guid:abc`/`link:abc`, independencia entre fuentes y defensa ante una clave inválida.
- [x] 8.5 Mantener el E2E actual de `GET /api/v1/news` como prueba exclusiva de consulta con datos preparados mediante inserción directa a Prisma; no considerarlo evidencia del flujo de captura.
- [ ] 8.6 Ejecutar build, suite completa y cobertura después de implementar la reparación, y verificar nuevamente el umbral global del 80 %.
- [ ] 8.7 Añadir un E2E real captura → `CaptureOutputPort` → servicio → repositorio → PostgreSQL → `GET /api/v1/news`, sin insertar directamente la noticia demostrada y cubriendo también descarte sin identidad seguido de un ítem válido.

## 9. Conformidad arquitectónica

- [ ] 9.1 Verificar después de la reparación que la API no accede a datos, que la identidad y su clave tipada se resuelven en servicio/dominio y que solo el repositorio depende de Prisma.
- [x] 9.2 Confirmar que `CaptureOrchestratorService` y el contrato de `CaptureOutputPort` no cambiaron por las reglas internas de HU-04.
- [ ] 9.3 Verificar el incremento reparado contra `docs/architecture.md`, ADR-002, ADR-003 y el contexto OpenSpec vigente, incluidos esquema, migración, composición, build y pruebas finales.
