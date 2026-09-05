## Context

Ver `proposal.md` para la motivación y `specs/almacenamiento-noticias-metadatos/spec.md` para el comportamiento observable. La arquitectura, los ADR, `openspec/config.yaml` y las instrucciones permanentes ya están sincronizados sobre Node.js/TypeScript/NestJS y PostgreSQL/Prisma como stack del backend.

El repositorio ya contiene una aplicación NestJS arrancable, `NewsModule`, el adaptador de `CaptureOutputPort`, PostgreSQL/Prisma, una migración inicial, `GET /api/v1/news`, Swagger, Docker Compose, pruebas y CI. `CaptureModule` importa internamente `NewsModule`, pero aún no se importa en `AppModule` porque no existen implementaciones reales para los límites de HU-15 y HU-18; hacerlo hoy impediría resolver las dependencias al arrancar.

La implementación actual no cumple la identidad aprobada en esta reconciliación: `NewsService` entrega los ítems sin resolver su identidad, `PrismaNewsRepository` usa `guid ?? link ?? null` sin normalizar y crea una fila cuando ambos valores están ausentes. El esquema y la migración inicial todavía declaran `dedupeKey` nullable. Una prueba de integración afirma expresamente ese comportamiento anterior. Además, el E2E de la API inserta una fila directamente con Prisma y no demuestra el flujo captura → persistencia → consulta.

## Goals / Non-Goals

**Goals:**

- Persistir cada ítem identificable con los metadatos RSS disponibles, sin duplicarlo dentro de su fuente.
- Resolver y normalizar la identidad en servicio/dominio antes de invocar el repositorio.
- Construir una clave técnica tipada `guid:<valor-normalizado>` o `link:<valor-normalizado>` que evite colisiones entre tipos de identidad.
- Mantener una defensa adicional en el repositorio para que un ítem sin identidad nunca se persista.
- Reforzar en PostgreSQL que `dedupeKey` sea obligatorio y único junto con `sourceId`.
- Exponer `GET /api/v1/news` mediante las capas API → servicio → repositorio.
- Aislar los fallos de persistencia por ítem y tratar el descarte sin identidad como flujo normal.
- Demostrar por separado la API existente y, cuando la composición esté disponible, el flujo E2E completo desde captura.

**Non-Goals:**

- CRUD administrativo de noticias, filtros, paginación, búsqueda o purgado.
- Canonicalización de URLs más allá de eliminar espacios exteriores, cambios de mayúsculas/minúsculas u otras transformaciones no aprobadas.
- Enriquecer la fuente con un nombre no provisto por HU-15.
- Cambiar el contrato funcional de captura de HU-01.
- Implementar proveedores de HU-15/HU-18 o sus reglas administrativas.

## Decisions

### Módulo `news` con capas API → servicio/dominio → repositorio (APROBADA)

- `NewsController` expone `GET /api/v1/news`, delega la consulta y mapea la respuesta; no accede directamente a datos.
- `NewsService`, o un colaborador puro de dominio invocado por él, normaliza y resuelve la identidad antes de persistir. El servicio depende de `NewsRepositoryPort`, no de Prisma.
- `NewsRepositoryPort` recibe únicamente ítems identificados mediante un contrato que exige una clave técnica tipada y no vacía.
- `PrismaNewsRepository` es el único punto que conoce Prisma y conserva una defensa en tiempo de ejecución frente a una identidad ausente o vacía.
- `NewsCaptureOutputAdapter` traduce los ítems de `CaptureOutputPort` y delega el lote en `NewsService`. El aislamiento por ítem pertenece al servicio; el adaptador no lo duplica.

### Resolución de identidad antes del repositorio (APROBADA)

Para cada ítem, la capa de servicio/dominio normaliza GUID y enlace exclusivamente mediante `trim` de espacios exteriores. Un valor nulo o vacío después de `trim` se representa como ausente. No se cambia la capitalización ni se aplica canonicalización adicional al enlace.

La resolución sigue este orden:

1. Si existe un GUID normalizado no vacío, su valor es la identidad primaria y la clave técnica será `guid:<valor-normalizado>`.
2. Si el GUID está ausente y existe un enlace normalizado no vacío, el enlace es la identidad fallback y la clave técnica será `link:<valor-normalizado>`.
3. Si ambos están ausentes, el servicio descarta el ítem sin invocar el repositorio, sin tratarlo como fallo de persistencia y continúa con el siguiente.

Por tanto, un GUID con valor `abc` produce una clave distinta de un enlace con valor `abc`. Un GUID válido basta para identificar la noticia aunque no haya enlace ni título. El servicio entrega al repositorio un tipo identificado con `sourceId`, `dedupeKey` tipada y no vacía, y los metadatos disponibles.

### Unicidad por fuente e identidad (APROBADA)

La identidad se restringe al origen estable recibido desde HU-15. Una misma combinación de `sourceId` y clave técnica tipada produce una sola noticia; el mismo GUID o enlace fallback en fuentes diferentes puede producir registros independientes. Dentro de una fuente, `guid:abc` y `link:abc` también son identidades diferentes. La URL mutable de la fuente no sustituye a `sourceId`.

En Prisma, la clave técnica se almacena en un `dedupeKey` obligatorio. PostgreSQL reforzará `NOT NULL` y la restricción única compuesta `(sourceId, dedupeKey)`. El repositorio realiza un upsert sin crear una segunda fila cuando esa combinación ya existe.

### Defensa adicional del repositorio (APROBADA)

Aunque el contrato tipado del repositorio exija una identidad válida, su adaptador comprobará en tiempo de ejecución que `dedupeKey` use el prefijo `guid:` o `link:` y que su valor después del prefijo no quede vacío tras `trim`. Si una llamada elude la capa de servicio y aporta una identidad ausente o inválida, el repositorio no escribirá nada y devolverá el control sin elevarlo como error de persistencia. Esta defensa no reemplaza la resolución en servicio/dominio; la restricción `NOT NULL` añade una tercera protección en persistencia.

### Manejo de errores y continuidad (APROBADA)

`NewsService.saveCapturedItems` recorre los ítems y, para cada uno, primero resuelve la identidad. Un descarte por ausencia de identidad es una salida normal. Si un ítem identificado falla en el repositorio, el servicio contiene ese fallo y continúa con los siguientes.

En consulta, `NewsService` transforma un fallo interno en una excepción controlada y `NewsController` no expone detalles de Prisma, SQL ni stack en la respuesta.

### Wiring de captura y aplicación (APROBADA)

`NewsModule` exporta el binding de `CAPTURE_OUTPUT_PORT` y `CaptureModule` ya importa `NewsModule`. Esa composición interna se conserva sin modificar `CaptureOrchestratorService`.

`AppModule` seguirá importando solo `NewsModule` mientras no existan proveedores reales compatibles para HU-15 y HU-18. Cuando estén disponibles, deberá importar `CaptureModule` y verificarse la composición completa sin dobles provisionales.

### `dedupeKey` obligatorio en persistencia (APROBADA)

El estado final de Sprint 1 exige que `dedupeKey` sea obligatorio. La regla queda reforzada en tres niveles: el servicio descarta los ítems sin identidad, el repositorio rechaza defensivamente una clave técnica ausente o inválida y PostgreSQL aplica `NOT NULL` además de `UNIQUE(sourceId, dedupeKey)`.

El esquema actual todavía declara `dedupeKey String?`, por lo que la implementación deberá cambiarlo a obligatorio y crear una migración nueva. No se modificará retroactivamente la migración inicial. En esta revisión documental no se modifica `schema.prisma` ni se crea o ejecuta ninguna migración.

No existe producción ni un histórico productivo que conservar. La migración se verificará sobre el entorno PostgreSQL reproducible; si un entorno local se migra en lugar de recrearse, deberá tratar explícitamente las filas antiguas sin identidad y convertir a claves tipadas cualquier fila que se conserve antes de aplicar `NOT NULL`.

## Test Strategy

- Pruebas unitarias de servicio/dominio para `trim` sin otras transformaciones, prioridad del GUID, fallback por enlace, claves `guid:`/`link:`, separación entre ambos tipos para un mismo valor, GUID válido sin enlace/título, descarte sin identidad y continuación del lote.
- Pruebas de integración del repositorio para clave tipada no nula, unicidad dentro de una fuente, separación entre tipos, independencia entre fuentes, defensa frente a una identidad inválida y cumplimiento de `NOT NULL` en PostgreSQL.
- Aplicación y verificación de la nueva migración sobre el entorno PostgreSQL reproducible sin modificar la migración inicial.
- Pruebas unitarias del adaptador únicamente para la traducción y delegación al servicio.
- Pruebas de API para lista vacía, metadatos y error controlado.
- E2E de API existente con datos preparados y un E2E independiente del flujo real captura → persistencia → `GET /api/v1/news`, sin inserción directa para preparar la noticia demostrada.

## Risks / Trade-offs

- **[El esquema permanece nullable hasta implementar la nueva migración]** → No considerar HU-04 completa hasta aplicar y probar `NOT NULL` junto con las defensas de servicio y repositorio.
- **[Construir la clave tipada en más de un lugar puede producir inconsistencias]** → Centralizar su construcción en servicio/dominio, expresarla en el contrato tipado y cubrir ambos prefijos con pruebas.
- **[Normalizar solo espacios no une URLs semánticamente equivalentes]** → Mantener la regla mínima aprobada y no introducir canonicalización no especificada.
- **[El código y una prueba todavía aceptan ítems sin identidad]** → Reabrir implementación y pruebas antes de considerar HU-04 completa.
- **[El E2E actual solo demuestra la consulta sobre una inserción directa]** → Conservarlo como prueba de API y añadir un E2E del flujo completo.
- **[`CaptureModule` no forma parte todavía de la aplicación raíz]** → Integrarlo únicamente cuando HU-15 y HU-18 aporten proveedores resolubles y probar la composición real.

## Migration Plan

No se crea ni se ejecuta una migración en esta revisión documental. Durante la implementación se cambiará `dedupeKey` de `String?` a `String`, se generará una migración nueva que aplique `NOT NULL` y se conservará `UNIQUE(sourceId, dedupeKey)`. La migración inicial ya existente no se modificará.

La migración nueva se aplicará y verificará desde cero sobre el PostgreSQL reproducible. Si se prueba una actualización sobre una base local existente, antes de `NOT NULL` deberán resolverse las filas con clave nula y convertir a `guid:` o `link:` las identidades conservadas. No hay datos productivos que condicionen este plan.

## Open Questions

Ninguna pregunta pendiente sobre la identidad técnica o la obligatoriedad de `dedupeKey`.
