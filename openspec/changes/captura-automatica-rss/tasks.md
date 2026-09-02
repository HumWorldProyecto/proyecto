## 1. Límites abstractos de integración

- [x] 1.1 Definir límites sustituibles para obtener las fuentes registradas, recibir la periodicidad, realizar solicitudes RSS con finalización finita, interpretar feeds RSS y producir ítems hacia el flujo posterior.
- [x] 1.2 Mantener esos límites independientes de los contratos internos definitivos y de las reglas de gestión pertenecientes a HU-04, HU-15 y HU-18.

## 2. Orquestación de la captura

- [x] 2.1 Implementar el caso de uso que obtiene una instantánea de las fuentes RSS registradas al inicio de cada ejecución.
- [x] 2.2 Implementar la finalización sin solicitudes externas ni ítems de salida cuando la instantánea de fuentes está vacía.
- [x] 2.3 Implementar el recorrido secuencial de todas las fuentes incluidas en la instantánea.
- [x] 2.4 Aislar la descarga e interpretación de cada fuente para que su fallo no impida continuar con las siguientes.
- [x] 2.5 Entregar cero o más ítems RSS interpretados al límite abstracto de salida sin implementar persistencia, duplicados, datos mínimos ni actualización de noticias existentes.

## 3. Obtención e interpretación RSS

- [x] 3.1 Implementar un mecanismo finito de timeout o cancelación equivalente para cada intento de acceso a una fuente, sin fijar todavía su valor concreto.
- [x] 3.2 Implementar la interpretación de formatos RSS admitidos para producir cero o más ítems RSS.
- [x] 3.3 Rechazar de forma controlada Atom, HTML, RSS inválido y otros contenidos no RSS sin producir ítems para el límite de salida.
- [x] 3.4 Evitar solicitudes a las páginas enlazadas por los ítems RSS con el objetivo de extraer su contenido.
- [x] 3.5 Propagar los ítems interpretados únicamente al límite abstracto de salida y no modificar el registro administrado por HU-15.

## 4. Ejecución automática

- [x] 4.1 Integrar el disparo automático con la periodicidad proporcionada por HU-18 mediante un límite abstracto, sin implementar su gestión ni comprometer una tecnología concreta de scheduling.

## 5. Pruebas automatizadas

- [x] 5.1 Probar que la periodicidad suministrada determina el siguiente instante y que al alcanzarlo se inicia la ejecución automática.
- [x] 5.2 Probar que la ejecución utiliza una instantánea de las fuentes registradas, intenta cada una y excluye direcciones no registradas.
- [x] 5.3 Probar que los cambios de HU-15 durante una ejecución no alteran su instantánea y se reflejan en una ejecución posterior.
- [x] 5.4 Probar el recorrido secuencial de las fuentes de la instantánea.
- [x] 5.5 Probar que un RSS válido se interpreta y produce cero o más ítems para el límite abstracto de salida.
- [x] 5.6 Probar que Atom, HTML y RSS inválido no producen ítems RSS para el límite de salida.
- [x] 5.7 Probar que una fuente que no responde finaliza mediante timeout o cancelación y no impide procesar una fuente válida posterior.
- [x] 5.8 Probar que no se realizan solicitudes a las páginas web enlazadas por los ítems RSS para extraer contenido.
- [x] 5.9 Probar que la ausencia de fuentes evita solicitudes externas y la producción de ítems RSS.
- [x] 5.10 Ejecutar la suite de pruebas y las verificaciones estáticas del proyecto, y corregir únicamente defectos dentro del alcance de HU-01.
