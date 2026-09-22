## Context

La motivación y el alcance funcional se describen en `proposal.md`; los comportamientos verificables están en `specs/actualizacion-manual-rss/spec.md`. El backend es un monolito modular NestJS sobre Node.js y TypeScript, con PostgreSQL/Prisma y Jest.

Después de Sprint 1 están integrados:

- HU-01: `CaptureModule`, scheduling, `CaptureOrchestratorService`, `HttpRssFetcher`, `RssOnlyParser` y aislamiento de fallos por fuente;
- HU-04: `CaptureOutputPort` implementado por `NewsCaptureOutputAdapter`, identidad GUID/link, deduplicación y persistencia PostgreSQL;
- HU-15: CRUD REST de fuentes, modelo `RssSource` y `SourceRegistryPort` con una instantánea de fuentes activas elegibles;
- HU-18: configuración de periodicidad, provider/notifier y reprogramación dinámica.

La lógica de descarga, parsing y salida de una fuente está actualmente dentro de un método privado de `CaptureOrchestratorService`, que contiene los fallos para permitir continuar con otras fuentes y no devuelve un resultado observable. HU-02 requiere hacer reutilizable esa unidad sin duplicarla, conservar el comportamiento automático y exponer un caso de uso manual con errores tipados.

```text
POST /api/v1/sources/:id/capture
                 |
                 v
       selección SourceRegistryPort
       missing / inactive / eligible
                 |
                 v
        guard en memoria por sourceId
                 |
                 v
       unidad compartida por fuente
        /          |             \
HttpRssFetcher  RssOnlyParser  CaptureOutputPort
                                    |
                                    v
                       HU-04 / PostgreSQL / dedupe

El flujo automático HU-01 usa la misma unidad y conserva su scheduler.
```

## Goals / Non-Goals

**Goals:**

- Exponer el endpoint síncrono `POST /api/v1/sources/:id/capture`, sin body, bajo la API versionada existente.
- Seleccionar por ID exactamente una fuente activa elegible y rechazar fuentes inexistentes o inactivas antes de cualquier acceso externo.
- Reutilizar la misma unidad de descarga, parsing RSS-only y salida hacia HU-04 en los flujos automático y manual.
- Comunicar un resultado mínimo y errores mediante categorías estables, sin depender del texto de `Error.message` ni revelar detalles internos.
- Impedir capturas simultáneas de una misma fuente dentro de una instancia mediante un guard compartido por `sourceId`, sin cola.
- Mantener la deduplicación, persistencia y comportamiento del scheduler existentes.
- Cubrir el endpoint con pruebas unitarias, integración PostgreSQL, E2E, Swagger y regresiones de Sprint 1.

**Non-Goals:**

- Implementar HU-03 o actualizaciones manuales de múltiples fuentes.
- Implementar Channel/Media, frontend, sentimiento o clasificación IPTC.
- Añadir Atom, scraping, retries o backoff.
- Modificar funcionalmente el scheduler de HU-01/HU-18.
- Introducir autenticación, usuarios, roles o guards en el alcance actual.
- Introducir coordinación distribuida del guard.
- Cambiar Prisma, crear migraciones, añadir `storedCount` o modificar las reglas de HU-04.
- Migrar a NestJS 11 o añadir dependencias.

## Decisions

Todas las decisiones necesarias para implementar este cambio han sido aprobadas. No quedan decisiones pendientes en HU-02.

### Endpoint REST síncrono y resultado mínimo

Un controller de `CaptureModule` expondrá `POST /api/v1/sources/:id/capture`. No habrá body. El controller delegará en un caso de uso y documentará en Swagger las respuestas `200`, `404`, `409`, `502`, `504` y `500`.

Una finalización exitosa devuelve:

```json
{
  "sourceId": "<uuid>",
  "status": "completed",
  "itemsParsed": 0
}
```

`itemsParsed` cuenta los ítems entregados por `RssOnlyParser`. No representa filas insertadas, no se denomina `itemsStored` y no requiere que el puerto de salida informe sobre persistencia. Un RSS válido vacío devuelve `0`. Si todos los ítems ya existen, el valor sigue reflejando lo interpretado y HU-04 evita nuevas filas.

### SourceRegistryPort extendido para selección por ID

`CaptureModule` continuará consumiendo el contrato de HU-15 y no dependerá de Prisma, `SourceRepositoryPort` ni `SourcesService`. `SourceRegistryPort` mantendrá `getEligibleSources()` sin cambiar su semántica para HU-01 y añadirá una consulta por ID con un resultado discriminado conceptual:

```ts
type CaptureSourceSelection =
  | Readonly<{ kind: 'missing' }>
  | Readonly<{ kind: 'inactive'; sourceId: string }>
  | Readonly<{ kind: 'eligible'; source: EligibleSource }>;

interface SourceRegistryPort {
  getEligibleSources(): Promise<readonly EligibleSource[]>;
  findForCapture(sourceId: string): Promise<CaptureSourceSelection>;
}
```

El adaptador respaldado por el repositorio de HU-15 distingue los tres estados. `missing` e `inactive` terminan antes del fetch y se traducen respectivamente a `404` y `409`. Una vez obtenida una selección elegible, la ejecución usa esa instantánea `id/url`; un cambio administrativo posterior afecta a una invocación futura y no altera la ya iniciada.

### Unidad de captura por fuente compartida

La lógica privada actual evolucionará a una unidad inyectable y reutilizable que recibe un `EligibleSource`, ejecuta `HttpRssFetcher`, `RssOnlyParser`, asigna el `sourceId` y entrega los ítems a `CaptureOutputPort`. La unidad no crea otro cliente HTTP, parser o adaptador de persistencia.

La actualización manual no invoca `SourceAccessibilityChecker` antes del fetch: hacerlo duplicaría la solicitud remota. `HttpRssFetcher` ya normaliza la URL, aplica DNS/IP/SSRF, fija el Agent, desactiva proxies y redirects implícitos, revalida redirects y comparte el deadline total.

`CaptureOrchestratorService.runCapture()` mantiene la instantánea activa y el recorrido secuencial de HU-01, pero delega cada elemento en la unidad compartida. Un fallo o una fuente ocupada continúa aislándose y no impide intentar las fuentes posteriores. `AutomaticCaptureJob` y `CaptureScheduler` no cambian funcionalmente.

### Guard compartido por sourceId

La unidad compartida adquiere un guard en memoria antes de iniciar la captura y lo libera en `finally`. El guard mantiene un conjunto de `sourceId` ocupados dentro de la instancia.

- Una petición manual sobre una fuente ocupada recibe el error tipado `source-busy`, que el controller traduce a `409 Conflict`.
- Una ejecución automática que alcanza una fuente ocupada no inicia ni encola otra captura y continúa su recorrido.
- Fuentes distintas pueden capturarse simultáneamente por activaciones diferentes; HU-01 conserva su recorrido secuencial dentro de cada ejecución automática.
- No se añade coordinación distribuida. Varias réplicas no compartirían este guard, limitación aceptada para este incremento.

### Resultados y errores tipados

Los resultados y errores de la capa de captura usarán discriminantes o códigos estables, nunca comparaciones de `Error.message`. Como mínimo existirán estas categorías conceptuales:

| Categoría | Significado | HTTP manual |
| --- | --- | --- |
| `source-not-found` | El ID no existe | `404 Not Found` |
| `source-inactive` | La fuente existe pero no es elegible | `409 Conflict` |
| `source-busy` | Ya existe una captura de ese `sourceId` | `409 Conflict` |
| `parse/invalid-rss` | Atom, HTML o RSS inválido | `502 Bad Gateway` |
| `fetch/upstream` | Red, DNS, SSRF, redirect o estado HTTP no satisfactorio | `502 Bad Gateway` |
| `timeout` | Deadline total agotado | `504 Gateway Timeout` |
| `unexpected` | Fallo interno no clasificado | `500 Internal Server Error` |

La traducción HTTP usa mensajes públicos genéricos. Las causas internas pueden conservarse para logging, pero no forman parte de la respuesta. El flujo automático consume las mismas categorías para aislar el fallo sin exponer una interfaz HTTP.

### Persistencia y deduplicación existentes

`CaptureOutputPort` permanece como límite compartido hacia HU-04 y conserva `Promise<void>`. No se añade `storedCount`. `NewsService` resuelve identidad GUID/link, descarta ítems sin identidad y `PrismaNewsRepository` mantiene la unicidad `(sourceId, dedupeKey)`. HU-02 no modifica estas reglas, el schema Prisma ni las migraciones.

### Autenticación diferida

La autenticación y autorización se difieren de forma explícita conforme al alcance actual del producto, que ya expone funciones administrativas básicas sin autenticación. HU-02 no introduce usuarios, roles, guards ni dependencias de seguridad. Esta decisión no bloquea la implementación de HU-02 y deberá reevaluarse cuando el producto incorpore control de acceso.

### Wiring por módulos

`SourcesModule` conserva la implementación y exportación de `SourceRegistryPort`. `CaptureModule` registra la unidad por fuente, el guard, el caso de uso manual, controller y DTO, además de conservar los providers de HU-01. No se introduce una dependencia circular ni `forwardRef`, y `AppModule` continúa componiendo el sistema mediante `CaptureModule`.

### Archivos previstos

La implementación se limitará previsiblemente a estos puntos, conservando los nombres equivalentes que resulten del refactor:

- modificar `backend/src/sources/ports/source-registry.port.ts` y `backend/src/sources/integrations/prisma-source-registry.ts` para la selección por ID;
- modificar `backend/src/capture/services/capture-orchestrator.service.ts` para delegar en la unidad compartida;
- modificar `backend/src/capture/errors/rss-fetch.error.ts` y, si corresponde, `rss-parse.error.ts` para las categorías estables;
- añadir dentro de `backend/src/capture/` la unidad por fuente, el guard por `sourceId`, el caso de uso manual, el controller, el DTO y los tipos/errores de resultado;
- modificar `backend/src/capture/capture.module.ts` para el wiring;
- añadir o adaptar pruebas bajo `backend/test/capture/` y `backend/test/sources/`.

No se prevén cambios en `backend/prisma/`, `backend/package.json`, `backend/package-lock.json`, workflows, scheduler, módulos de periodicidad ni implementación de noticias.

## Test Strategy

- Unitarias del registry para `missing`, `inactive`, `eligible` y regresión de `getEligibleSources()`.
- Unitarias de la unidad compartida para éxito, feed vacío, asignación de `sourceId`, fetch/upstream, timeout, RSS inválido, salida y liberación del guard incluso ante error.
- Unitarias del caso de uso y controller para selección exclusiva, ausencia de solicitudes en `404/409`, respuesta `200`, todos los mappings HTTP y sanitización de mensajes.
- Integración PostgreSQL del registry por ID y estado.
- E2E con RSS controlado: endpoint manual → parser real → `CaptureOutputPort` real → HU-04 → PostgreSQL → `GET /api/v1/news`.
- E2E de feed vacío, repetición con duplicados y concurrencia sobre el mismo `sourceId`.
- Verificación OpenAPI del endpoint y respuestas.
- Regresión completa de HU-01, scheduler, SSRF, redirects, deadline, parser y deduplicación, con cobertura global mínima del 80 %.

## Risks / Trade-offs

- **[Guard solo en memoria]** → Impide solapamiento dentro de una instancia, no entre réplicas; la coordinación distribuida queda fuera del incremento.
- **[Petición HTTP síncrona]** → Puede permanecer abierta hasta el deadline RSS; el timeout existente garantiza finalización finita.
- **[`itemsParsed` no equivale a filas almacenadas]** → Nombrar y documentar el campo con precisión y no ampliar `CaptureOutputPort` con un conteo engañoso.
- **[Refactor de la unidad usada por HU-01]** → Mantener pruebas de regresión sobre snapshot, secuencialidad, aislamiento, scheduler y salida.
- **[Errores hoy absorbidos por el orquestador]** → Introducir resultados/códigos tipados en la unidad compartida y conservar el aislamiento únicamente en el coordinador automático.
- **[Autorización diferida]** → Mantener la decisión visible y no presentar el endpoint como protegido hasta incorporar una capacidad de autenticación aprobada.

## Migration Plan

No se requiere migración de datos ni cambio de schema. La implementación refactorizará primero la captura por fuente detrás de pruebas de regresión, añadirá la selección por ID, el guard y el caso de uso manual, y finalmente expondrá el endpoint con pruebas unitarias, integración, E2E y Swagger. No se modificarán dependencias ni el comportamiento funcional del scheduler.

## Open Questions

Ninguna.
