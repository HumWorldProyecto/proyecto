## Context

La motivación y el alcance funcional se describen en `proposal.md`; los comportamientos verificables están en `specs/actualizacion-manual-rss/spec.md`. El repositorio todavía no declara una pila tecnológica ni implementaciones previas.

HU-01 (`captura-automatica-rss`, en curso) ya aprobó tratar la descarga e interpretación de una fuente RSS como una unidad aislada, con finalización finita y rechazo de Atom/HTML/scraping, entregando cero o más ítems a un límite abstracto de salida. HU-02 dispara esa misma unidad una sola vez, para una sola fuente, a partir de una acción manual del administrador, en lugar de hacerlo automáticamente para todas las fuentes según la periodicidad de HU-18.

```text
Administrador
      |
      v
Disparador manual --> Caso de uso: actualizar una fuente
                              |
                 fuente indicada + conjunto de fuentes HU-15
                              |
                              v
              ¿fuente registrada? --no--> resultado de fallo (no registrada)
                              |
                             sí
                              v
        unidad de captura por fuente (compartida con HU-01)
                              |
                 timeout / interpretación RSS
                        /            \
                  éxito                fallo (sin respuesta, inválido)
                    |                        |
                    v                        v
      ítems -> límite abstracto      resultado de fallo (motivo)
         de salida (HU-04)                   |
                    |                        |
                    +----------> resultado de éxito/fallo
                                 -> límite abstracto de resultado
```

## Goals / Non-Goals

**Goals:**

- Reutilizar la unidad de captura por fuente ya aprobada en el diseño de HU-01 (aislamiento, timeout finito, interpretación RSS exclusiva) en lugar de duplicar esa lógica.
- Acotar la ejecución manual a la fuente indicada, validando su existencia antes de realizar cualquier solicitud externa.
- Exponer un resultado (éxito con ítems, o fallo con motivo) a través de un límite abstracto, independiente de la interfaz concreta que lo invoque.
- Mantener separadas las decisiones que corresponden a HU-15 (registro y validación administrativa de fuentes), HU-04 (persistencia) y a la interfaz de disparo todavía no elegida.

**Non-Goals:**

- Diseñar la interfaz concreta de disparo (endpoint HTTP, UI, CLI) o su formato de solicitud/respuesta.
- Diseñar el control de acceso o la verificación de que quien dispara la actualización es efectivamente un administrador.
- Definir la política de solapamiento entre esta actualización manual y otra ejecución concurrente (otra actualización manual, o el ciclo automático de HU-01) sobre la misma fuente.
- Definir persistencia, duplicados, datos mínimos o actualización de noticias existentes (HU-04).
- Rediseñar el CRUD o las validaciones administrativas de fuentes de HU-15.

## Decisions

Las decisiones aprobadas son elecciones técnicas de este cambio y no añaden requisitos funcionales a `spec.md`. Las decisiones pendientes se documentan como preguntas abiertas y no constituyen compromisos de implementación.

### Decisiones APROBADAS

#### Reutilizar la unidad de captura por fuente de HU-01

La actualización manual invocará la misma unidad aislada de descarga e interpretación por fuente diseñada para HU-01 (timeout finito, interpretación RSS exclusiva, sin Atom ni scraping), en lugar de implementar una ruta de captura independiente. Esto evita duplicar comportamiento ya aprobado y mantiene un único punto de verdad para las restricciones de formato y finalización finita.

#### Validar la existencia de la fuente antes de cualquier solicitud externa

El caso de uso comprobará, contra el conjunto de fuentes registradas que administra HU-15, que la fuente indicada existe antes de invocar la unidad de captura. Si no existe, el caso de uso finaliza comunicando un fallo sin realizar solicitudes externas.

#### Comunicar el resultado mediante un límite abstracto de resultado

El caso de uso expondrá el resultado de cada intento (éxito con los ítems producidos, o fallo con su motivo: fuente no registrada, sin respuesta, o contenido no interpretable) a través de un límite abstracto, sustituible por cualquier interfaz futura (API, UI, CLI) sin cambiar el comportamiento especificado.

#### Entregar los ítems producidos al mismo límite abstracto de salida que HU-01

Los ítems RSS interpretados en una actualización manual exitosa se entregan al mismo límite abstracto de salida hacia el flujo posterior que utiliza HU-01. HU-02 no define su contrato interno definitivo ni decide persistencia, identidad, duplicados o actualización de noticias existentes.

### Decisiones PENDIENTES

#### Interfaz concreta de disparo

No se ha decidido si la actualización manual se expondrá mediante un endpoint HTTP, una acción de UI, un comando u otro mecanismo. El caso de uso se diseña como un límite invocable independiente de esa elección.

#### Control de acceso

No se ha definido cómo se verifica que quien dispara la actualización manual es un administrador autorizado. Se asume, sin comprometerlo aquí, que existirá un mecanismo de autorización externo al caso de uso.

#### Política de solapamiento con otras ejecuciones

No se ha decidido qué ocurre si se dispara una actualización manual mientras existe otra ejecución en curso sobre la misma fuente, ya sea otra actualización manual o el ciclo automático de HU-01 (descartar, encolar, o permitir concurrencia).

#### Forma concreta del resultado comunicado

El límite abstracto de resultado está aprobado conceptualmente, pero su forma concreta (estructura de datos, campos exactos, códigos de motivo de fallo) no se ha definido y se resolverá junto con la interfaz de disparo.

## Risks / Trade-offs

- **[HU-02 depende de una unidad de captura por fuente que HU-01 aún no ha implementado]** → Coordinar el orden de implementación; HU-02 no puede completarse antes de que esa unidad exista y esté probada.
- **[La política de solapamiento no está resuelta]** → No incorporarla a las tareas hasta que exista aprobación humana; documentar el riesgo de comportamiento no especificado ante ejecuciones concurrentes.
- **[La forma concreta del resultado no está definida]** → Mantener el límite de resultado abstracto en el código hasta que se elija la interfaz de disparo, para evitar comprometer un contrato prematuro.
- **[El control de acceso queda fuera de este cambio]** → No se debe ofrecer el caso de uso a través de una interfaz real sin resolver antes la autorización.

## Migration Plan

No se requiere migración de datos. La estrategia de exposición (interfaz de disparo) se definirá cuando se resuelvan las decisiones pendientes, sin alterar el registro de fuentes ni los datos administrados por HU-15 o HU-04.
