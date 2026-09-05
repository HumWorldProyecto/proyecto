# Instrucciones permanentes para agentes de HumWorld

Antes de proponer, diseñar, implementar o revisar un cambio:

1. Leer `docs/architecture.md`.
2. Leer `openspec/config.yaml`.
3. Leer todos los artefactos OpenSpec vigentes del cambio.
4. Comprobar si existen contradicciones entre la historia de usuario, la especificación, el diseño, las tareas y la arquitectura.
5. Detenerse e informar para revisión humana ante cualquier contradicción; no resolverla modificando silenciosamente los requisitos o la arquitectura.

## Fuente de verdad

`docs/architecture.md` es la fuente de verdad arquitectónica. `openspec/config.yaml` aporta el contexto y las reglas permanentes para crear y aplicar cambios. Los artefactos de cada cambio OpenSpec definen su alcance y las decisiones específicas aprobadas.

Ante una diferencia, distinguir entre restricciones obligatorias, baseline tecnológico ratificado y decisiones del cambio. Ningún agente puede convertir una decisión tecnológica en requisito funcional ni alterar una restricción del proyecto.

## Arquitectura

- Mantener una aplicación web modular con separación clara entre presentación, API, servicios/lógica de negocio y repositorios/datos.
- El baseline de estilo ratificado es un monolito modular; no introducir microservicios sin el proceso formal de cambio arquitectónico.
- El frontend consume exclusivamente la API y nunca accede directamente al sistema gestor de datos.
- La API valida el contrato HTTP e invoca servicios; no contiene consultas directas a datos ni concentra la lógica de negocio.
- Los servicios implementan casos de uso y coordinan repositorios e integraciones mediante abstracciones.
- Los repositorios encapsulan persistencia y consultas; los servicios no dependen de SQL concreto.
- Las integraciones encapsulan RSS, HTTP y parseo.
- Los jobs disparan servicios para captura o purgado y no duplican lógica de negocio.

Los módulos conceptuales iniciales son `sources`, `capture`, `news`, `sentiment`, `dictionary`, `classification`, `analytics`, `purge` y `config`. No crear módulos, carpetas ni código que no sean necesarios para un cambio aprobado.

## Tecnologías ratificadas y frontend previsto

El Equipo 5 ha ratificado el siguiente baseline tecnológico:

- Backend actual: Node.js, TypeScript y NestJS.
- Persistencia: PostgreSQL, Prisma ORM y Prisma Migrate.
- Pruebas del backend: Jest.
- Frontend previsto, todavía no implementado: React, TypeScript y Vite.
- Captura RSS: `@nestjs/axios` para HTTP y `rss-parser` para interpretación.
- Scheduling: `@nestjs/schedule`.
- Timeout HTTP RSS: obtenido de una única configuración, con 10 segundos como valor técnico por defecto.
- Visualización prevista para el frontend: Leaflet y Chart.js.
- Pruebas previstas para el frontend: Vitest y React Testing Library.
- DevOps/calidad: Docker, Docker Compose, GitHub Actions y SonarQube. Docker y GitHub Actions son además restricciones obligatorias del proyecto; sus detalles siguen sujetos al diseño.

Estas tecnologías son decisiones del equipo, no requisitos del negocio ni imposiciones del enunciado. El nombre de la clave, la validación y el mecanismo de override del timeout pertenecen al `design.md` correspondiente; el valor de 10 segundos no debe trasladarse a `spec.md` como requisito funcional. No cambiar el stack, las librerías principales, la persistencia, el método de sentimiento, el scheduling, la infraestructura o el despliegue sin análisis de impacto y aprobación humana.

## Desarrollo con OpenSpec

- OpenSpec es la metodología SDD del proyecto.
- No implementar una historia de usuario sin una especificación OpenSpec revisada.
- Implementar únicamente el alcance y las tareas aprobadas del cambio.
- Mantener trazabilidad desde la historia y los escenarios hasta el diseño, las tareas y las pruebas.
- Reservar para `design.md` las decisiones específicas: endpoints, DTO, validaciones, entidades, clave y mecanismo de override del timeout, tratamiento de valores inválidos, reintentos, backoff, concurrencia, deduplicación, logging, índices, consultas, valores de configuración no ratificados y algoritmos concretos.
- No inferir para la HU-17 una relación con el motor de sentimiento que no haya sido aprobada funcionalmente.
- No marcar tareas completadas sin verificar la implementación y las pruebas.

## API

- Exponer una API REST versionada bajo `/api/v1`.
- Usar JSON cuando corresponda.
- Mantener OpenAPI/Swagger alineado con la implementación real.
- Tratar `/api/v1/sources`, `/api/v1/news`, `/api/v1/dictionary`, `/api/v1/config`, `/api/v1/sentiment` y `/api/v1/dashboards` como familias previstas, no como endpoints completos ya definidos.
- Derivar métodos, payloads, filtros, validaciones, DTO, códigos y rutas especiales de las historias y cambios OpenSpec aprobados.

## Calidad

- Toda historia debe incluir pruebas automatizadas.
- Aplicar pruebas unitarias, de integración y de aceptación según corresponda.
- Mantener una cobertura global mínima del 80 %.
- Explicar la estrategia de pruebas en el diseño y ejecutar las verificaciones aplicables antes de completar tareas.
- Usar herramientas del baseline solo mientras sigan ratificadas o expresamente aprobadas para el cambio.

## Seguridad básica

- No almacenar secretos, tokens, contraseñas ni credenciales en el repositorio.
- Utilizar configuración externa y mecanismos seguros de secretos cuando se diseñen entornos y workflows.
- No registrar datos sensibles ni incluirlos en ejemplos, pruebas o documentación.
- Validar entradas y respuestas en el límite de la API según los requisitos aprobados.

## Cambios arquitectónicos

Un cambio relevante debe seguir: propuesta, análisis de impacto, aprobación humana, ADR cuando corresponda, actualización de `docs/architecture.md`, actualización de `openspec/config.yaml`, actualización de estas instrucciones si afecta a los agentes y solo después su aplicación a nuevas especificaciones y desarrollo.

Codex, Copilot y otros agentes no pueden cambiar unilateralmente el estilo, el stack, las librerías principales, el sistema gestor de datos, el análisis de sentimiento, el scheduling, la infraestructura o el despliegue.

## Prohibiciones

- No generar funcionalidades no solicitadas ni ampliar silenciosamente el alcance.
- No hacer web scraping; la captura de noticias usa exclusivamente RSS.
- No saltarse capas.
- No acceder a la base de datos desde el frontend.
- No colocar consultas de datos directamente en componentes frontend.
- No acceder directamente a datos desde la API ni concentrar allí la lógica de negocio.
- No cambiar el stack sin aprobación humana.
- No sustituir unilateralmente `@nestjs/axios`, `rss-parser` ni `@nestjs/schedule` como tecnologías ratificadas para la captura.
- No introducir tecnologías o dependencias sin justificar su necesidad y obtener aprobación.
- No utilizar un parser RSS basado en expresiones regulares como implementación final.
- No utilizar un scheduler principal artesanal basado en un ciclo recursivo con `setTimeout`.
- No dispersar valores de timeout como números mágicos en distintos componentes.
- No implementar una historia de usuario sin OpenSpec revisado.
- No modificar especificaciones silenciosamente para adaptar el código.
- No inventar requisitos, endpoints, relaciones funcionales ni configuraciones.
- No marcar tareas completadas sin verificarlas.
- No almacenar secretos o credenciales.
