## Why

La Issue [#18 — HU-17 Gestión CRUD del diccionario](https://github.com/HumWorldProyecto/proyecto/issues/18) exige que un administrador pueda crear, consultar, actualizar y eliminar las entradas que utilizará HumWorld. `origin/main` todavía no contiene un límite `dictionary`, un modelo persistente ni un contrato REST para administrarlo. HU-05 necesitará además una lectura estable del diccionario sin depender del controller ni de Prisma.

## What Changes

- Incorporar `DictionaryEntry` con identificador UUID persistente, término o frase canónica, idioma `es` o `en` y peso entero entre `-5` y `+5`, ambos extremos incluidos.
- Persistir las entradas en PostgreSQL 16 mediante Prisma 6, con unicidad por `(language, term)` y restricciones reales para idioma, longitud y peso.
- Exponer `POST /api/v1/dictionary`, `GET /api/v1/dictionary`, `GET /api/v1/dictionary/:id`, `PATCH /api/v1/dictionary/:id` y `DELETE /api/v1/dictionary/:id` como JSON documentado mediante Swagger/OpenAPI.
- Normalizar términos de forma determinista antes de comparar y almacenar: Unicode NFKC, minúsculas según el idioma, puntuación/separadores convertidos en espacios, colapso de espacios y `trim`, conservando los diacríticos.
- Rechazar entradas vacías, términos normalizados de más de 200 caracteres, idiomas ajenos, pesos no enteros o fuera de rango, actualizaciones vacías e identificadores mal formados.
- Devolver `409 Conflict` para duplicados del mismo idioma, incluido el conflicto concurrente de la restricción única; permitir la misma forma canónica en idiomas distintos.
- Exportar un puerto de lectura inmutable por idioma para que HU-05 consuma un snapshot sin acoplarse al CRUD, HTTP o Prisma.
- Iniciar el diccionario vacío. No incorporar palabras, frases ni pesos editoriales sin otra revisión humana.
- Mantener el stack y las dependencias actuales. No introducir autenticación, roles o una UI administrativa que todavía no existen.

**Fuera de alcance:**

- Autenticación, autorización, gestión de usuarios o roles y auditoría de administradores.
- Seed editorial, importación masiva, versionado histórico, papelera, restauración, paginación, búsqueda o filtros REST.
- Análisis de sentimiento, persistencia del resultado en `News`, detección de idioma o nuevos endpoints de análisis.
- Cambios en captura RSS, scheduling, clasificación IPTC, HU-14, HU-16 o frontend.

## Capabilities

### New Capabilities

- `gestion-crud-diccionario-sentimiento`: gestión REST y persistente de entradas ponderadas, normalizadas y bilingües, más un puerto interno de lectura para análisis.

### Modified Capabilities

Ninguna.

## Impact

- Nuevo límite `backend/src/dictionary/**` con dominio, normalizador, puertos, servicio, controller, DTO y adaptador Prisma.
- `backend/prisma/schema.prisma` y una migración aditiva nueva, creada después de sincronizar las migraciones que ya estén en `main` al comenzar la implementación.
- `backend/src/app.module.ts` para componer `DictionaryModule` sin cambiar los módulos de captura o noticias.
- `docs/openapi.json` y pruebas unitarias, de integración con PostgreSQL 16 y E2E del CRUD.
- ADR-002, ADR-004 y ADR-005 se respetan; ADR-003 no se modifica. No se propone un ADR nuevo porque se añade un módulo previsto usando el stack ratificado.

El término “administrador” proviene de la historia, pero HumWorld no dispone de identidad ni autorización. Este cambio documenta esa limitación y mantiene las operaciones bajo el mismo perímetro no autenticado de la API actual. Convertir el rol narrativo en un control de acceso requiere una historia de seguridad separada y revisión humana; no se simulará mediante headers, claves o roles inventados.
