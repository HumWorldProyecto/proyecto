## Context

Véase `proposal.md` para la motivación y `spec.md` para el contrato observable. La arquitectura vigente es un monolito modular y en capas. El módulo `capture` ya dispone de los siguientes flujos reutilizables:

- HU-01 obtiene una instantánea de fuentes activas mediante `SourceRegistryPort` y `CaptureOrchestratorService` las procesa secuencialmente.
- HU-02 expone la captura manual de una fuente. `ManualSourceCaptureService` resuelve `missing`, `inactive` o `eligible` mediante `SourceRegistryPort` y delega la captura elegible a `SourceCaptureService`.
- `SourceCaptureService` es la unidad compartida de descarga, parsing y emisión. Usa `SourceCaptureGuard` por `sourceId` y libera el guard en `finally`.
- HU-04 implementa `CaptureOutputPort` para persistir y deduplicar noticias por fuente.
- `SourceCaptureError` ya representa las categorías estables aprobadas para captura.

Las restricciones aplicables son API REST bajo `/api/v1`, JSON, Swagger/OpenAPI, RSS sin scraping, separación controller-servicio-puerto-adaptador, cobertura global mínima de 80 % y ausencia de nuevas dependencias o cambios de persistencia.

Los ADR aplicables y su cumplimiento son:

- ADR-002: se conserva el stack existente Node.js, TypeScript, NestJS, PostgreSQL, Prisma y Jest, sin introducir tecnologías ni dependencias.
- ADR-003: se reutilizan el flujo RSS, sus integraciones existentes y `SourceCaptureGuard`, sin modificar el scheduler ni el timeout.
- ADR-004: el endpoint permanece dentro del monolito modular y separa controller, servicio coordinador, puertos y adaptadores.
- ADR-005: la verificación combina pruebas unitarias, integración con PostgreSQL real y E2E.

HU-03 no modifica ninguna de estas decisiones aceptadas. ADR-006 permanece Propuesto y no se aplica como obligación ni autoriza una migración a NestJS 11.

## Goals / Non-Goals

**Goals:**

- Componer una operación manual múltiple sobre el caso de uso unitario existente.
- Mantener un único camino para seleccionar, descargar, interpretar y persistir cada fuente.
- Validar la selección completa antes de iniciar capturas.
- Conservar aislamiento por fuente y resultados deterministas en orden estable.
- Reutilizar el guard por `sourceId` frente a solapamientos con HU-01, HU-02 u otra solicitud múltiple.

**Non-Goals:**

- Cambiar HU-01, el scheduler o la periodicidad.
- Reemplazar `POST /api/v1/sources/:id/capture`.
- Cambiar el esquema Prisma, migraciones, deduplicación o persistencia de HU-04.
- Añadir dependencias, colas, paralelismo, retries o backoff.
- Incorporar frontend, autenticación, autorización, Atom o scraping.

## Decisions

### 1. Endpoint batch y coexistencia con HU-02

El controller batch expondrá:

~~~http
POST /api/v1/sources/capture
Content-Type: application/json

{
  "sourceIds": ["id-1", "id-2"]
}
~~~

La ruta coexistirá con `POST /api/v1/sources/:id/capture`; no se crea `/source-captures` ni otro body. El controller delegará la coordinación a `MultipleSourceCaptureService`.

### 2. Validación en dos niveles

El DTO validará antes de entrar al controller:

- `sourceIds` requerido;
- valor de tipo array;
- cada elemento de tipo string;
- cada string no vacío.

No se configura un máximo de elementos. La regla semántica se aplica en `MultipleSourceCaptureService`: deduplicar con `Set` preservando el orden de primera aparición y exigir al menos dos identificadores efectivos. Una selección con menos de dos lanza un error de input batch específico; el controller lo traduce a `400 Bad Request`.

Toda validación global ocurre antes de invocar `ManualSourceCaptureService.capture`, por lo que un request inválido produce cero capturas. No se rechaza un request solo porque el array original tenga duplicados.

### 3. Composición arquitectónica

El coordinador múltiple compondrá el caso de uso unitario:

~~~text
MultipleSourceCaptureController + DTOs
  -> MultipleSourceCaptureService
     -> ManualSourceCaptureService.capture(sourceId)
        -> SourceRegistryPort.findForCapture
        -> SourceCaptureService
           -> SourceCaptureGuard
           -> RssFetcherPort
           -> RssParserPort
           -> CaptureOutputPort (HU-04)
~~~

`MultipleSourceCaptureService` conocerá identificadores, resultados y `SourceCaptureError`; no accederá a Prisma, `SourcesService`, `HttpRssFetcher`, `RssOnlyParser`, repositorios ni persistencia. No se modifica `SourceRegistryPort`: `ManualSourceCaptureService` ya ofrece toda la semántica individual necesaria.

### 4. Secuencialidad, aislamiento y guard

El servicio recorrerá los identificadores efectivos con `for...of` y `await`. No usará `Promise.all`, `Promise.allSettled` ni un mecanismo nuevo de concurrencia. La siguiente captura comenzará solo después de que la anterior se haya resuelto.

Cada iteración tendrá su propio aislamiento:

1. invocar `ManualSourceCaptureService.capture(sourceId)`;
2. convertir el éxito a un resultado `completed`;
3. capturar cualquier error de esa fuente;
4. convertir un `SourceCaptureError` a su misma categoría estable;
5. convertir cualquier error no tipado a `unexpected`;
6. agregar el resultado y continuar.

`SourceCaptureGuard` no se replica ni se manipula desde el coordinador. El `SourceCaptureService` existente continúa protegiendo solapamientos por fuente con todos los flujos.

### 5. Contrato de respuesta

Un request batch válido responde siempre `200 OK`:

~~~json
{
  "results": [
    {
      "sourceId": "id-1",
      "status": "completed",
      "itemsParsed": 3
    },
    {
      "sourceId": "id-2",
      "status": "failed",
      "errorCode": "source-inactive"
    }
  ]
}
~~~

La unión discriminada contiene:

- éxito: `sourceId`, `status: "completed"`, `itemsParsed`;
- fallo: `sourceId`, `status: "failed"`, `errorCode`.

`itemsParsed` conserva el significado de HU-02: cantidad de ítems RSS interpretados, no cantidad persistida. `errorCode` solo admite `source-not-found`, `source-inactive`, `source-busy`, `fetch/upstream`, `parse/invalid-rss`, `timeout` y `unexpected`.

Los resultados conservan el orden de los identificadores efectivos. No se serializan `Error.message`, stack, URL de fuente, DNS/IP ni detalles upstream.

Los errores individuales no se traducen a respuestas HTTP globales `404`, `409`, `502` o `504`. `400` queda reservado para input batch inválido. `500` solo puede representar un fallo global realmente inesperado fuera del aislamiento por fuente.

### 6. Swagger/OpenAPI

El controller y los DTO documentarán:

- requestBody requerido y `sourceIds`;
- response `200` con wrapper `results`;
- respuesta discriminada mediante `oneOf` para éxito y fallo;
- response `400` para input inválido;
- coexistencia sin regresión del path `/api/v1/sources/{id}/capture`.

Las clases DTO usarán los decoradores Swagger ya instalados. No se añade dependencia.

### 7. Archivos previstos

Nuevos:

- `backend/src/capture/services/multiple-source-capture.service.ts`
- `backend/src/capture/controllers/multiple-source-capture.controller.ts`
- `backend/src/capture/dto/multiple-source-capture-request.dto.ts`
- `backend/src/capture/dto/multiple-source-capture-response.dto.ts`
- `backend/src/capture/errors/multiple-source-capture-input.error.ts`
- `backend/test/capture/multiple-source-capture.service.spec.ts`
- `backend/test/capture/multiple-source-capture-request.dto.spec.ts`
- `backend/test/capture/multiple-source-capture.controller.spec.ts`
- `backend/test/capture/multiple-source-capture.e2e.spec.ts`

Modificados:

- `backend/src/capture/capture.module.ts`
- `backend/src/capture/types/source-capture-result.ts`
- `backend/test/capture/app-module.integration.spec.ts`

No se modifican `schema.prisma`, migraciones, adaptadores de `sources` o `news`, dependencias, workflows, scheduler ni periodicidad.

### 8. Estrategia de pruebas

- Unitarias del coordinador: deduplicación, cardinalidad, orden, secuencialidad explícita, dos éxitos, continuidad tras cada error tipado, `unexpected` tipado y error desconocido.
- Unitarias del controller/DTO: delegación, `400`, `200`, serialización y sanitización.
- E2E con `AppModule` y PostgreSQL real: parser/output/HU-04 reales, fuentes seleccionadas, exclusión de no seleccionadas, deduplicación de IDs y noticias, éxito parcial y guard ocupado.
- OpenAPI: nuevo path, body requerido, schemas `200`/`400`, unión discriminada y permanencia del path HU-02.
- Regresión: HU-01, HU-02, HU-04, scheduler, guard, suite completa, build, Prisma y cobertura global mínima de 80 %.

## Risks / Trade-offs

- [La operación síncrona tarda la suma de las capturas] → reutilizar el timeout existente por fuente y mantener secuencialidad determinista.
- [El cliente podría mirar solo el `200`] → documentar y tipar cada elemento de `results`.
- [Solicitudes concurrentes pueden obtener `source-busy`] → conservar `SourceCaptureGuard` y aislar ese resultado sin bloquear otras fuentes.
- [Deduplicar puede ocultar un error del cliente] → documentar que la primera aparición define el orden y que cada fuente se captura una vez.
- [Un array muy grande puede prolongar la operación] → no inventar un máximo en HU-03; cualquier límite futuro requerirá requisitos y aprobación propios.

## Migration Plan

No hay migración de datos ni despliegue especial. La implementación es aditiva y conserva el endpoint HU-02. Tras completar las pruebas y regresiones, puede desplegarse junto al módulo `capture` existente. El rollback consiste en retirar el controller, servicio, DTOs, error de input y wiring nuevos; los datos ya persistidos correctamente por HU-04 conservan su validez.
