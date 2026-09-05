## 1. Límites y configuración

- [x] 1.1 Adaptar el límite de HU-15 para consumir exactamente el conjunto elegible que esa capacidad proporciona, sin duplicar en HU-01 sus reglas de estado o administración.
- [x] 1.2 Adaptar el consumidor de periodicidad de HU-01 para usar `PeriodicityProviderPort` de HU-18 y consumir el estado tipado `configured(minutes) | unconfigured`, sin reducirlo a un número simple.
- [x] 1.3 Mantener límites sustituibles y separados para acceso HTTP, interpretación RSS y salida de ítems, independientes de las reglas internas de HU-04, HU-15 y HU-18.
- [x] 1.4 Declarar y configurar `@nestjs/axios`, `rss-parser` y `@nestjs/schedule`, junto con una única configuración central `RSS_FETCH_TIMEOUT_MS`, validada y con valor técnico por defecto de `10_000` ms; no añadir una dependencia XML sin aprobación humana.

## 2. Orquestación de la captura

- [x] 2.1 Integrar el caso de uso con el límite definitivo de HU-15 para obtener una instantánea del conjunto elegible al inicio de cada ejecución.
- [x] 2.2 Finalizar sin solicitudes externas ni ítems de salida cuando la instantánea obtenida está vacía.
- [x] 2.3 Recorrer secuencialmente todas las fuentes incluidas en la instantánea.
- [x] 2.4 Aislar la descarga y la interpretación de cada fuente para que su fallo no impida continuar con las siguientes.
- [x] 2.5 Entregar cero o más ítems interpretados mediante `CaptureOutputPort`, sin incorporar al orquestador reglas de persistencia o identidad.

## 3. Obtención e interpretación RSS

- [x] 3.1 Sustituir el adaptador basado en `fetch` por `HttpService` de `@nestjs/axios`, usando exclusivamente el timeout central y traduciendo fallos de red, respuestas no satisfactorias y timeout a un fallo aislado de la fuente.
- [x] 3.2 Sustituir el parser provisional basado en expresiones regulares por un adaptador de `rss-parser` que produzca los ítems del contrato de salida.
- [x] 3.3 Implementar antes o junto al parser un guard RSS-only que rechace Atom, HTML, RSS inválido y otros contenidos no RSS; detenerse para revisión humana si requiere una dependencia XML adicional.
- [x] 3.4 Evitar solicitudes a las páginas enlazadas por los ítems RSS con el objetivo de extraer su contenido.
- [x] 3.5 Propagar los ítems únicamente al límite abstracto de salida y no modificar el registro administrado por HU-15.

## 4. Scheduling y composición

- [x] 4.1 Implementar un guard en el disparador automático que mantenga como máximo una captura automática en curso, omita sin encolar las activaciones recibidas mientras esté ocupado y permita una activación normal posterior cuando el guard se haya liberado.
- [x] 4.2 Integrar `PeriodicityChangeNotifierPort`: registrar el listener durante el arranque, dejar la suscripción activa antes del tráfico externo, conservar la función de desuscripción y ejecutarla al destruir el módulo.
- [x] 4.3 Integrar `ScheduleModule`/`SchedulerRegistry` con `PeriodicityProviderPort`: leer el estado inicial, registrar exactamente un job futuro para `configured(minutes)` y no registrar ninguno para `unconfigured`.
- [x] 4.4 Procesar `PeriodicityChange { state, effectiveAt }`: para `configured` reemplazar solo el job futuro y calcular `effectiveAt + minutes`; para `unconfigured` retirar el job futuro sin crear otro; nunca interrumpir la captura en curso.
- [x] 4.5 Hacer idempotente el listener para que un cambio equivalente no cree jobs duplicados ni desplace nuevamente el siguiente instante.
- [x] 4.6 Importar `CaptureModule` en `AppModule` cuando existan providers reales de HU-15/HU-18, conservando el binding hacia HU-04 y el wiring `CaptureModule -> CaptureConfigModule`, sin importación inversa ni `forwardRef`.

## 5. Pruebas y verificación

- [x] 5.1 Probar el arranque con `configured(minutes)`: registra exactamente un job automático futuro con la periodicidad vigente.
- [x] 5.2 Probar el arranque con `unconfigured`: no registra job automático ni origina solicitudes externas.
- [x] 5.3 Probar una notificación `configured(minutes)`: crea o reemplaza únicamente el job futuro.
- [x] 5.4 Probar una notificación `unconfigured`: retira el job futuro existente y no crea uno nuevo.
- [x] 5.5 Probar que un cambio de periodicidad calcula el siguiente instante mediante `effectiveAt + minutes`, no desde la última captura ni desde la recepción del callback.
- [x] 5.6 Probar la integración con HU-18 cuando PUT repite el valor vigente: no recibe notificación, no reprograma y conserva el siguiente instante.
- [x] 5.7 Probar que recibir nuevamente el mismo `state + effectiveAt` no crea jobs duplicados ni desplaza el siguiente instante.
- [x] 5.8 Probar que destruir el módulo ejecuta la desuscripción y que una notificación posterior no modifica el scheduler.
- [x] 5.9 Probar que una notificación recibida durante una captura en curso no la interrumpe y solo afecta al job futuro.
- [x] 5.10 Probar que se procesa exactamente el conjunto elegible proporcionado por HU-15 y se excluye cualquier fuente ajena a él.
- [x] 5.11 Probar que los cambios en las fuentes durante una ejecución no alteran su instantánea y solo se reflejan en una ejecución posterior.
- [x] 5.12 Probar el recorrido secuencial de las fuentes de la instantánea.
- [x] 5.13 Probar con el adaptador definitivo de `rss-parser` que un RSS válido con cero, uno o varios ítems se interpreta correctamente.
- [x] 5.14 Probar con el guard definitivo que Atom, HTML, RSS inválido y otros contenidos no RSS no producen ítems.
- [x] 5.15 Probar el adaptador `HttpService` para respuesta satisfactoria, respuesta no satisfactoria, fallo de red y timeout, incluidos el valor por defecto, su override central y la continuación con una fuente posterior.
- [x] 5.16 Probar que no se solicitan las páginas web enlazadas por los ítems RSS para extraer contenido.
- [x] 5.17 Probar que una instantánea elegible vacía evita solicitudes externas y la producción de ítems.
- [x] 5.18 Probar la composición NestJS real de `AppModule` y `CaptureModule` con los providers de HU-15, HU-18 y HU-04, sin dobles provisionales en el arranque ni ciclos entre módulos.
- [x] 5.19 Añadir un E2E del incremento completo con una respuesta RSS controlada: activación de captura, interpretación, entrega a HU-04, persistencia y consulta mediante `GET /api/v1/news`.
- [x] 5.20 Probar que una activación automática recibida durante una captura en curso no inicia una segunda ejecución ni queda encolada, y que al liberar el guard —también tras una ruta de error— una activación normal posterior puede iniciar una nueva captura.
- [x] 5.21 Ejecutar build, suite completa y cobertura después de la reparación, y verificar la conformidad con la arquitectura y los ADR vigentes.
