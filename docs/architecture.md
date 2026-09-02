# Arquitectura de HumWorld

## 1. Objetivo

Este documento es la fuente de verdad de la arquitectura base de HumWorld. Establece las restricciones obligatorias del proyecto, el baseline tecnológico confirmado por el Equipo 5 y los límites de las decisiones que deben resolverse en cada cambio OpenSpec.

La arquitectura distingue expresamente tres niveles de decisión:

1. **Restricciones obligatorias:** reglas estables derivadas del proyecto HumWorld que todos los cambios deben respetar.
2. **Baseline tecnológico confirmado:** decisión ratificada por el Equipo 5 para iniciar la Práctica 6 (P6).
3. **Decisiones por cambio:** detalles que deben justificarse en el `design.md` del cambio OpenSpec correspondiente y no se congelan globalmente en este documento.

Una tecnología del baseline confirmado no constituye por sí misma un requisito del negocio ni una imposición del enunciado: sigue siendo una elección propia del Equipo 5.

## 2. Estado de la arquitectura

> Esta arquitectura constituye el baseline tecnológico confirmado por el Equipo 5 para P6. Las restricciones derivadas del proyecto son obligatorias. Las elecciones tecnológicas de la sección 4 ya han sido ratificadas por el equipo; cualquier cambio posterior relevante deberá seguir el proceso de la sección 19 y documentarse mediante ADR.

El documento no autoriza por sí mismo la implementación de historias de usuario. Toda implementación requiere una especificación OpenSpec revisada y aprobada. Las decisiones confirmadas y el único punto que permanece deliberadamente abierto se enumeran en la sección 20.

## 3. Restricciones obligatorias

Las siguientes reglas provienen del proyecto HumWorld y son obligatorias:

- El producto debe ser una aplicación web con arquitectura modular.
- Debe existir una separación clara entre presentación, lógica de negocio y datos/persistencia.
- La presentación no puede acceder directamente a la base de datos.
- La API debe delegar los casos de uso en servicios; no puede acceder directamente a datos ni concentrar toda la lógica de negocio.
- La interfaz de aplicación debe ser una API REST versionada bajo `/api/v1`.
- El intercambio de información debe realizarse mediante JSON cuando corresponda.
- La API debe documentarse mediante OpenAPI/Swagger y esa documentación debe reflejar la implementación real.
- La captura de noticias debe usar exclusivamente fuentes RSS. No se permite web scraping.
- La persistencia debe utilizar un sistema gestor de datos.
- Docker debe proporcionar un entorno reproducible.
- GitHub Actions debe utilizarse para integración continua.
- Deben existir pruebas automatizadas unitarias, de integración y de aceptación según corresponda.
- La cobertura global mínima exigida por el proyecto es del 80 %.
- OpenSpec es la metodología de desarrollo dirigido por especificaciones (SDD) del proyecto.
- No se puede implementar una historia de usuario sin una especificación OpenSpec revisada.
- Las decisiones arquitectónicas relevantes deben documentarse mediante registros de decisión arquitectónica (ADR).
- No se pueden introducir tecnologías o dependencias nuevas sin decisión humana.
- No se deben almacenar secretos ni credenciales en el repositorio.

## 4. Baseline tecnológico confirmado

Todo el contenido de esta sección ha sido **revisado y confirmado por el Equipo 5** como baseline tecnológico de P6, salvo los elementos que también aparecen como restricciones obligatorias en la sección 3 (que son requisitos del proyecto, no elecciones del equipo). El enunciado no obliga a utilizar NestJS, React, PostgreSQL, Prisma ni ninguna otra elección de esta sección; siguen siendo decisiones propias del Equipo 5, no impuestas por el negocio.

| Área | Elección confirmada | Estado |
| --- | --- | --- |
| Backend | Node.js, TypeScript y NestJS | Confirmado |
| Frontend | React, TypeScript y Vite | Confirmado |
| Persistencia | PostgreSQL, Prisma ORM y Prisma Migrate para migraciones | Confirmado |
| Captura RSS | Axios (`@nestjs/axios`) como cliente HTTP y una librería de parseo RSS (p. ej. `rss-parser`) | Confirmado |
| Scheduling | `@nestjs/schedule` | Confirmado |
| Visualización | Leaflet para mapas y Chart.js para gráficos | Confirmado |
| Pruebas | Jest para backend; Vitest y React Testing Library para frontend | Confirmado |
| DevOps y calidad | Docker, Docker Compose para el entorno local, GitHub Actions y SonarQube | Confirmado; Docker y GitHub Actions son además restricciones obligatorias |

La decisión humana sobre este baseline ya fue tomada por el Equipo 5. Queda pendiente registrar el ADR formal correspondiente en `docs/adr/`, dejando constancia de contexto, alternativas, decisión y consecuencias, tal como exige la sección 19. Cualquier sustitución posterior de estas elecciones deberá seguir igualmente ese proceso:

```text
propuesta
  -> análisis de impacto
  -> decisión humana
  -> ADR
  -> actualización de docs/architecture.md
  -> actualización del contexto para agentes de IA
  -> implementación
```

## 5. Estilo arquitectónico

El estilo confirmado como baseline de P6 es un monolito modular organizado por responsabilidades y capas. Permite comenzar con un único sistema desplegable, manteniendo límites internos que reduzcan el acoplamiento y faciliten la evolución.

No se utilizarán microservicios en el baseline actual. Adoptarlos en el futuro sería un cambio arquitectónico relevante y requeriría análisis de impacto, aprobación humana y ADR.

Las dependencias deben apuntar hacia la lógica de negocio: presentación y API consumen casos de uso; los servicios coordinan abstracciones de persistencia e integraciones; los detalles externos no deben gobernar las reglas centrales.

## 6. Capas y responsabilidades

### Presentación / frontend

- Proporciona la interfaz web, la administración y los dashboards.
- Consume exclusivamente la API REST.
- No accede directamente a PostgreSQL ni a otro sistema de persistencia.
- No contiene reglas centrales de negocio ni consultas directas de datos.

### API

- Expone endpoints REST bajo la versión vigente.
- Valida peticiones y respuestas y gestiona los códigos HTTP.
- Invoca servicios o casos de uso.
- No contiene consultas directas a la base de datos.
- No concentra la lógica de negocio.

### Servicios / lógica de negocio

- Implementan y coordinan los casos de uso aprobados.
- Albergan las reglas para captura RSS, gestión de noticias, análisis de sentimiento, clasificación, consultas y agregaciones, caducidad y purgado.
- Coordinan repositorios e integraciones mediante contratos claros.
- No deben depender de SQL ni del cliente de Prisma de forma directa fuera de la capa de repositorios.

### Repositorios / datos

- Encapsulan el acceso a datos, la persistencia y las consultas.
- Ocultan a los servicios los detalles concretos del sistema gestor de datos y del ORM utilizado.
- No contienen reglas de presentación ni orquestación de casos de uso.

### Integraciones

- Encapsulan las fuentes RSS, el cliente HTTP, el parser RSS y cualquier futura integración externa aprobada.
- Traducen los detalles externos a contratos consumibles por los servicios.
- No pueden introducirse integraciones futuras sin aprobación humana.

### Jobs / procesos programados

- Disparan casos de uso para captura automática y purgado automático.
- Invocan servicios de negocio existentes.
- No duplican ni contienen la lógica de negocio de esos servicios.

## 7. Módulos funcionales

Los límites conceptuales iniciales son:

| Módulo | Responsabilidad conceptual |
| --- | --- |
| `sources` | Gestión de fuentes RSS |
| `capture` | Captura automática y manual |
| `news` | Noticias y sus metadatos |
| `sentiment` | Cálculo del humor mediante una abstracción sustituible |
| `dictionary` | Diccionario administrable |
| `classification` | Clasificación con IPTC Media Topics |
| `analytics` | Consultas y agregaciones |
| `purge` | Caducidad y purgado |
| `config` | Configuración general |

Estos nombres describen límites funcionales, no obligan a crear ahora módulos, carpetas o componentes de NestJS para todos ellos. Cada cambio OpenSpec debe identificar cuáles de estos módulos afecta.

El análisis de sentimiento debe exponerse mediante una abstracción conceptual sustituible. No se fija todavía si la implementación utilizará diccionario, NLP, LLM u otro método. La decisión deberá justificarse mediante OpenSpec y, cuando sea arquitectónicamente relevante, un ADR. La HU-17 no implica automáticamente una relación con el motor de sentimiento que no haya sido aprobada funcionalmente.

## 8. Flujo general

```text
Frontend
   |
   | REST / JSON
   v
API
   |
   v
Servicios / lógica de negocio
   |
   v
Repositorios
   |
   v
Sistema gestor de datos
```

Las integraciones RSS se conectan a los servicios mediante contratos encapsulados. Los procesos programados activan servicios y no saltan directamente a repositorios o integraciones para reproducir reglas de negocio.

## 9. API REST

La regla general de versionado es `/api/v1`. Se prevén inicialmente las siguientes familias de recursos:

- `/api/v1/sources`
- `/api/v1/news`
- `/api/v1/dictionary`
- `/api/v1/config`
- `/api/v1/sentiment`
- `/api/v1/dashboards`

Esta lista no define todos los endpoints concretos. Métodos HTTP, rutas especiales, payloads, DTO, filtros, validaciones y códigos de respuesta deben derivarse de las historias de usuario y del cambio OpenSpec correspondiente. OpenAPI/Swagger debe mantenerse sincronizado con la implementación real (en NestJS, mediante `@nestjs/swagger`).

## 10. Persistencia

El uso de un sistema gestor de datos es obligatorio. PostgreSQL, Prisma ORM y Prisma Migrate forman parte del baseline tecnológico confirmado por el Equipo 5, no de los requisitos impuestos por el proyecto.

Todo acceso persistente debe quedar encapsulado en repositorios. La API y el frontend no deben ejecutar consultas de datos, y los servicios deben depender de abstracciones de repositorio en lugar de invocar directamente al cliente de Prisma o SQL concreto. El modelo exacto de entidades (`schema.prisma`), las migraciones, los índices y las consultas pertenecen al diseño del cambio que los necesite.

## 11. Integraciones RSS

RSS es la única fuente permitida para capturar noticias; el web scraping está prohibido. La integración debe encapsular el acceso HTTP y el parseo, normalizar los resultados y ofrecerlos a los servicios mediante contratos claros.

Axios (integrado vía `@nestjs/axios`) y una librería de parseo RSS (por ejemplo, `rss-parser`) son elecciones confirmadas por el Equipo 5. El timeout, los reintentos, el backoff, la concurrencia, el algoritmo de deduplicación y otras políticas operativas deben decidirse en el `design.md` del cambio correspondiente.

## 12. Procesos programados

La captura automática y el purgado automático deben programarse como disparadores de casos de uso. Un job decide cuándo invocar un servicio; el servicio conserva las reglas y coordina repositorios e integraciones.

`@nestjs/schedule` es la elección confirmada del baseline para el scheduling inicial. La estrategia definitiva de scheduling, los solapamientos, la concurrencia, la recuperación ante fallos y los valores de configuración requieren una decisión por cambio y, si alteran la arquitectura, aprobación humana y ADR.

## 13. Frontend y visualización

El frontend implementará la interfaz web, la administración y los dashboards consumiendo exclusivamente `/api/v1`. React, TypeScript y Vite son elecciones confirmadas por el Equipo 5.

Leaflet y Chart.js son también elecciones confirmadas para mapas y gráficos. La composición exacta de cada visualización, sus interacciones y la transformación específica de datos deben definirse a partir de la historia de usuario y del `design.md` aplicable. Las reglas centrales de negocio no deben trasladarse a componentes del frontend.

## 14. Estrategia de pruebas

Cada historia de usuario debe incluir pruebas automatizadas trazables a sus escenarios. Deben utilizarse pruebas unitarias, de integración y de aceptación según corresponda, con una cobertura global mínima obligatoria del 80 %.

Como baseline confirmado, el backend utiliza Jest y el frontend Vitest con React Testing Library. La obligación de probar y el umbral de cobertura del 80 % son restricciones del proyecto, no elecciones del equipo. Cada `design.md` debe explicar los niveles de prueba, los casos relevantes y la forma de verificar la implementación.

## 15. DevOps y calidad

Docker debe proporcionar un entorno reproducible y GitHub Actions debe ejecutar la integración continua. Docker Compose se confirma para el entorno local y SonarQube para análisis de calidad.

Los workflows deberán, cuando exista código aprobado, verificar como mínimo las pruebas aplicables y el umbral global de cobertura. Los detalles de imágenes, servicios, despliegue, ramas y puertas de calidad deben definirse y aprobarse antes de implementarse. Ningún secreto o credencial puede almacenarse en el repositorio; deben utilizarse mecanismos seguros de configuración y secretos del entorno.

## 16. Organización orientativa del repositorio

La siguiente es una estructura objetivo, no una orden de crear inmediatamente todos los directorios o archivos:

```text
backend/
  src/
    controllers/
    services/
    repositories/
    dto/
    integrations/
    jobs/
    common/
    main.ts
  prisma/
    schema.prisma
    migrations/
  test/

frontend/
  src/
    components/
    pages/
    services/
    types/
  tests/

docs/
  architecture.md
  adr/
  uml/
  requisitos/
  planificacion/

openspec/

.github/
  copilot-instructions.md
  workflows/

docker-compose.yml
.env.example
README.md
```

Los cambios OpenSpec crearán únicamente la estructura necesaria para su alcance aprobado.

## 17. Dependencias no permitidas

No se permiten las siguientes dependencias o acoplamientos:

- Frontend hacia la base de datos, controladores de persistencia o consultas concretas.
- API hacia SQL, el cliente de Prisma, repositorios concretos o acceso directo a datos; debe pasar por servicios.
- Servicios hacia SQL o Prisma Client de forma directa, o detalles internos de componentes de presentación.
- Jobs que dupliquen lógica de negocio o accedan a datos saltándose los servicios.
- Web scraping para obtener noticias.
- Dependencias, tecnologías, integraciones o servicios externos nuevos sin justificación y aprobación humana.
- Secretos o credenciales incluidos en código, configuración versionada, ejemplos o documentación.
- Funcionalidad que no corresponda a una historia de usuario y un cambio OpenSpec revisados.

## 18. Decisiones que pertenecen a `design.md`

Los siguientes detalles no se congelan globalmente y deben justificarse, cuando correspondan, en el `design.md` del cambio OpenSpec:

- Timeout concreto de RSS, número de reintentos y política de backoff.
- Ejecuciones solapadas, concurrencia y comportamiento operativo de jobs.
- Endpoints concretos de una historia de usuario, métodos, payloads, DTO, filtros y códigos.
- Validaciones funcionales específicas.
- Estructura exacta de una entidad en `schema.prisma`.
- Algoritmo exacto de deduplicación.
- Política detallada de logging.
- Índices concretos de base de datos y consultas.
- Algoritmo o modelo definitivo de sentimiento.
- Detalles internos de una visualización.
- Valores concretos de configuración.

Estas decisiones deben derivarse de requisitos aprobados, ser observables o verificables cuando proceda y no inventar necesidades ausentes de las historias de usuario.

## 19. Gestión de cambios arquitectónicos

Cualquier cambio relevante del estilo arquitectónico, backend, frontend, sistema gestor de datos, librerías principales, procesamiento de sentimiento, estrategia de scheduling, infraestructura o despliegue debe seguir este proceso:

1. Identificar el motivo y la necesidad aprobada.
2. Analizar el impacto funcional, técnico, de datos, pruebas, operación y seguridad.
3. Obtener aprobación humana del Equipo 5.
4. Registrar un ADR cuando corresponda.
5. Actualizar `docs/architecture.md`.
6. Actualizar `openspec/config.yaml`.
7. Actualizar `.github/copilot-instructions.md` si afecta a los agentes.
8. Aplicar la decisión a las nuevas especificaciones y, solo entonces, al desarrollo aprobado.

Codex, Copilot y otros agentes no pueden cambiar unilateralmente la arquitectura ni convertir una propuesta futura en una obligación sin pasar por este proceso.

## 20. Decisiones confirmadas y puntos abiertos

El Equipo 5 ha revisado y **confirmado** las siguientes decisiones del baseline tecnológico (sección 4):

- El monolito modular como estilo inicial, con exclusión de microservicios en esta etapa.
- Node.js, TypeScript y NestJS para backend.
- React, TypeScript y Vite para frontend.
- PostgreSQL, Prisma ORM y Prisma Migrate para persistencia y migraciones.
- Axios y una librería de parseo RSS (p. ej. `rss-parser`) para captura RSS.
- `@nestjs/schedule` para scheduling.
- Leaflet y Chart.js para visualización.
- Jest, Vitest y React Testing Library como herramientas de prueba.
- Docker Compose para entorno local y SonarQube para calidad.

Permanece **deliberadamente abierto**:

- El método definitivo de análisis de sentimiento.

Docker, GitHub Actions, RSS exclusivo, la prohibición de scraping, la API REST `/api/v1`, OpenAPI/Swagger, OpenSpec, las pruebas y la cobertura global mínima del 80 % son restricciones del proyecto, no decisiones del equipo, y por tanto no forman parte de este proceso de confirmación.

Corresponde registrar en `docs/adr/` el o los ADR formales de esta decisión, dejando constancia de contexto, alternativas, decisión y consecuencias, conforme al proceso de la sección 19.

## 21. Referencias a ADR

Los ADR se almacenarán en `docs/adr/` y registrarán decisiones arquitectónicas relevantes junto con su contexto, alternativas, decisión, consecuencias y estado. El Equipo 5 ya ha ratificado el baseline de la sección 4; queda pendiente generar los ADR formales correspondientes que dejen constancia escrita de esa ratificación.

Cada ADR futuro deberá enlazarse desde esta sección o desde un índice dentro de `docs/adr/`. Si un ADR sustituye una decisión anterior, este documento y el contexto permanente de los agentes deberán actualizarse en el mismo cambio de gobierno arquitectónico.