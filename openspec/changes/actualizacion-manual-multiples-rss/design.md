## Context

Véase `proposal.md` para la motivación. La arquitectura vigente es un monolito modular y en capas. El módulo `capture` ya dispone de los siguientes flujos reutilizables:

- HU-01 obtiene una instantánea de fuentes activas mediante `SourceRegistryPort` y `CaptureOrchestratorService` las procesa secuencialmente.
- HU-02 expone la captura manual de una fuente. `ManualSourceCaptureService` resuelve `missing`, `inactive` o `eligible` mediante `SourceRegistryPort` y delega la captura elegible a `SourceCaptureService`.
- `SourceCaptureService` es la unidad compartida de descarga, parsing y emisión. Usa `SourceCaptureGuard` por `sourceId` y libera el guard en `finally`.
- HU-04 implementa `CaptureOutputPort` para persistir y deduplicar noticias por fuente; una recaptura no duplica registros.
- Los errores tipados actuales distinguen timeout, upstream/red, RSS inválido, fuente inexistente, inactiva, ocupada e inesperado.

Las restricciones aplicables son API REST bajo `/api/v1`, JSON, Swagger/OpenAPI, RSS sin scraping, separación controller-servicio-puerto-adaptador, cobertura global mínima de 80 % y ausencia de nuevas dependencias o cambios de persistencia sin aprobación. ADR-002 y ADR-003 continúan vigentes.

## Goals / Non-Goals

**Goals:**

- Componer una operación manual múltiple sobre el caso de uso unitario existente.
- Mantener un único camino para seleccionar, descargar, interpretar y persistir cada fuente.
- Conservar el aislamiento por `sourceId` frente a solapamientos con HU-01, HU-02 u otra solicitud múltiple.
- Hacer verificable el resultado de cada fuente una vez aprobado el contrato A-D.
- Identificar con precisión los archivos y niveles de prueba previsibles.

**Non-Goals:**

- Cambiar HU-01, el scheduler o la periodicidad.
- Reemplazar el endpoint unitario de HU-02.
- Cambiar el esquema Prisma, migraciones, deduplicación o persistencia de HU-04.
- Añadir dependencias, colas, paralelismo configurable, retries o backoff.
- Incorporar frontend, autenticación, autorización, Atom o scraping.

## Decisions

### 1. Composición arquitectónica aprobada

El nuevo coordinador múltiple compondrá el caso de uso unitario en lugar de repetir su lógica:

```text
Controller/DTO múltiple
  -> ManualMultipleSourceCaptureService
     -> ManualSourceCaptureService (una vez por sourceId)
        -> SourceRegistryPort.findForCapture
        -> SourceCaptureService
           -> SourceCaptureGuard
           -> RssFetcherPort
           -> RssParserPort
           -> CaptureOutputPort (HU-04)
```

El coordinador conocerá identificadores y resultados, no Prisma, `SourcesService`, HTTP RSS ni persistencia. `ManualSourceCaptureService` ya encapsula la selección `missing`/`inactive`/`eligible`; `SourceCaptureService` sigue siendo la única unidad de captura. No se amplía `SourceRegistryPort` mientras sus operaciones actuales satisfagan el caso de uso.

Alternativa descartada: copiar en el coordinador la consulta de fuentes y la descarga. Duplicaría reglas ya probadas y permitiría divergencias con HU-01/HU-02.

### 2. A - Endpoint batch (recomendación pendiente de aprobación)

**Recomendación:** `POST /api/v1/sources/capture` con JSON:

```json
{
  "sourceIds": ["<uuid-1>", "<uuid-2>"]
}
```

La ruta representa una acción sobre una colección de fuentes y mantiene proximidad semántica con `POST /api/v1/sources/:id/capture`. No sustituye el endpoint unitario.

**Alternativa razonable:** `POST /api/v1/source-captures` con el mismo cuerpo. Modela la solicitud como creación de un recurso de captura, pero introduce una nueva familia de rutas sin que exista persistencia ni consulta posterior de ese recurso. `POST /api/v1/sources/batch-capture` es más explícito, aunque agrega vocabulario RPC innecesario.

Estado: pendiente de aprobación humana; ninguna ruta queda autorizada para implementación por este documento.

### 3. B - Respuesta y aislamiento por fuente (recomendación pendiente de aprobación)

**Recomendación:** para un request estructuralmente válido, responder `200 OK` con un resultado por identificador efectivo, conservando el orden de entrada:

```json
{
  "results": [
    { "sourceId": "<uuid-1>", "status": "completed", "itemsParsed": 3 },
    { "sourceId": "<uuid-2>", "status": "failed", "error": { "code": "source-inactive" } }
  ]
}
```

El coordinador capturaría el error tipado de cada fuente, registraría un resultado sanitizado y continuaría con las demás. Las categorías candidatas son las ya existentes: `source-not-found`, `source-inactive`, `source-busy`, `fetch/upstream`, `timeout`, `parse/invalid-rss` y `unexpected`. Un éxito conservaría `itemsParsed` con el significado aprobado en HU-02: ítems interpretados, no cantidad persistida.

La recomendación evita que una fuente inexistente, inactiva, ocupada, con fallo upstream o con timeout convierta en fallo global los resultados de fuentes exitosas. Los errores de forma/cardinalidad del request sí producirían un error HTTP global de validación. Los detalles internos no se expondrían.

**Alternativas:**

- `207 Multi-Status`: expresa multiplicidad, pero está asociado a WebDAV y aporta poca ventaja frente a un body tipado.
- fail-fast con el primer error: simplifica la respuesta, pero impide satisfacer de forma robusta la incorporación de noticias disponibles de las demás fuentes.
- estado HTTP derivado del peor resultado: hace inestable el significado global y obliga al cliente a interpretar simultáneamente HTTP y body.

Estado: se debe aprobar tanto la continuidad ante fallos como la forma exacta del resultado, los códigos públicos y el `200 OK` antes de incorporarlos a la spec normativa.

### 4. C - Identificadores duplicados (recomendación pendiente de aprobación)

**Recomendación:** normalizar la lista eliminando duplicados antes de ejecutar, preservar la primera aparición y devolver un resultado por identificador único. Esto evita una segunda captura autogenerada que terminaría como `source-busy` o repetiría trabajo sin valor.

**Alternativa:** rechazar todo el request como error de validación. Es más estricto y ayuda al cliente a corregir entradas, pero hace fallar una selección por un error recuperable.

Estado: pendiente de aprobación humana. La cantidad y correspondencia de resultados depende de esta decisión.

### 5. D - Cardinalidad mínima (recomendación pendiente de aprobación)

**Recomendación:** exigir al menos dos identificadores efectivos, porque HU-03 trata una actualización múltiple y HU-02 ya cubre exactamente uno. Cero o uno producirían un error global de validación.

**Alternativa:** aceptar uno para que el cliente use siempre el mismo endpoint. Reduce lógica cliente, pero solapa dos contratos y debilita la distinción funcional entre HU-02 y HU-03.

Estado: pendiente de aprobación humana. Si se aprueba deduplicar, la cardinalidad se validaría sobre los identificadores efectivos para impedir que `[A, A]` cuente como múltiple.

### 6. E - Estrategia de ejecución (recomendación pendiente de aprobación)

**Recomendación:** ejecutar secuencialmente los identificadores efectivos. Coincide con HU-01, mantiene orden determinista, limita consumo de red y base de datos y no requiere introducir límites de concurrencia. Un `try/catch` por iteración proporciona aislamiento funcional sin fail-fast.

`SourceCaptureGuard` sigue protegiendo cada fuente frente a solapamientos externos: captura automática, endpoint HU-02 u otra operación HU-03. El guard no sustituye la política de duplicados internos.

**Alternativa:** ejecutar fuentes distintas en paralelo con `Promise.allSettled`. Puede reducir latencia total y el guard actual lo permite, pero incrementa carga simultánea, complica orden y observabilidad y exige aprobar un límite de concurrencia; HU-03 no lo requiere.

Estado: pendiente de aprobación humana.

### 7. Archivos previstos tras la aprobación

Nuevos, sujetos al contrato aprobado:

- `backend/src/capture/services/manual-multiple-source-capture.service.ts`
- `backend/src/capture/controllers/manual-multiple-source-capture.controller.ts`
- `backend/src/capture/dto/manual-multiple-source-capture-request.dto.ts`
- `backend/src/capture/dto/manual-multiple-source-capture-response.dto.ts`
- `backend/test/capture/manual-multiple-source-capture.service.spec.ts`
- `backend/test/capture/manual-multiple-source-capture.controller.spec.ts`
- `backend/test/capture/manual-multiple-source-capture.e2e.spec.ts`

Modificados previsibles:

- `backend/src/capture/capture.module.ts` para wiring.
- Documentación Swagger asociada al nuevo controller/DTO.

No se prevé modificar `schema.prisma`, migraciones, adaptadores de `sources` o `news`, dependencias ni workflows. Si la implementación demostrara que alguno es necesario, se detendrá y se solicitará una nueva aprobación.

### 8. Estrategia de pruebas prevista

- Unitarias del coordinador: orden, alcance, continuación tras cada error tipado, resultado exitoso y políticas A-E aprobadas.
- Unitarias de controller/DTO: delegación, validación, serialización y sanitización.
- Integración/E2E con PostgreSQL real: varias fuentes, persistencia de noticias de las exitosas, deduplicación existente, mezcla de resultados y solapamiento protegido.
- Regresión: suites de HU-01, HU-02, HU-04, scheduler, SSRF y suite completa con cobertura global mínima de 80 %.

## Risks / Trade-offs

- [La operación síncrona puede tardar la suma de los tiempos de varias fuentes] → mantener alcance acotado, reutilizar el timeout por fuente y documentar la semántica; no introducir procesamiento asíncrono sin otro cambio aprobado.
- [Un resultado parcial puede ser interpretado como éxito total si el cliente mira solo HTTP] → documentar y tipar `results`, y probar cada categoría aprobada.
- [Dos solicitudes concurrentes pueden obtener `source-busy` para la misma fuente] → conservar `SourceCaptureGuard` y representar ese resultado sin bloquear las demás fuentes.
- [La deduplicación silenciosa puede ocultar un error del cliente] → hacer explícita la política en OpenAPI y en escenarios una vez aprobada.
- [La ejecución secuencial aumenta latencia] → privilegiar previsibilidad en HU-03; evaluar concurrencia acotada en un cambio posterior si existen mediciones que lo justifiquen.

## Migration Plan

No hay migración de datos ni despliegue especial. Tras la aprobación A-E, se actualizará primero la spec normativa, se implementará el flujo aditivo, se ejecutará la regresión completa y se podrá desplegar junto al endpoint HU-02 existente. El rollback consiste en retirar el nuevo controller/coordinador y su wiring; los datos persistidos correctamente por HU-04 conservan su validez.

## Approval Gate

La implementación no debe comenzar hasta que una revisión humana resuelva A, B, C, D y E. Después de esa decisión se actualizarán `spec.md`, `design.md` y `tasks.md` para eliminar alternativas, fijar el contrato y agregar todos los escenarios normativos de errores y validación.
