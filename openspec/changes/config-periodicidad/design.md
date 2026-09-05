## Context

HumWorld usa Node.js 24 LTS, TypeScript 5 y NestJS 10.4, con PostgreSQL 16, Prisma ORM 6 y Prisma Migrate. La API obligatoria es REST JSON bajo `/api/v1` y se documenta con Swagger/OpenAPI. HU-01 ya ratificó `@nestjs/schedule`, scheduling dinámico, ausencia de job cuando no hay periodicidad y una política de solapamiento que omite activaciones concurrentes sin encolarlas.

HU-18 es dueña del estado global de periodicidad. Debe persistirlo, exponerlo y avisar sus cambios; HU-01 es dueña de traducir ese estado a un job futuro.

```text
GET/PUT /api/v1/config
          |
          v
 servicio de periodicidad
      |             |
      v             v
CaptureConfig   notifier in-process
 PostgreSQL          |
      |              v
      +------> scheduler HU-01
```

## Goals / Non-Goals

**Goals:**

- Restringir la periodicidad a un catálogo cerrado y representar sin ambigüedad el estado sin configurar.
- Fijar la API REST de consulta/configuración y sus respuestas.
- Persistir una única configuración global mediante un singleton explícito.
- Proporcionar a HU-01 lectura inicial y notificaciones posteriores sin dependencia nueva ni ciclo entre módulos.
- Reprogramar solo el siguiente job futuro desde el momento efectivo de cada cambio.

**Non-Goals:**

- Permitir periodicidad por fuente, intervalos libres o expresiones cron proporcionadas por el cliente.
- Crear una UI administrativa o exigir autenticación para las funcionalidades básicas de Sprint 1.
- Interrumpir una captura ya en curso o redefinir la política de solapamiento de HU-01.
- Añadir `@nestjs/event-emitter`, mensajería distribuida o coordinación entre múltiples réplicas.
- Registrar quién realizó cada cambio; la auditoría administrativa queda para un incremento futuro.
- Añadir una operación para volver deliberadamente al estado sin configurar; `null` representa el estado inicial en este incremento.

## Decisions

### Decisiones APROBADAS

#### Catálogo cerrado y valor global

El dominio admite únicamente `15 | 30 | 60 | 360 | 720 | 1440` minutos, equivalentes a 15 min, 30 min, 1 h, 6 h, 12 h y 24 h. Un solo estado global rige todas las fuentes. No se usa intervalo libre, expresión cron pública ni valor funcional por defecto.

#### API REST JSON

`CaptureConfigController` expondrá:

| Operación | Endpoint | Respuesta |
| --- | --- | --- |
| Consultar | `GET /api/v1/config` | `200 OK` |
| Configurar/reemplazar | `PUT /api/v1/config` | `200 OK` |

La representación única de lectura y respuesta exitosa es:

```json
{ "capturePeriodicityMinutes": 30 }
```

Cuando no existe configuración:

```json
{ "capturePeriodicityMinutes": null }
```

El DTO de PUT exige `capturePeriodicityMinutes` numérico y perteneciente al catálogo. `null`, valores de otro tipo o valores ajenos al catálogo producen `400 Bad Request`, no cambian la persistencia y no emiten notificación. Un PUT válido devuelve la representación vigente. Si repite el mismo valor ya configurado, es idempotente: responde `200`, no actualiza `updatedAt`, no notifica y no desplaza el siguiente instante. Ambos endpoints usan JSON, se documentan con Swagger/OpenAPI y no requieren autenticación en Sprint 1.

#### Singleton persistente explícito

La persistencia usa PostgreSQL y Prisma. El estado objetivo es:

```text
CaptureConfig
- id: String fijo y estable ("global")
- capturePeriodicityMinutes: Int nullable
- updatedAt: DateTime
```

El repositorio encapsula el identificador fijo; ningún controller ni caso de uso recibe un ID. No se necesita seed: una fila ausente y una fila cuyo valor sea `null` se mapean al mismo estado de dominio `unconfigured`. El primer PUT válido realiza un `upsert`; un PUT posterior con un valor diferente actualiza esa misma fila. Si el valor coincide con el vigente, el servicio devuelve el estado actual sin escribir. Esta estrategia conserva el estado inicial sin inventar un valor, evita depender de datos precargados y mantiene la idempotencia del PUT.

Se requiere una migración de esquema para crear la tabla, aunque no existe información histórica que transformar.

#### Estado tipado hacia HU-01

Un número simple no representa la ausencia de configuración. El límite usa una unión discriminada:

```ts
type PeriodicityState =
  | Readonly<{ kind: 'configured'; minutes: 15 | 30 | 60 | 360 | 720 | 1440 }>
  | Readonly<{ kind: 'unconfigured' }>;

interface PeriodicityProviderPort {
  getCurrentState(): Promise<PeriodicityState>;
}
```

El adaptador lee el singleton y traduce tanto fila ausente como valor nulo a `unconfigured`.

#### Notificación in-process después de persistir

Se añade un puerto relacionado, no una dependencia externa:

```ts
type PeriodicityChange = Readonly<{
  state: PeriodicityState;
  effectiveAt: Date;
}>;

type PeriodicityChangeListener =
  (change: PeriodicityChange) => void | Promise<void>;

interface PeriodicityChangeNotifierPort {
  subscribe(listener: PeriodicityChangeListener): () => void;
}

interface PeriodicityChangePublisherPort {
  publish(change: PeriodicityChange): Promise<void>;
}
```

Un único mediador singleton implementa publicación y suscripción. El token de suscripción se exporta a HU-01; el token de publicación permanece interno a HU-18. Así el caso de uso puede emitir sin dar a los consumidores capacidad para publicar.

El caso de uso valida el valor y lo compara con el estado vigente para elegir una de dos ramas inequívocas.

Si el PUT repite el mismo valor ya configurado:

1. responde `200 OK` con el estado vigente;
2. no escribe ni cambia `updatedAt`;
3. no publica ninguna notificación;
4. no cancela, reemplaza ni reprograma el job futuro.

Si el PUT establece el primer valor o uno diferente:

1. valida el valor;
2. lo persiste;
3. obtiene `effectiveAt` desde el `updatedAt` confirmado por la persistencia;
4. publica `PeriodicityChange { state, effectiveAt }` después de persistir;
5. HU-01 reemplaza únicamente el job futuro y conserva cualquier captura en ejecución;
6. espera al listener de Sprint 1 antes de responder `200 OK`.

Si la validación o persistencia falla, no se notifica. No se incorpora `@nestjs/event-emitter`.

Para un estado válido, el listener aplica operaciones idempotentes sobre el registro del scheduler: tolera que no exista un job anterior y solo resuelve cuando el job futuro coincide con el estado recibido. Los defectos inesperados de infraestructura o programación no constituyen una respuesta funcional alternativa de este contrato.

#### Reprogramación y ejecución en curso

Al arrancar, HU-01 se suscribe a cambios y lee el estado mediante `PeriodicityProviderPort`. Si obtiene `unconfigured`, no registra job. Si obtiene `configured`, programa el siguiente instante.

Ante una notificación, el coordinador de scheduling de HU-01 cancela o reemplaza únicamente el job futuro registrado en `SchedulerRegistry` (o mecanismo equivalente) y calcula el siguiente instante como `effectiveAt + minutes`. No interrumpe una captura ya en ejecución. HU-18 no redefine la política de overlap: si llega una activación mientras otra sigue activa, se aplica la regla propiedad de HU-01, que la omite, no la ejecuta concurrentemente y no la encola.

#### Wiring NestJS sin dependencia circular

Un módulo funcional `CaptureConfigModule` —nombre distinto del `ConfigModule` técnico de `@nestjs/config`— contiene controller, caso de uso, repositorio y mediador de cambios. Exporta tokens para `PeriodicityProviderPort` y `PeriodicityChangeNotifierPort`; el token de `PeriodicityChangePublisherPort` solo se inyecta en el caso de uso interno.

`CaptureModule` importa `CaptureConfigModule`, registra un coordinador que se suscribe durante el arranque y elimina la suscripción al destruirse. `CaptureConfigModule` nunca importa ni inyecta `CaptureModule` o su scheduler: solo mantiene listeners del puerto neutral. Esta dirección única evita `forwardRef` y ciclos.

## Risks / Trade-offs

- **Una sola instancia:** el callback in-process es suficiente para el monolito de Sprint 1, pero no propaga cambios entre réplicas futuras. Una topología distribuida exigirá otro ADR y un mecanismo compartido.
- **Ventana persistir/notificar:** una caída del proceso después del commit y antes de notificar puede dejar temporalmente el job anterior. El siguiente arranque se recupera leyendo PostgreSQL; no se añade outbox para Sprint 1.
- **Sin operación de desconfiguración:** `null` permite representar el estado inicial, pero PUT no acepta `null`. Volver voluntariamente a `unconfigured` requiere un requisito futuro.
- **Sin autenticación básica:** es una decisión global de Sprint 1; el control administrativo deberá incorporarse antes de una exposición productiva.
- **Catálogo cerrado:** reduce flexibilidad deliberadamente y puede ampliarse mediante una evolución posterior del contrato.

## Migration Plan

1. Añadir `CaptureConfig` al schema Prisma con el identificador singleton y campo nullable.
2. Crear una migración de esquema nueva; no se requiere migración ni seed de datos históricos.
3. Implementar repositorio, caso de uso y API GET/PUT.
4. Implementar provider/notifier y el wiring unidireccional con HU-01.
5. Verificar estado ausente/configurado, orden persistir-notificar y reprogramación con pruebas unitarias, PostgreSQL real y E2E.

## Open Questions

No quedan decisiones funcionales o técnicas de HU-18 que bloqueen la implementación de Sprint 1. La auditoría de cambios y la coordinación entre múltiples réplicas son evoluciones futuras, no decisiones abiertas de este incremento.
