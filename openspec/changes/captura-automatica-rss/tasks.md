## 1. Límites y configuración

- [ ] 1.1 Adaptar el límite de HU-15 para consumir exactamente el conjunto elegible que esa capacidad proporciona, sin duplicar en HU-01 sus reglas de estado o administración.
- [ ] 1.2 Adaptar el límite de HU-18 para representar tanto una periodicidad configurada como el estado sin configurar.
- [x] 1.3 Mantener límites sustituibles y separados para acceso HTTP, interpretación RSS y salida de ítems, independientes de las reglas internas de HU-04, HU-15 y HU-18.
- [ ] 1.4 Declarar y configurar `@nestjs/axios`, `rss-parser` y `@nestjs/schedule`, junto con una única configuración central `RSS_FETCH_TIMEOUT_MS`, validada y con valor técnico por defecto de `10_000` ms; no añadir una dependencia XML sin aprobación humana.

## 2. Orquestación de la captura

- [ ] 2.1 Integrar el caso de uso con el límite definitivo de HU-15 para obtener una instantánea del conjunto elegible al inicio de cada ejecución.
- [x] 2.2 Finalizar sin solicitudes externas ni ítems de salida cuando la instantánea obtenida está vacía.
- [x] 2.3 Recorrer secuencialmente todas las fuentes incluidas en la instantánea.
- [x] 2.4 Aislar la descarga y la interpretación de cada fuente para que su fallo no impida continuar con las siguientes.
- [x] 2.5 Entregar cero o más ítems interpretados mediante `CaptureOutputPort`, sin incorporar al orquestador reglas de persistencia o identidad.

## 3. Obtención e interpretación RSS

- [ ] 3.1 Sustituir el adaptador basado en `fetch` por `HttpService` de `@nestjs/axios`, usando exclusivamente el timeout central y traduciendo fallos de red, respuestas no satisfactorias y timeout a un fallo aislado de la fuente.
- [ ] 3.2 Sustituir el parser provisional basado en expresiones regulares por un adaptador de `rss-parser` que produzca los ítems del contrato de salida.
- [ ] 3.3 Implementar antes o junto al parser un guard RSS-only que rechace Atom, HTML, RSS inválido y otros contenidos no RSS; detenerse para revisión humana si requiere una dependencia XML adicional.
- [x] 3.4 Evitar solicitudes a las páginas enlazadas por los ítems RSS con el objetivo de extraer su contenido.
- [x] 3.5 Propagar los ítems únicamente al límite abstracto de salida y no modificar el registro administrado por HU-15.

## 4. Scheduling y composición

- [ ] 4.1 Implementar un guard en el disparador automático que mantenga como máximo una captura automática en curso, omita sin encolar las activaciones recibidas mientras esté ocupado y permita una activación normal posterior cuando el guard se haya liberado.
- [ ] 4.2 Acordar con HU-18 el mecanismo que notificará una primera configuración o un cambio de periodicidad para reprogramar el job dinámico.
- [ ] 4.3 Integrar `ScheduleModule` y `SchedulerRegistry`, o un mecanismo dinámico equivalente de `@nestjs/schedule`: registrar o reprogramar el job cuando exista periodicidad y no registrarlo cuando HU-18 entregue el estado sin configurar.
- [ ] 4.4 Importar `CaptureModule` en `AppModule` cuando existan proveedores reales compatibles para HU-15 y HU-18, conservando el binding de salida hacia HU-04 y verificando la resolución de dependencias.

## 5. Pruebas y verificación

- [ ] 5.1 Probar con el scheduler definitivo que una periodicidad configurada registra el job, determina la siguiente ejecución y se actualiza al recibir el mecanismo de cambio acordado con HU-18.
- [ ] 5.2 Probar que el estado sin periodicidad configurada no registra un job automático ni origina solicitudes externas.
- [ ] 5.3 Probar que se procesa exactamente el conjunto elegible proporcionado por HU-15 y se excluye cualquier fuente ajena a él.
- [x] 5.4 Probar que los cambios en las fuentes durante una ejecución no alteran su instantánea y solo se reflejan en una ejecución posterior.
- [x] 5.5 Probar el recorrido secuencial de las fuentes de la instantánea.
- [ ] 5.6 Probar con el adaptador definitivo de `rss-parser` que un RSS válido con cero, uno o varios ítems se interpreta correctamente.
- [ ] 5.7 Probar con el guard definitivo que Atom, HTML, RSS inválido y otros contenidos no RSS no producen ítems.
- [ ] 5.8 Probar el adaptador `HttpService` para respuesta satisfactoria, respuesta no satisfactoria, fallo de red y timeout, incluidos el valor por defecto, su override central y la continuación con una fuente posterior.
- [x] 5.9 Probar que no se solicitan las páginas web enlazadas por los ítems RSS para extraer contenido.
- [x] 5.10 Probar que una instantánea elegible vacía evita solicitudes externas y la producción de ítems.
- [ ] 5.11 Probar la composición NestJS real de `AppModule` y `CaptureModule` con los proveedores de HU-15, HU-18 y HU-04, sin dobles provisionales en el arranque.
- [ ] 5.12 Añadir un E2E del incremento completo con una respuesta RSS controlada: activación de captura, interpretación, entrega a HU-04, persistencia y consulta mediante `GET /api/v1/news`.
- [ ] 5.13 Probar que una activación automática recibida durante una captura en curso no inicia una segunda ejecución ni queda encolada, y que al liberar el guard —también tras una ruta de error— una activación normal posterior puede iniciar una nueva captura.
- [ ] 5.14 Ejecutar build, suite completa y cobertura después de la reparación, y verificar la conformidad con la arquitectura y los ADR vigentes.
