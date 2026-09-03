## Why

HumWorld necesita que un administrador controle con qué frecuencia se actualizan automáticamente las fuentes RSS. HU-01 ya define qué hacer con una periodicidad configurada y con el estado sin configurar; HU-18 debe administrar y persistir ese estado, exponerlo mediante REST y notificar sus cambios para que el scheduler se reprograme sin reiniciar la aplicación.

## What Changes

- Incorporar una API REST JSON documentada con Swagger/OpenAPI: `GET /api/v1/config` para consultar y `PUT /api/v1/config` para configurar o modificar la periodicidad.
- Mantener un único valor global elegido del catálogo cerrado de 15, 30, 60, 360, 720 o 1440 minutos.
- Rechazar con `400 Bad Request` cualquier valor ajeno al catálogo, preservando el estado anterior.
- Mantener un estado inicial sin configurar y sin valor por defecto funcional; la consulta lo representa inequívocamente con `capturePeriodicityMinutes: null`.
- Persistir una configuración singleton mediante PostgreSQL, Prisma y Prisma Migrate.
- Exponer hacia HU-01 un estado tipado `configured(minutes)` o `unconfigured`, no un número que confunda ausencia con un valor real.
- Notificar in-process cada cambio efectivo después de persistirlo, sin añadir `@nestjs/event-emitter`, para que HU-01 cancele/reemplace solo el job futuro y calcule el siguiente instante desde el momento efectivo del cambio.
- Tratar un PUT que repite el valor vigente como un no-op idempotente: `200 OK`, sin escribir ni cambiar `updatedAt`, notificar o reprogramar.
- Mantener fuera de este cambio la periodicidad por fuente, una UI administrativa, la autenticación de las funcionalidades básicas de Sprint 1, la interrupción de capturas en curso y la política de solapamiento, ya resuelta en HU-01.

## Capabilities

### New Capabilities

- `config-periodicidad`: consulta y configuración REST de la periodicidad global, persistencia singleton, representación explícita del estado sin configurar y notificación de cambios hacia HU-01.

### Modified Capabilities

Ninguna. HU-01 permanece como cambio no archivado, pero ya contiene el escenario sin periodicidad, el scheduling dinámico con `@nestjs/schedule` y la política de solapamiento aprobada.

## Impact

- Endpoints `GET /api/v1/config` y `PUT /api/v1/config`, DTOs y documentación Swagger/OpenAPI.
- Modelo singleton `CaptureConfig`, repositorio Prisma y migración de esquema que deberán implementarse posteriormente.
- Casos de uso para consulta, validación y persistencia de la periodicidad.
- Puertos relacionados para leer el estado vigente y suscribirse a cambios.
- Wiring unidireccional con el scheduler de HU-01, sin dependencia circular entre módulos.
- Pruebas unitarias, de integración con PostgreSQL y E2E de API/reprogramación.
