## Context

La arquitectura vigente de HumWorld define un monolito modular sobre Node.js 24 LTS, TypeScript 5 y NestJS 10.4, con PostgreSQL 16, Prisma ORM 6, Prisma Migrate y una API REST JSON bajo `/api/v1` documentada con Swagger/OpenAPI. HU-01 ya aprobó la captura sobre una instantánea de fuentes elegibles; HU-04 ya usa `News.sourceId` como referencia estable de procedencia.

HU-15 administra fuentes RSS directamente. La especificación global de HumWorld y la planificación original de HU-15 también exigen gestionar canales/medios que agrupan fuentes. Issue #16 y este OpenSpec representan un slice refinado dedicado a fuentes RSS. Este diseño no introduce silenciosamente una entidad `Channel`: la capacidad de canales/medios continúa siendo alcance obligatorio pendiente y debe quedar trazada en el backlog y en Sprint Review.

```text
POST/GET/PUT/PATCH/DELETE /api/v1/sources
                    |
                    v
        casos de uso de fuentes
          |                  |
          v                  v
 repositorio RssSource   validador HTTP
          |
          v
 PostgreSQL 16 / Prisma 6
          |
          v
SourceRegistryPort.getEligibleSources()
          |
          v
      HU-01 / HU-02
```

## Goals / Non-Goals

**Goals:**

- Fijar la API REST mínima de gestión de fuentes y sus respuestas observables.
- Persistir un modelo `RssSource` mínimo con URL única y eliminación lógica.
- Normalizar y validar URLs sin confundir accesibilidad HTTP con validez RSS.
- Proporcionar a HU-01/HU-02 una instantánea tipada de fuentes activas elegibles.
- Preservar la trazabilidad entre una noticia y su fuente.

**Non-Goals:**

- Crear una UI administrativa o exigir autenticación para las funcionalidades básicas de Sprint 1.
- Crear en este slice entidades de canal/medio cuyo contrato todavía no está refinado, sin eliminar esa capacidad obligatoria del alcance global; tampoco se añaden nombres descriptivos, auditoría o historial.
- Interpretar el contenido RSS durante el alta o la actualización de una fuente.
- Rediseñar la captura, la periodicidad o el almacenamiento del contenido de noticias.
- Añadir borrado físico.

## Decisions

### Decisiones APROBADAS

#### API REST versionada, JSON y documentada

La interfaz de entrada de Sprint 1 ya no está abierta. `SourcesController` expondrá:

| Operación | Endpoint | Éxito |
| --- | --- | --- |
| Crear | `POST /api/v1/sources` | `201 Created` |
| Listar | `GET /api/v1/sources` | `200 OK` |
| Consultar detalle | `GET /api/v1/sources/:id` | `200 OK` |
| Reemplazar datos editables | `PUT /api/v1/sources/:id` | `200 OK` |
| Actualizar parcialmente/estado | `PATCH /api/v1/sources/:id` | `200 OK` |
| Desactivar | `DELETE /api/v1/sources/:id` | `204 No Content` |

Los DTO iniciales son deliberadamente mínimos:

- `POST`: `{ "url": string }`. Una fuente nueva queda activa.
- `PUT`: `{ "url": string }`. En Sprint 1 la URL es el único dato reemplazable completo; el estado se administra mediante `PATCH` o `DELETE`.
- `PATCH`: `{ "url"?: string, "active"?: boolean }`, con al menos una propiedad. `active: true` reactiva y `active: false` desactiva.
- Respuesta: `id`, `url`, `active`, `createdAt` y `updatedAt`. Las fechas se serializan como cadenas ISO 8601.
- Listado: sin filtro devuelve todas; `?active=true` y `?active=false` seleccionan un estado.

Los DTO o filtros mal formados —incluido un valor de `active` distinto de `true` o `false`—, las URLs inválidas y las URLs inaccesibles producen `400 Bad Request`; un identificador inexistente produce `404 Not Found`; una URL duplicada produce `409 Conflict`. Si DELETE recibe el identificador de una fuente ya desactivada, mantiene ese estado y devuelve `204` sin cuerpo. Todas las operaciones con cuerpo usan JSON, aparecen en Swagger/OpenAPI y no requieren autenticación en Sprint 1.

#### Persistencia relacional y modelo mínimo

La persistencia usa PostgreSQL 16, Prisma ORM 6 y Prisma Migrate. El estado objetivo mínimo es:

```text
RssSource
- id: String, UUID estable
- url: String, obligatoria y única
- active: Boolean, true por defecto
- createdAt: DateTime
- updatedAt: DateTime
```

No se añade `name` ni otro campo que este slice de fuentes no necesite. Tampoco se añade `Channel` aquí porque su contrato todavía requiere refinamiento y trazabilidad propia de backlog, no porque la capacidad sea opcional. La restricción única de base de datos se aplica sobre la representación normalizada almacenada y cubre fuentes activas y desactivadas. La comprobación de servicio mejora el error, pero la restricción de PostgreSQL es la defensa frente a carreras concurrentes; el adaptador traduce su conflicto a `409`.

#### Normalización conservadora de URL

Antes de validar, comparar o persistir una URL:

1. se aplica `trim`;
2. se analiza mediante la clase estándar `URL` de Node.js;
3. se admiten únicamente los protocolos `http:` y `https:`;
4. se rechaza la URL si `username` o `password` contienen credenciales embebidas;
5. se utiliza la representación serializada por `URL.toString()`;
6. se conservan path y query;
7. no se eliminan, reordenan ni reinterpretan parámetros arbitrariamente y no se aplica canonicalización avanzada.

La unicidad compara esa representación almacenada. Esto cubre las normalizaciones propias del parser estándar sin inventar reglas de producto adicionales.

#### Accesibilidad HTTP separada de la validación RSS

Un adaptador basado en `@nestjs/axios` y `HttpService` realiza una solicitud HTTP `GET` y exige una respuesta final satisfactoria `2xx` dentro de un timeout finito. Reutiliza el timeout central configurable aprobado para las solicitudes RSS, con `10_000 ms` por defecto, sin añadir otra dependencia HTTP.

La comprobación se aplica al crear y cuando `PUT` o `PATCH` cambia la URL. No se repite al cambiar solo el estado. El cuerpo no se interpreta como RSS: que una dirección sea accesible no prueba que sea un feed válido; el guard RSS-only sigue perteneciendo a HU-01.

#### Protección SSRF y transporte HTTP fijado

La URL inicial y cada destino de redirección se tratan como entrada no confiable. Antes de resolver o conectar se aplica `trim`, se analiza la URL mediante la clase estándar `URL` de Node.js y se exige un hostname. Solo se admiten los protocolos `http:` y `https:` y se rechazan `username` o `password`, `localhost`, `localhost.` y cualquier subdominio de `.localhost`.

No se añade una restricción funcional a los puertos 80 y 443. Una URL HTTP/HTTPS puede utilizar cualquier puerto explícito que sea sintácticamente válido; con independencia del puerto, su hostname o IP y todos sus redirects deben superar la misma política SSRF.

Si el hostname es una IP literal, se clasifica directamente. En otro caso se obtiene una única instantánea mediante `dns.promises.lookup(hostname, { all: true, order: "verbatim" })`. La resolución debe producir al menos una dirección y todas las direcciones de la instantánea deben ser admisibles. Si una sola es bloqueada, se rechaza el destino completo: no se filtra la dirección prohibida para continuar con otra pública.

La clasificación usa una política conservadora y versionada que admite únicamente destinos públicos ordinarios y excluye direcciones especiales o no globales. En IPv4 se bloquean como mínimo:

```text
0.0.0.0/8
10.0.0.0/8
100.64.0.0/10
127.0.0.0/8
169.254.0.0/16
172.16.0.0/12
192.0.0.0/24
192.0.2.0/24
192.88.99.0/24
192.168.0.0/16
198.18.0.0/15
198.51.100.0/24
203.0.113.0/24
224.0.0.0/4
240.0.0.0/4
```

En IPv6 solo se admite unicast global ordinario conforme a la política conservadora documentada. Se rechazan `::`, `::1`, las direcciones IPv4-mapped IPv6, `fc00::/7`, `fe80::/10`, multicast, documentación, transición o túneles y los demás destinos especiales no admitidos. La tabla de rangos es responsabilidad del proyecto y deberá poder revisarse cuando cambien los registros públicos aplicables.

Resolver, validar y permitir después que Axios resuelva normalmente no es suficiente porque conserva una ventana de DNS rebinding entre la comprobación y la conexión. Para cada salto se crea un `http.Agent` o `https.Agent` efímero, con `keepAlive: false`, cuyo `lookup` no consulta nuevamente DNS y solo entrega una dirección elegida determinísticamente de la instantánea previamente validada. Sprint 1 no implementa fallback complejo entre múltiples IP. La URL conserva su hostname original para preservar `Host`, SNI y la validación del certificado TLS.

Cada petición usa `proxy: false` y `maxRedirects: 0`. El Agent se destruye al terminar. La respuesta se obtiene preferentemente como stream y se cierra después de inspeccionar el estado y los headers necesarios, sin descargar ni procesar un body que no forma parte de la comprobación de accesibilidad.

Los redirects se siguen manualmente únicamente para `301`, `302`, `303`, `307` y `308`, con un máximo de tres. Cada `Location` se resuelve respecto de la URL vigente y repite desde el inicio la validación de URL, hostname, credenciales, DNS, IP y Agent. Se detectan ciclos. Un redirect inválido, sin `Location`, cíclico, bloqueado o que exceda el máximo se considera inaccesible.

`RSS_FETCH_TIMEOUT_MS` constituye un único deadline para la resolución inicial, la petición HTTP y todos los redirects; no se reinician `10_000 ms` en cada salto. Su obtención, valor predeterminado de `10_000 ms` y validación como entero positivo y finito se extraen a un provider neutral compartido. `SourcesModule` y, posteriormente, HU-01 reutilizan ese provider sin introducir una dependencia `SourcesModule -> CaptureModule` ni la dependencia inversa.

Los fallos de entrada, red, SSRF, redirect, timeout o respuesta final no `2xx` producen `400 Bad Request` y no crean ni modifican persistencia. Una URL duplicada continúa produciendo `409 Conflict`, un identificador inexistente `404 Not Found` y un error interno inesperado `500 Internal Server Error`. Las respuestas no exponen direcciones internas ni detalles del resolver.

#### Eliminación lógica y preservación

`DELETE` y `PATCH active=false` cambian el estado a desactivado. `PATCH active=true` reactiva. Ninguna de estas operaciones borra la fila ni modifica noticias ya persistidas. Como HU-01 toma una instantánea al comenzar cada ejecución, un cambio de estado afecta únicamente a instantáneas posteriores y no altera una captura en curso.

La semántica exacta de `DELETE /api/v1/sources/:id` es:

- fuente existente activa: cambia a desactivada y responde `204 No Content`;
- fuente existente ya desactivada: permanece desactivada y responde `204 No Content`;
- identificador inexistente: responde `404 Not Found`.

En ninguno de los tres casos se ejecuta un borrado físico.

#### Contrato definitivo de fuentes elegibles

HU-15 decide qué fuentes son elegibles: exclusivamente las activas. HU-01/HU-02 deciden cuándo obtener la instantánea.

```ts
type EligibleSource = Readonly<{
  id: string;
  url: string;
}>;

interface SourceRegistryPort {
  getEligibleSources(): Promise<readonly EligibleSource[]>;
}
```

La implementación consulta únicamente fuentes activas y devuelve una instantánea nueva con `id` y `url`; no expone entidades Prisma ni referencias mutables.

#### Wiring por módulos y capas

Un `SourcesModule` contiene controller, casos de uso, puerto de repositorio, adaptador Prisma y validador HTTP. Exporta un token asociado a `SourceRegistryPort`. Los módulos de captura importan `SourcesModule` y consumen ese token; HU-15 no importa los módulos de captura. Así se respeta API → servicios → repositorios y se evita una dependencia circular.

#### Relación obligatoria de News con RssSource

Se aprueba **A: una FK real y obligatoria `News.sourceId -> RssSource.id`**, con `Restrict`/`NoAction` ante borrado. `RssSource.id` será un `String` UUID estable y `News.sourceId` continuará siendo obligatorio; no se mantendrá como un escalar sin integridad referencial.

No existe producción, la desactivación nunca borra la fuente y el E2E de Sprint 1 necesita una procedencia demostrable. La FK garantiza que cada `News.sourceId` refiera a una fuente estable, evita cascadas y protege contra un borrado físico accidental. El schema Prisma, `RssSource`, la FK, la migración coordinada con `dedupeKey NOT NULL` de HU-04 y los fixtures que crean primero su fuente fueron implementados y verificados en el Paso 3B. Permanecen pendientes el repositorio de fuentes, los casos de uso, la API y el provider.

## Risks / Trade-offs

- **Verificación HTTP y SSRF:** la política aprobada bloquea destinos no públicos o especiales, rechaza cualquier instantánea DNS que contenga una dirección prohibida, fija cada conexión a una IP validada, desactiva proxies y redirects implícitos y revalida manualmente hasta tres redirects bajo un deadline total. La tabla de rangos puede requerir revisión futura; `dns.lookup` no es completamente cancelable; una ruta o NAT local solo se cierra totalmente mediante controles egress; y un servidor público hostil aún puede consumir recursos. Los puertos públicos no predeterminados permanecen permitidos y pueden ampliar el sondeo de servicios HTTP públicos. La misma protección deberá reutilizarse en HU-01 durante cada captura, no únicamente al registrar o actualizar una fuente.
- **Disponibilidad cambiante:** una fuente accesible al registrarse puede fallar después. HU-01 aísla los fallos por fuente durante cada captura.
- **Latencia de validación:** la creación o actualización espera la verificación remota; el timeout común garantiza finalización finita.
- **Relación con News:** la FK fortalece integridad y trazabilidad; el Paso 3B ya ordenó la migración y los fixtures para que la fuente exista antes de guardar noticias.
- **Canales/medios:** la especificación global y la planificación original de HU-15 exigen esta gestión, mientras Issue #16/OpenSpec cubre ahora un slice de fuentes. No se crea `Channel` aquí, pero la capacidad no es opcional: debe registrarse explícitamente en backlog antes del cierre del proyecto y mostrarse como separación de alcance en Sprint Review.
- **HU-02:** su cambio pendiente aún habla de cualquier fuente registrada y no aclara el comportamiento manual sobre una fuente desactivada. Debe reconciliarse posteriormente sin modificarlo en este paso.

## Migration Plan

El Paso 3B completó `RssSource`, su restricción única, la FK obligatoria `News.sourceId -> RssSource.id` con `Restrict`/`NoAction`, la migración coordinada con `dedupeKey NOT NULL` y la adaptación de fixtures. También verificó la migración desde una base PostgreSQL vacía.

Permanecen pendientes implementar el repositorio de fuentes, los casos de uso, la API y el provider; después deberán ejecutarse sus pruebas unitarias, de integración y E2E.

No existe producción que migrar y no se realizará borrado físico de fuentes.

## Open Questions

- ¿Con qué HU/Issue se registrará en backlog la gestión obligatoria pendiente de canales/medios antes del cierre del proyecto y cómo se trazará la separación en Sprint Review?
