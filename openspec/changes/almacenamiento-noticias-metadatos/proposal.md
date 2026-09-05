## Why

La captura automática RSS (HU-01, `captura-automatica-rss`) entrega ítems interpretados mediante `CaptureOutputPort`, y HU-04 es responsable de almacenar las noticias identificables con sus metadatos y exponerlas para consulta. El backend ya contiene `NewsModule`, el adaptador de salida, PostgreSQL/Prisma y `GET /api/v1/news`; esta reconciliación corrige la identidad observable porque la implementación actual todavía almacena ítems sin GUID ni enlace y no demuestra el flujo completo integrado.

## What Changes

- Mantener el módulo `news` organizado en las capas API, servicios y repositorio para persistir noticias capturadas con los metadatos RSS disponibles: título, enlace, fecha de publicación, fuente de origen, GUID y descripción.
- Resolver la identidad antes de persistir: normalizar GUID y enlace, usar primero un GUID no vacío, usar el enlace no vacío como fallback y descartar sin error los ítems que no tengan ninguno.
- Evitar una segunda noticia cuando una misma fuente entrega la misma identidad y permitir registros independientes cuando fuentes diferentes entregan esa identidad.
- Mantener el adaptador que conecta `CaptureOutputPort` con la persistencia de `news`, sin introducir en HU-01 reglas de almacenamiento o identidad.
- Exponer `GET /api/v1/news` para consultar las noticias almacenadas, devolviendo `200` con lista vacía (`[]`) cuando no existan noticias.
- Mantener PostgreSQL + Prisma ORM + Prisma Migrate como capa de persistencia conforme a la arquitectura vigente.
- Mantener la aplicación NestJS ejecutable, su prefijo `/api/v1` y la documentación OpenAPI/Swagger. `AppModule` expone hoy `NewsModule`; la integración raíz de `CaptureModule` queda pendiente de los proveedores reales de HU-15 y HU-18.
- Mantener el entorno PostgreSQL reproducible y las pruebas de integración, y añadir la prueba E2E real captura → persistencia → consulta cuando la composición completa esté disponible.
- Tratar en el servicio el descarte sin identidad como flujo normal, aislar por ítem los fallos reales de persistencia, mantener una defensa adicional en el repositorio y responder de forma controlada en la API sin exponer detalles internos.

**Fuera de alcance** (no se implementa en este cambio):
- CRUD administrativo de noticias (alta/edición/borrado manual).
- Filtros, paginación, ordenación o búsqueda en `GET /api/v1/news` más allá del listado simple.
- Caducidad o purgado de noticias (pertenece a HU futura de `purge`).
- Clasificación, sentimiento o agregaciones sobre las noticias almacenadas.
- Nombre legible de la fuente: el contrato actual de HU-15 no lo proporciona; la metadata "fuente" se mantiene como referencia estable (`sourceId`), no como URL ni como nombre.

## Capabilities

### New Capabilities
- `almacenamiento-noticias-metadatos`: persistencia de noticias capturadas con sus metadatos RSS y su disponibilidad de consulta mediante `GET /api/v1/news`.

### Modified Capabilities
_Ninguna._ La captura automática (`captura-automatica-rss`) no cambia su comportamiento observable: este cambio solo implementa el lado de salida (`CaptureOutputPort`) que su spec ya trata como límite abstracto perteneciente a HU-04.

## Impact

- `backend/src/news/**`: resolución de identidad en servicio/dominio, contrato de repositorio para ítems identificados y defensa adicional del adaptador Prisma.
- `backend/prisma/schema.prisma`: el modelo e índice compuesto ya existen; el objetivo aprobado hace `dedupeKey` obligatorio y requerirá una migración nueva durante la implementación, sin modificar el esquema ni crear esa migración en esta revisión documental.
- `backend/src/capture/capture.module.ts`: el binding de `CAPTURE_OUTPUT_PORT` hacia `NewsModule` ya existe y se conserva.
- `backend/src/app.module.ts`: la composición completa con `CaptureModule` permanece pendiente hasta que HU-15 y HU-18 aporten proveedores compatibles.
- `backend/test/news/**` y pruebas E2E: deben ajustarse a la identidad aprobada y demostrar por separado la API existente y el flujo completo captura → persistencia → consulta.
