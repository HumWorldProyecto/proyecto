## Why

HumWorld necesita que un administrador pueda mantener vigente el conjunto de fuentes RSS utilizado por la captura. HU-01 y HU-02 consumen fuentes registradas, pero necesitan un contrato estable que permita crearlas, consultarlas, actualizarlas, desactivarlas y reactivarlas sin perder la trazabilidad de las noticias ya almacenadas.

## What Changes

- Incorporar la gestión de fuentes RSS mediante una API REST JSON documentada con Swagger/OpenAPI bajo `/api/v1/sources`.
- Permitir crear, listar, consultar por identificador, reemplazar los datos editables, actualizarlos parcialmente, desactivar mediante eliminación lógica y reactivar fuentes RSS.
- Permitir que el listado se filtre, como mínimo, por estado activo o desactivado.
- Validar la URL de una fuente tanto sintácticamente como mediante accesibilidad HTTP con timeout finito antes de crearla o cuando una actualización cambia la URL; solo se admiten HTTP/HTTPS y se rechazan credenciales embebidas.
- Normalizar la URL de manera conservadora antes de almacenarla y exigir que sea única entre todas las fuentes, activas o desactivadas.
- Persistir las fuentes con PostgreSQL 16, Prisma ORM 6 y Prisma Migrate, usando un modelo mínimo con identificador estable, URL, estado y marcas temporales.
- Relacionar el `sourceId` obligatorio de cada noticia con el identificador estable de `RssSource` mediante una FK real y restrictiva, sin borrado en cascada.
- Desactivar sin borrado físico y conservar tanto el registro de la fuente como las noticias previamente asociadas; la desactivación es reversible.
- Exponer a HU-01 y HU-02 una instantánea formada únicamente por el identificador estable y la URL de las fuentes activas elegibles.
- Mantener fuera de este slice una UI administrativa, la autenticación de las funcionalidades básicas de Sprint 1, la implementación de canales/medios, la periodicidad (HU-18), la captura (HU-01/HU-02) y la persistencia del contenido de noticias (HU-04). La gestión de canales/medios sigue siendo alcance obligatorio pendiente del producto.

## Capabilities

### New Capabilities

- `gestion-crud-rss`: API REST para la creación, consulta, listado, actualización, desactivación y reactivación de fuentes RSS; validación y unicidad de URL; persistencia relacional; y exposición de fuentes activas elegibles hacia HU-01/HU-02.

### Modified Capabilities

Ninguna.

## Impact

- Endpoints `POST /api/v1/sources`, `GET /api/v1/sources`, `GET /api/v1/sources/:id`, `PUT /api/v1/sources/:id`, `PATCH /api/v1/sources/:id` y `DELETE /api/v1/sources/:id`.
- Casos de uso y adaptadores para validar URLs, administrar fuentes y consultar las fuentes elegibles.
- Modelo `RssSource`, repositorio Prisma y migración de base de datos que deberán implementarse posteriormente.
- Contrato interno `SourceRegistryPort` (o nombre equivalente) consumido por HU-01 y HU-02.
- Pruebas unitarias, de integración con PostgreSQL y E2E de la API.
- La especificación global de HumWorld y la planificación original de HU-15 exigen gestionar canales/medios y las fuentes RSS contenidas en ellos. Issue #16 y este OpenSpec representan actualmente un slice refinado dedicado a fuentes RSS. La gestión de canales/medios sigue siendo alcance obligatorio pendiente: debe registrarse explícitamente en el backlog antes del cierre del proyecto y trazarse en Sprint Review, sin crear silenciosamente una entidad `Channel` en este ajuste.
