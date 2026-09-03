## 1. Modelo Prisma y migración

- [ ] 1.1 Añadir el modelo `RssSource` con UUID estable, URL obligatoria y única, `active=true`, `createdAt` y `updatedAt`.
- [ ] 1.2 Mantener `News.sourceId` obligatorio y añadir la relación FK real hacia `RssSource.id`.
- [ ] 1.3 Configurar la FK con `onDelete: Restrict`/`NoAction`, sin borrado en cascada ni borrado físico de fuentes.
- [ ] 1.4 Crear una migración Prisma nueva, coordinada con la migración pendiente de HU-04.
- [ ] 1.5 Verificar la migración desde una base PostgreSQL 16 vacía y adaptar fixtures para que toda noticia use una fuente existente.

## 2. Normalización y validación de URL

- [ ] 2.1 Implementar la normalización `trim -> URL de Node -> toString()`, aceptando solo HTTP/HTTPS, rechazando credenciales embebidas y conservando path y query.
- [ ] 2.2 Implementar la validación sintáctica y traducir sus fallos a un error de entrada controlado.
- [ ] 2.3 Implementar la accesibilidad mediante `@nestjs/axios`/`HttpService`, solicitud GET, respuesta final 2xx y timeout central finito.
- [ ] 2.4 Reutilizar el timeout configurable con `10_000 ms` por defecto sin añadir otra dependencia HTTP.
- [ ] 2.5 Definir y aplicar la política SSRF completa para loopback, redes privadas, link-local, resolución DNS y todos los destinos de redirecciones antes de considerar seguro el endpoint para despliegue público.
- [ ] 2.6 Mantener la verificación de accesibilidad independiente del guard RSS-only de HU-01.

## 3. Repositorio de fuentes

- [ ] 3.1 Definir el puerto de repositorio para crear, consultar, listar/filtrar, reemplazar, actualizar y cambiar el estado de fuentes.
- [ ] 3.2 Implementar el adaptador Prisma sobre PostgreSQL sin operaciones de borrado físico.
- [ ] 3.3 Consultar y hacer cumplir la unicidad sobre la URL normalizada entre fuentes activas y desactivadas.
- [ ] 3.4 Traducir una colisión concurrente de la restricción única a un conflicto de dominio/API.
- [ ] 3.5 Garantizar que los cambios de estado no modifican las noticias asociadas.

## 4. Servicios y casos de uso

- [ ] 4.1 Implementar la creación, dejando activa la fuente después de superar normalización, sintaxis, accesibilidad y unicidad.
- [ ] 4.2 Implementar la consulta por identificador y el error de fuente inexistente.
- [ ] 4.3 Implementar el listado completo y el filtro simple por estado activo/desactivado.
- [ ] 4.4 Implementar el reemplazo completo de la URL mediante PUT y revalidarla antes de persistir.
- [ ] 4.5 Implementar la actualización parcial de URL o estado mediante PATCH, exigiendo al menos un cambio.
- [ ] 4.6 Implementar DELETE: fuente activa pasa a desactivada con 204, fuente ya desactivada permanece igual con 204 e identificador inexistente responde 404, siempre sin borrado físico.
- [ ] 4.7 Implementar la reactivación sin revalidar la URL cuando esta no cambia.

## 5. API REST y Swagger

- [ ] 5.1 Crear DTOs para POST, PUT, PATCH, filtro de listado y respuesta, con validación y ejemplos OpenAPI.
- [ ] 5.2 Implementar `SourcesController` con los seis endpoints aprobados bajo `/api/v1/sources`.
- [ ] 5.3 Responder 201 en POST, 200 en GET/PUT/PATCH, 204 sin cuerpo al desactivar o repetir DELETE sobre una fuente existente y 404 si el identificador de DELETE no existe.
- [ ] 5.4 Mapear entrada o accesibilidad inválida a 400, identificador inexistente a 404 y URL duplicada a 409.
- [ ] 5.5 Documentar rutas, parámetros, cuerpos y respuestas mediante Swagger/OpenAPI.
- [ ] 5.6 Verificar que las operaciones básicas funcionan sin autenticación en Sprint 1.

## 6. Provider para HU-01/HU-02 y wiring

- [ ] 6.1 Definir `SourceRegistryPort.getEligibleSources()` con una instantánea inmutable de elementos `{ id, url }`.
- [ ] 6.2 Implementar el provider consultando únicamente fuentes activas y excluyendo siempre las desactivadas.
- [ ] 6.3 Registrar y exportar el token desde `SourcesModule` para que los módulos consumidores lo inyecten sin ciclo.
- [ ] 6.4 Integrar el provider real con HU-01 cuando la composición autorizada de esos módulos se implemente.

## 7. Pruebas unitarias

- [ ] 7.1 Probar normalización, protocolos admitidos, rechazo de credenciales embebidas y conservación de path/query.
- [ ] 7.2 Probar sintaxis inválida, respuesta HTTP no satisfactoria y timeout.
- [ ] 7.3 Probar creación exitosa y rechazos por URL inválida, inaccesible o duplicada.
- [ ] 7.4 Probar consulta, listado completo, filtros por ambos estados y rechazo de un filtro inválido.
- [ ] 7.5 Probar PUT/PATCH y todas las validaciones al cambiar URL —sintaxis, esquema, credenciales, accesibilidad y timeout—, incluida la conservación del estado ante rechazo.
- [ ] 7.6 Probar por separado DELETE sobre fuente activa (desactiva y 204), ya desactivada (sin cambio y 204) e inexistente (404), además de la reactivación.
- [ ] 7.7 Probar que el provider devuelve solo `id` y `url` de fuentes activas en una instantánea.
- [ ] 7.8 Probar el mapeo de errores y códigos HTTP del controller.

## 8. Integración PostgreSQL y E2E

- [ ] 8.1 Probar con PostgreSQL real la persistencia y la restricción única entre fuentes activas y desactivadas.
- [ ] 8.2 Probar con PostgreSQL real la FK obligatoria `News.sourceId -> RssSource.id`, la integridad referencial y `Restrict`/`NoAction` sin cascada.
- [ ] 8.3 Probar E2E POST y GET de colección/detalle, incluidos filtros válidos/inválidos y errores 400/404/409.
- [ ] 8.4 Probar E2E PUT, PATCH, reactivación y los tres resultados de DELETE: activa -> desactivada/204, ya desactivada -> sin cambio/204 e inexistente -> 404.
- [ ] 8.5 Probar E2E que desactivar una fuente conserva sus noticias y la excluye de capturas posteriores.
- [ ] 8.6 Probar la integración HU-15 -> HU-01 mediante el `SourceRegistryPort` real.
- [ ] 8.7 Verificar el documento OpenAPI, ejecutar suite, cobertura, build y comprobaciones estáticas del proyecto.

## 9. Trazabilidad del alcance obligatorio pendiente

- [ ] 9.1 Registrar explícitamente en el backlog, antes del cierre del proyecto, la gestión obligatoria de canales/medios y sus fuentes RSS, sin crear el Issue durante este ajuste OpenSpec.
- [ ] 9.2 Mostrar en Sprint Review la separación entre el slice actual de fuentes RSS y la capacidad obligatoria pendiente de canales/medios.
