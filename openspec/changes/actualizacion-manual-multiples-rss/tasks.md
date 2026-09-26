## 1. Preparación y contrato

- [x] 1.1 Registrar la aprobación humana explícita de A-E: endpoint, respuesta/aislamiento, duplicados, cardinalidad y ejecución secuencial.
- [x] 1.2 Actualizar `spec.md` con el contrato normativo y escenarios para éxito, inexistente, inactiva, ocupada, upstream, timeout, RSS inválido, duplicados y cardinalidad.
- [x] 1.3 Actualizar `design.md` para fijar las decisiones A-E sin ambigüedades.
- [x] 1.4 Revisar esta lista para que cada tarea coincida con las decisiones A-E, sin conservar supuestos incompatibles.
- [x] 1.5 Ejecutar `openspec validate actualizacion-manual-multiples-rss --strict` y corregir los artefactos antes de modificar código.

## 2. Caso de uso múltiple

- [x] 2.1 Definir los tipos internos de la unión discriminada `completed`/`failed` con la taxonomía estable existente.
- [x] 2.2 Crear `MultipleSourceCaptureService` sin dependencias directas de Prisma, `SourcesService`, HTTP RSS ni persistencia.
- [x] 2.3 Deduplicar identificadores preservando la primera aparición y validar al menos dos identificadores efectivos antes de capturar.
- [x] 2.4 Procesar secuencialmente los identificadores efectivos con `for...of` y `await`, sin APIs de paralelismo.
- [x] 2.5 Devolver `results` en el orden de los identificadores efectivos, con un resultado por fuente.

## 3. Reutilización del flujo existente

- [x] 3.1 Delegar cada identificador efectivo a `ManualSourceCaptureService` en vez de repetir la selección de HU-02.
- [x] 3.2 Verificar que la selección continúa pasando por `SourceRegistryPort.findForCapture`.
- [x] 3.3 Verificar que toda fuente elegible continúa pasando por `SourceCaptureService` como única unidad de captura.
- [x] 3.4 Verificar que la salida continúa pasando exclusivamente por `CaptureOutputPort` hacia la persistencia/deduplicación de HU-04.
- [x] 3.5 Confirmar mediante revisión de diff que no se duplicaron lógica de descarga, parsing RSS, persistencia ni consulta de fuentes.

## 4. Endpoint, DTO y validación

- [x] 4.1 Crear el DTO de request requerido con `sourceIds: string[]`, elementos string no vacíos y sin máximo arbitrario.
- [x] 4.2 Crear DTOs de respuesta para resultados exitosos y fallidos sin exponer detalles internos.
- [x] 4.3 Crear `POST /sources/capture`, que bajo el prefijo global expone `POST /api/v1/sources/capture`, y delegar al caso de uso.
- [x] 4.4 Traducir el error de input batch a `400` y mantener errores individuales dentro de `results`.
- [x] 4.5 Conservar en los éxitos el significado de `itemsParsed` aprobado por HU-02, sin introducir `storedCount`.
- [x] 4.6 Registrar controller y servicio en `CaptureModule` reutilizando los providers existentes.

## 5. Aislamiento de fallos y SourceCaptureGuard

- [x] 5.1 Aislar cada fuente con `try/catch`, continuar siempre con la posterior y responder `200` al request batch válido.
- [x] 5.2 Transformar `source-not-found` y `source-inactive` en resultados fallidos individuales.
- [x] 5.3 Transformar `source-busy` sin reintentar, encolar ni bloquear el procesamiento de las demás fuentes.
- [x] 5.4 Transformar upstream/red, timeout y RSS inválido en `fetch/upstream`, `timeout` y `parse/invalid-rss`.
- [x] 5.5 Transformar errores `unexpected` tipados y cualquier error desconocido en `errorCode: "unexpected"` sin filtrar detalles.
- [x] 5.6 Reutilizar el mismo `SourceCaptureGuard` compartido por HU-01, HU-02 y HU-03 sin crear un guard paralelo.
- [x] 5.7 Confirmar que una fuente sin ítems nuevos sigue usando la semántica exitosa heredada de HU-02/HU-04.

## 6. Pruebas unitarias

- [x] 6.1 Probar que el coordinador procesa todas las fuentes seleccionadas cuando todas resultan exitosas.
- [x] 6.2 Probar que el coordinador no solicita captura para una fuente no seleccionada.
- [x] 6.3 Probar que un fallo individual no impide procesar las fuentes restantes.
- [x] 6.4 Cubrir en el coordinador cada categoría tipada: inexistente, inactiva, ocupada, upstream, timeout, RSS inválido e inesperado.
- [x] 6.5 Probar `[A,B,A] -> [A,B]`, una captura por fuente, orden y cantidad de resultados.
- [x] 6.6 Probar la cardinalidad mínima y los casos límite del request.
- [x] 6.7 Probar que la segunda captura no comienza antes de resolverse la primera y que el orden de resultados es estable.
- [x] 6.8 Probar que el controller delega una sola vez y serializa exactamente el contrato aprobado.
- [x] 6.9 Probar que los errores globales del DTO/controller no inician capturas.

## 7. Pruebas de integración y E2E

- [x] 7.1 Probar con PostgreSQL real la captura de al menos dos fuentes activas seleccionadas en una operación.
- [x] 7.2 Verificar que las noticias de cada fuente exitosa se persisten con su `sourceId` correcto.
- [x] 7.3 Repetir la operación y verificar que la deduplicación existente no crea noticias duplicadas.
- [x] 7.4 Probar una mezcla de fuente exitosa, inexistente e inactiva y verificar los resultados aprobados.
- [x] 7.5 Probar una mezcla de fuente exitosa con upstream, timeout y RSS inválido sin perder el resultado exitoso ni detener fuentes posteriores.
- [x] 7.6 Probar un solapamiento real con HU-01, HU-02 u otra operación HU-03 y verificar `SourceCaptureGuard` por `sourceId`.
- [x] 7.7 Verificar que fuentes no seleccionadas no reciben solicitudes HTTP durante la operación.
- [x] 7.8 Verificar que los enlaces incluidos en los ítems RSS no se descargan ni se someten a scraping.
- [x] 7.9 Cubrir E2E deduplicación de IDs y mínimo de dos efectivos, verificando cero fetch para input inválido.

## 8. Swagger y documentación del contrato

- [x] 8.1 Documentar en Swagger la ruta, el request y las restricciones aprobadas de `sourceIds`.
- [x] 8.2 Documentar el resultado exitoso por fuente, `itemsParsed` y todas las categorías fallidas aprobadas.
- [x] 8.3 Documentar la semántica HTTP de resultados parciales y errores globales de validación.
- [x] 8.4 Agregar ejemplos coherentes para éxito total, resultado parcial, duplicados y cardinalidad según las decisiones aprobadas.
- [x] 8.5 Verificar que la documentación no prometa scraping, paralelismo, reintentos ni cantidades persistidas.

## 9. Regresión y calidad

- [x] 9.1 Ejecutar las pruebas de HU-01 y confirmar que la captura automática y su ejecución secuencial no cambiaron.
- [x] 9.2 Ejecutar las pruebas de HU-02 y confirmar que `POST /api/v1/sources/:id/capture` conserva su contrato.
- [x] 9.3 Ejecutar las pruebas de HU-04 y confirmar persistencia, identidad y deduplicación sin regresiones.
- [x] 9.4 Ejecutar las pruebas de scheduler, configuración, fuentes y protecciones SSRF relacionadas.
- [x] 9.5 Verificar que el proyecto no configura lint sin añadir tooling, y ejecutar build y la suite backend completa.
- [x] 9.6 Verificar cobertura global mínima de 80 % y cubrir cualquier rama nueva relevante.

## 10. Verificación final

- [x] 10.1 Ejecutar `openspec validate actualizacion-manual-multiples-rss --strict` sobre los artefactos finales.
- [x] 10.2 Confirmar en el diff que no cambiaron `schema.prisma`, migraciones, dependencias, workflows, scheduler ni periodicidad.
- [x] 10.3 Confirmar conformidad con `docs/architecture.md`, ADR-002, ADR-003 y el flujo controller-servicio-puerto-adaptador.
- [x] 10.4 Confirmar que no existe acceso directo desde el nuevo controller/coordinador a Prisma, `SourcesService` o adaptadores de persistencia.
- [x] 10.5 Confirmar que HU-03 captura exclusivamente RSS y que todas las tareas permanecen dentro del alcance aprobado.
- [x] 10.6 Registrar evidencia de comandos, pruebas y cobertura para la revisión humana previa al merge.
