## 1. Catálogo, estado y modelo Prisma

- [ ] 1.1 Implementar el tipo del catálogo cerrado `15 | 30 | 60 | 360 | 720 | 1440`.
- [ ] 1.2 Implementar la unión discriminada `configured(minutes) | unconfigured`.
- [ ] 1.3 Añadir el modelo singleton `CaptureConfig` con ID fijo, periodicidad nullable y `updatedAt`.
- [ ] 1.4 Crear la migración Prisma correspondiente sin introducir un valor funcional por defecto.
- [ ] 1.5 Verificar la migración desde una base PostgreSQL vacía sin depender de seed.

## 2. Repositorio y casos de uso

- [ ] 2.1 Definir el puerto de repositorio singleton sin exponer su identificador fijo a los casos de uso.
- [ ] 2.2 Implementar el adaptador Prisma que mapea fila ausente o valor nulo a `unconfigured`.
- [ ] 2.3 Implementar el `upsert` del único registro global y devolver su `updatedAt`.
- [ ] 2.4 Implementar la consulta del estado vigente.
- [ ] 2.5 Implementar la configuración/reemplazo con validación estricta contra el catálogo.
- [ ] 2.6 Garantizar que un valor inválido conserva el estado previo y no emite notificación.
- [ ] 2.7 Tratar un PUT con el valor ya vigente como no-op idempotente, sin escribir, cambiar `updatedAt`, notificar ni reprogramar.

## 3. API REST y Swagger

- [ ] 3.1 Crear DTOs de PUT y respuesta para `capturePeriodicityMinutes`, incluidos ejemplos OpenAPI.
- [ ] 3.2 Implementar `GET /api/v1/config` con número configurado o `null` y respuesta 200.
- [ ] 3.3 Implementar `PUT /api/v1/config` con respuesta 200 para valores admitidos.
- [ ] 3.4 Mapear valores nulos, de tipo incorrecto o fuera del catálogo a 400.
- [ ] 3.5 Documentar GET, PUT, cuerpos y respuestas mediante Swagger/OpenAPI.
- [ ] 3.6 Verificar que GET y PUT funcionan sin autenticación en Sprint 1.

## 4. Provider, notifier y scheduler

- [ ] 4.1 Implementar `PeriodicityProviderPort.getCurrentState()` con estados configured/unconfigured.
- [ ] 4.2 Implementar `PeriodicityChangeNotifierPort.subscribe()` y el publisher interno asíncrono, incluida la función de desuscripción, sin dependencias nuevas.
- [ ] 4.3 Construir cada notificación con el estado persistido y `effectiveAt` derivado de `updatedAt`.
- [ ] 4.4 Aplicar y verificar ambas ramas: mismo valor -> 200 sin escritura/notificación/reprogramación; valor nuevo -> validar, persistir, obtener `effectiveAt`, publicar/esperar y reemplazar solo el job futuro.
- [ ] 4.5 Registrar tokens y exports en `CaptureConfigModule` sin importar el módulo de captura y sin usar `forwardRef`.
- [ ] 4.6 Integrar en HU-01 la suscripción y lectura inicial del estado durante el arranque.
- [ ] 4.7 Cancelar/reemplazar solo el job futuro y calcular el siguiente instante desde `effectiveAt`.
- [ ] 4.8 Liberar la suscripción al destruir el módulo y mantener intacta cualquier captura en curso.

## 5. Pruebas unitarias

- [ ] 5.1 Probar todos los valores admitidos y el rechazo de valores fuera del catálogo o de tipo inválido.
- [ ] 5.2 Probar que el rechazo conserva la configuración anterior y no notifica.
- [ ] 5.3 Probar el mapeo de fila ausente y valor nulo a `unconfigured`.
- [ ] 5.4 Probar primera configuración y cambios posteriores sobre el mismo singleton.
- [ ] 5.5 Probar estados configured/unconfigured del provider.
- [ ] 5.6 Probar suscripción, notificación posterior al commit, `effectiveAt` y desuscripción.
- [ ] 5.7 Probar DTOs, respuestas JSON y códigos 200/400 del controller.
- [ ] 5.8 Probar que repetir el valor vigente devuelve 200 sin escribir, modificar `updatedAt`, notificar ni cancelar/reemplazar/reprogramar el job futuro.

## 6. Integración PostgreSQL y E2E

- [ ] 6.1 Probar con PostgreSQL real que siempre se actualiza el único registro lógico.
- [ ] 6.2 Probar con PostgreSQL real el estado inicial sin fila y la lectura después de un PUT.
- [ ] 6.3 Probar E2E GET configurado y sin configurar con las representaciones JSON aprobadas.
- [ ] 6.4 Probar E2E PUT con valor nuevo, valor idéntico como no-op y valor inválido, incluida la conservación del estado anterior cuando corresponda.
- [ ] 6.5 Probar la integración HU-18 -> HU-01 desde el cambio persistido hasta la reprogramación del job futuro.
- [ ] 6.6 Probar que una captura en curso no se interrumpe y que la integración respeta —sin redefinir— la política de HU-01: una activación solapada se omite, no corre concurrentemente y no se encola.
- [ ] 6.7 Verificar el documento OpenAPI, ejecutar suite, cobertura, build y comprobaciones estáticas del proyecto.
