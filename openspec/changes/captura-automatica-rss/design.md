## Context

La motivación y el alcance funcional se describen en `proposal.md`; los comportamientos verificables están en `specs/captura-automatica-rss/spec.md`. El repositorio todavía no declara una pila tecnológica ni implementaciones previas para scheduling, fuentes RSS o almacenamiento, por lo que el diseño debe conservar separados esos puntos de integración.

HU-01 consume el conjunto de fuentes que administra HU-15 y la periodicidad que administra HU-18 mediante límites abstractos, sin definir sus contratos internos definitivos. Su resultado son cero o más ítems RSS interpretados entregados a un límite abstracto de salida; la persistencia y sus políticas pertenecen a HU-04.

```text
Periodicidad HU-18
        |
        v
Disparador automático --> Orquestador de captura
                               |
                 instantánea de fuentes HU-15
                               |
                               v
                captura secuencial + parser RSS
                               |
                               v
             límite abstracto de salida de ítems
                               |
                               v
                flujo posterior / persistencia HU-04
```

## Goals / Non-Goals

**Goals:**

- Separar el mecanismo de scheduling de la ejecución de una captura.
- Aislar la descarga y el parseo de cada fuente para que sus fallos sean independientes.
- Garantizar que una fuente que no responde tenga una finalización finita mediante timeout o cancelación equivalente.
- Producir ítems RSS interpretados hacia un límite abstracto y permitir pruebas deterministas de los comportamientos aprobados.
- Distinguir las decisiones técnicas aprobadas de las que aún requieren revisión humana.

**Non-Goals:**

- Diseñar el CRUD o las validaciones administrativas de HU-15.
- Diseñar la gestión de periodicidad de HU-18.
- Definir persistencia, metadatos, duplicados o datos mínimos de noticias de HU-04.
- Añadir Atom, scraping, descubrimiento de fuentes, alertas de usuario o desactivación automática de fuentes.

## Decisions

Las decisiones aprobadas son elecciones técnicas de este cambio y no añaden requisitos funcionales a `spec.md`. Las decisiones pendientes se documentan como alternativas o preguntas abiertas y no constituyen compromisos de implementación.

### Decisiones APROBADAS

#### Usar una instantánea de fuentes por ejecución

Al comenzar cada ejecución, el orquestador obtendrá una instantánea del conjunto de fuentes registradas que proporciona HU-15. Si la instantánea está vacía, finalizará antes de realizar solicitudes externas. Los cambios realizados mediante HU-15 durante una ejecución se reflejarán en ejecuciones posteriores.

Esta elección evita que el conjunto procesado cambie durante el recorrido y no redefine cómo HU-15 administra o valida las fuentes.

#### Procesar secuencialmente las fuentes en el primer incremento

La primera implementación recorrerá secuencialmente la instantánea. Esta opción simplifica el incremento inicial, facilita el aislamiento y la verificación de fallos y evita introducir concurrencia sin una necesidad demostrada.

La secuencialidad es una decisión de diseño sustituible y no forma parte del contrato funcional.

#### Aislar cada fuente y garantizar una finalización finita

La descarga e interpretación de cada fuente se tratarán como una unidad aislada. Cada intento dispondrá de un timeout o mecanismo de cancelación equivalente que garantice una finalización finita, sin fijar todavía un valor concreto.

Los fallos de transporte o interpretación de una fuente se contendrán en esa unidad para permitir continuar con las siguientes fuentes de la instantánea.

#### Limitar la interpretación a RSS y no realizar scraping

El componente de interpretación aceptará únicamente formatos RSS admitidos y rechazará Atom, HTML y otros contenidos no RSS. La captura utilizará solo la información disponible en el feed y no seguirá enlaces a páginas web para extraer su contenido.

#### Producir ítems RSS mediante un límite abstracto de salida

Una captura válida interpreta el feed y produce cero o más ítems RSS para un límite abstracto de salida hacia el flujo posterior. HU-01 no define el contrato interno definitivo de HU-04 ni decide persistencia, identidad, duplicados, campos mínimos o actualización de noticias existentes.

### Decisiones PENDIENTES

#### Mecanismo concreto de scheduling

HU-01 utilizará la periodicidad proporcionada por HU-18, pero no se ha seleccionado APScheduler, cron, un scheduler de plataforma, un scheduler en proceso ni otra tecnología. La elección permanece abierta.

#### Biblioteca concreta para RSS

La implementación necesitará una tecnología capaz de interpretar los formatos RSS admitidos y rechazar Atom y contenido web. No se ha seleccionado ninguna librería concreta.

#### Valor concreto del timeout

El mecanismo de finalización finita está aprobado, pero su duración y configuración concreta permanecen abiertas.

#### Reintentos y backoff

No se ha aprobado realizar reintentos automáticos. Las alternativas siguen siendo no reintentar o aplicar reintentos acotados para fallos transitorios. El backoff solo deberá evaluarse si posteriormente se aprueban reintentos.

#### Política de ejecuciones solapadas

No se ha decidido si una activación que coincide con una ejecución en curso debe descartarse, ponerse en cola o ejecutarse concurrentemente. Ninguna de estas alternativas forma parte todavía del diseño aprobado.

#### Logging técnico

El logging puede considerarse para diagnóstico técnico, pero no se han aprobado formato, destino, plataforma, esquema ni métricas. No constituye una funcionalidad de usuario.

## Risks / Trade-offs

- **[El procesamiento secuencial puede prolongar una ejecución]** → Aplicar la finalización finita aprobada por fuente y medir duraciones antes de proponer concurrencia.
- **[La política de reintentos todavía no está resuelta]** → No incorporarla a las tareas hasta que exista aprobación humana.
- **[La política de solapamientos todavía no está resuelta]** → Resolverla antes de comprometer comportamiento para activaciones simultáneas.
- **[Una librería RSS puede interpretar Atom o HTML de manera tolerante]** → Exigir pruebas de contrato que verifiquen el rechazo de formatos no admitidos.
- **[Los contratos internos de HU-04, HU-15 y HU-18 aún no están definidos]** → Mantener límites abstractos y evitar decidir reglas pertenecientes a esas historias.

## Migration Plan

No se requiere migración de datos. La estrategia concreta de activación y rollback se definirá cuando se seleccione el mecanismo de scheduling, sin alterar el registro de fuentes, la periodicidad ni los datos administrados por las historias relacionadas.

## Open Questions

- ¿Qué mecanismo concreto de scheduling se utilizará?
- ¿Qué librería concreta interpretará RSS?
- ¿Qué valor tendrá el timeout o la cancelación equivalente?
- ¿Se aprobarán reintentos automáticos y, en tal caso, qué política y backoff utilizarán?
- ¿Qué política se aplicará a las ejecuciones solapadas?
- ¿Se incorporará logging técnico y, en tal caso, con qué formato y destino?
