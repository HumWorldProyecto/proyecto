## Context

La motivación y el alcance funcional se describen en `proposal.md`; los comportamientos verificables están en `specs/captura-automatica-rss/spec.md`. La arquitectura permanente y los ADR ya están sincronizados: HumWorld utiliza Node.js 24 LTS, TypeScript 5 y NestJS 10.4 como baseline temporal de Sprint 1. `ADR-003-captura-rss-y-scheduling.md` ratifica `@nestjs/axios`, `rss-parser` y `@nestjs/schedule` para esta capacidad.

El backend ya contiene `CaptureModule`, sus límites, el orquestador y adaptadores provisionales. El acceso HTTP actual usa `fetch`, la interpretación usa expresiones regulares y el disparador usa `setTimeout`; esas implementaciones prueban parte de la orquestación, pero no cumplen todavía el stack ratificado ni todos los contratos actuales.

HU-15 ya define un límite de lectura que entrega una instantánea del conjunto elegible para captura. HU-01 consume ese conjunto sin redefinir su estado ni sus reglas administrativas. HU-18 ya cerró su contrato definitivo: `PeriodicityProviderPort` entrega `configured(minutes)` o `unconfigured`, y `PeriodicityChangeNotifierPort` permite suscribirse a cambios `PeriodicityChange { state, effectiveAt }` posteriores a la persistencia. Las implementaciones reales de esos límites aún no existen y los puertos provisionales de `capture` no expresan completamente los contratos; por ello `CaptureModule` todavía no está integrado en `AppModule`.

HU-01 produce cero o más ítems RSS interpretados mediante `CaptureOutputPort`. HU-04 ya implementa ese lado de salida dentro de `NewsModule`; la identidad y persistencia de noticias continúan perteneciendo al cambio de HU-04.

```text
PeriodicityProviderPort + PeriodicityChangeNotifierPort (HU-18)
             |
             v
 coordinador de scheduling
             |
             v
  job dinámico @nestjs/schedule
             |
             v
     Orquestador de captura
             |
  instantánea elegible (HU-15)
             |
             v
 HttpService + guard RSS-only + rss-parser
             |
   recorrido secuencial y aislado
             |
             v
 CaptureOutputPort -> persistencia HU-04
```

## Goals / Non-Goals

**Goals:**

- Separar el scheduling de la ejecución del caso de uso de captura.
- Consumir los contratos de HU-15 y HU-18 sin duplicar sus reglas de administración.
- Sincronizar el job futuro con el estado inicial y los cambios efectivos de periodicidad sin interrumpir una captura en curso.
- Aislar la descarga y la interpretación de cada fuente y garantizar una finalización finita.
- Aplicar el stack de captura ratificado y una única configuración central de timeout.
- Garantizar RSS-only antes o junto al parsing, aunque la biblioteca también sea capaz de interpretar Atom.
- Evitar ejecuciones automáticas solapadas y mantener como máximo una captura automática en curso.
- Producir ítems RSS hacia el límite abstracto de HU-04 y permitir pruebas deterministas del flujo.

**Non-Goals:**

- Diseñar el CRUD, la validación administrativa o la elegibilidad de fuentes de HU-15.
- Diseñar el catálogo, almacenamiento o edición de periodicidades de HU-18.
- Definir identidad, persistencia, duplicados o actualización de noticias de HU-04.
- Añadir Atom, scraping o descubrimiento de fuentes.
- Añadir reintentos, backoff u observabilidad avanzada en este incremento.
- Introducir concurrencia entre fuentes o encolar activaciones automáticas solapadas.

## Decisions

Las elecciones técnicas de esta sección no añaden requisitos funcionales a `spec.md`.

### Decisiones APROBADAS

#### Consumir una instantánea elegible por ejecución

Al comenzar cada ejecución, el orquestador obtendrá una instantánea del conjunto que HU-15 expone como elegible para captura. Si está vacía, finalizará sin realizar solicitudes externas ni producir ítems. Los cambios de HU-15 durante el recorrido solo se reflejarán en instantáneas posteriores.

HU-01 no vuelve a evaluar si una fuente está activa ni define qué significa elegible. La identidad estable de la fuente recibida se conserva al producir los ítems; no se utiliza su URL mutable como identidad de origen.

#### Procesar secuencialmente y aislar cada fuente

El primer incremento recorrerá la instantánea de forma secuencial. La descarga, el guard RSS-only y la interpretación correspondientes a una fuente se tratarán como una unidad aislada. Un fallo de transporte, timeout, contenido rechazado o error de parsing no impedirá intentar la siguiente fuente. Los ítems interpretados se entregarán después al límite abstracto; el aislamiento de fallos de persistencia por ítem pertenece a HU-04.

No se realizarán reintentos ni backoff. La secuencialidad es sustituible en un cambio futuro y no forma parte del contrato funcional.

#### Usar `@nestjs/axios` para el acceso HTTP

El adaptador HTTP utilizará `HttpService` de `@nestjs/axios`. Sustituirá el `fetch` provisional y traducirá respuestas no satisfactorias, fallos de red y timeout a un fallo controlado de la fuente actual, sin filtrar detalles de transporte al orquestador.

#### Centralizar un timeout configurable con valor por defecto de 10.000 ms

Existirá una única configuración `RSS_FETCH_TIMEOUT_MS`, obtenida a través de la configuración central de NestJS. Su valor técnico por defecto será `10_000` ms y deberá validarse como un entero positivo y finito antes de usarlo. El adaptador HTTP consumirá esa configuración; no mantendrá otro valor de timeout propio.

El valor de 10 segundos es una decisión técnica y deliberadamente no aparece como requisito observable en `spec.md`.

#### Usar `rss-parser` detrás de un guard RSS-only

`rss-parser` interpretará los documentos RSS admitidos y mapeará sus ítems al contrato de salida. Como la biblioteca también puede interpretar Atom, su aceptación por sí sola no demuestra el cumplimiento RSS-only.

Antes o como complemento del parser existirá un guard independiente que verifique que el documento recibido corresponde a RSS y rechace Atom, HTML y contenido no RSS. El guard no hará scraping ni seguirá los enlaces de los ítems. Si una implementación robusta del guard requiere una nueva dependencia XML, esa dependencia deberá someterse a aprobación humana antes de modificar código o dependencias.

#### Usar `@nestjs/schedule` para el job dinámico

El scheduling se integrará mediante `ScheduleModule` y `SchedulerRegistry`, o un mecanismo dinámico equivalente propio de `@nestjs/schedule`. El coordinador mantendrá como máximo un job automático futuro coherente con el estado vigente de HU-18.

HU-01 solo consume el estado y sus cambios; el catálogo, la persistencia y la acción administrativa que cambia la periodicidad permanecen en HU-18.

#### Consumir el contrato definitivo de periodicidad de HU-18

`CaptureModule` consumirá dos puertos ya aprobados por HU-18:

- `PeriodicityProviderPort`, para leer durante el arranque el estado vigente `configured(minutes)` o `unconfigured`;
- `PeriodicityChangeNotifierPort`, para registrar un listener de cambios posteriores. Cada `PeriodicityChange` contiene `state` y `effectiveAt`.

Durante el arranque, el coordinador:

1. registra el listener en `PeriodicityChangeNotifierPort` y conserva la función de desuscripción;
2. obtiene el estado vigente mediante `PeriodicityProviderPort`;
3. si recibe `configured(minutes)`, registra exactamente un job futuro con esa periodicidad;
4. si recibe `unconfigured`, garantiza que no exista ningún job automático;
5. completa la inicialización solo después de reconciliar ese estado, manteniendo la suscripción activa antes de que la aplicación quede disponible para tráfico externo.

Este orden evita una ventana sin listener entre la lectura inicial y la habilitación del tráfico. Cualquier entrega equivalente se absorbe mediante la idempotencia definida para el listener.

Ante una notificación:

- `configured(minutes)`: cancela o reemplaza únicamente el job futuro y calcula el siguiente instante mediante `effectiveAt + minutes`;
- `unconfigured`: retira el job futuro si existe y no crea uno nuevo.

El listener será idempotente: si recibe nuevamente un cambio equivalente —mismo `state` y mismo `effectiveAt`—, no creará jobs duplicados ni desplazará otra vez el siguiente instante. Una ausencia reiterada tolerará que no exista job. HU-18 no notifica cuando un PUT repite el mismo valor vigente, por lo que esa operación tampoco provoca reprogramación desde HU-01.

Reprogramar o retirar el job futuro nunca interrumpe una captura ya en ejecución. El mecanismo es in-process y no usa `@nestjs/event-emitter` ni otra dependencia de eventos.

#### Wiring unidireccional con CaptureConfigModule

`CaptureModule` importa `CaptureConfigModule` e inyecta los tokens de provider y notifier. `CaptureConfigModule` no importa ni inyecta `CaptureModule` o su scheduler. No se usa `forwardRef`. El coordinador conserva la función de desuscripción y la ejecuta al destruirse el módulo.

#### Omitir activaciones automáticas mientras otra captura está en curso

El disparador automático aplicará un guard de ejecución única antes de iniciar la captura. Si recibe una activación automática mientras otra captura automática continúa en curso, no iniciará una segunda ejecución concurrente, no encolará la activación y la omitirá.

El guard se liberará siempre al finalizar la captura en curso, también cuando termine por una ruta de error. Una activación automática posterior podrá iniciar normalmente una nueva captura cuando alcance su instante programado. Esta política se limita al disparador automático y no añade un requisito funcional a `spec.md`.

#### Mantener un límite abstracto hacia HU-04

Una fuente RSS válida produce cero o más ítems mediante `CaptureOutputPort`. `CaptureOrchestratorService` no conoce Prisma ni las reglas de identidad. `NewsModule` implementa el puerto del lado de HU-04 y `CaptureModule` conserva esa composición interna; la importación de `CaptureModule` en `AppModule` se realizará cuando existan proveedores reales compatibles para HU-15 y HU-18.

### Decisiones PENDIENTES

#### Técnica del guard si requiere una dependencia XML adicional

El resultado exigido del guard está aprobado, pero no se aprueba ninguna dependencia XML nueva en este cambio. Si las capacidades ya disponibles no permiten un guard robusto y verificable, la selección de esa dependencia queda pendiente de revisión humana.

## Risks / Trade-offs

- **[`rss-parser` también admite Atom]** → Mantener el guard RSS-only separado y cubrir RSS, Atom, HTML y contenido inválido con pruebas del adaptador definitivo.
- **[Una inspección superficial del documento puede producir falsos positivos]** → Exigir una validación robusta y detener la implementación para aprobación si hace falta una dependencia XML nueva.
- **[El procesamiento secuencial puede prolongar una ejecución]** → Aplicar el timeout por fuente y medir antes de proponer concurrencia.
- **[Una captura puede continuar cuando llega otra activación automática]** → Aplicar el guard aprobado, omitir esa activación sin encolarla y liberar siempre el guard al finalizar para admitir la siguiente activación normal.
- **[Una misma notificación podría entregarse más de una vez por un defecto de integración]** → Hacer idempotente el listener respecto de `state + effectiveAt` para no duplicar ni desplazar jobs.
- **[El provider de HU-15 y el provider/notifier de HU-18 aún no están implementados]** → Mantener `CaptureModule` fuera de `AppModule` hasta que la composición pueda resolverse sin dobles provisionales.
- **[Las dependencias ratificadas aún no están declaradas]** → Mantener pendientes las tareas de dependencias, adaptadores, integración y verificación final.

## Migration Plan

No se requiere migración de datos. La implementación sustituirá de forma conjunta los adaptadores provisionales de HTTP, parser y scheduling, incorporará la configuración central y el guard de solapamiento, adaptará el provider de HU-15 e integrará el provider/notifier definitivos de HU-18. La integración raíz se habilitará solo cuando todos sus providers sean resolubles y la suscripción quede activa antes del tráfico externo. El cambio deberá verificarse con pruebas unitarias, de integración, E2E y build antes de retirar los provisionales.

## Open Questions

- ¿Puede implementarse un guard RSS-only robusto con las capacidades ya aprobadas o debe proponerse una dependencia XML adicional para revisión humana?
