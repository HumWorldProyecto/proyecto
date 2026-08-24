## 1. Límites abstractos de integración

- [ ] 1.1 Definir el límite invocable para iniciar manualmente la actualización de una fuente indicada por su identificador.
- [ ] 1.2 Definir el límite abstracto de resultado que comunica éxito (con los ítems producidos) o fallo (con su motivo).
- [ ] 1.3 Reutilizar, sin duplicar, el límite de obtención del conjunto de fuentes registradas y la unidad de captura por fuente ya definidos para HU-01.
- [ ] 1.4 Mantener esos límites independientes de los contratos internos definitivos y de las reglas de gestión pertenecientes a HU-04 y HU-15.

## 2. Caso de uso de actualización manual

- [ ] 2.1 Implementar la validación de que la fuente indicada existe en el conjunto de fuentes registradas antes de realizar cualquier solicitud externa.
- [ ] 2.2 Implementar la comunicación de un resultado de fallo por fuente no registrada cuando la validación falla, sin solicitudes externas.
- [ ] 2.3 Implementar la invocación de la unidad de captura por fuente únicamente sobre la fuente validada.
- [ ] 2.4 Garantizar que no se realiza ninguna solicitud a otras fuentes configuradas durante una actualización manual.

## 3. Resultado de la actualización

- [ ] 3.1 Implementar la comunicación de un resultado de éxito con los ítems RSS interpretados producidos, cuando la captura se completa correctamente.
- [ ] 3.2 Implementar la comunicación de un resultado de fallo con su motivo (sin respuesta, contenido no interpretable) cuando la captura no se completa.
- [ ] 3.3 Entregar los ítems RSS interpretados únicamente al límite abstracto de salida compartido con HU-01, sin implementar persistencia, duplicados, datos mínimos ni actualización de noticias existentes.

## 4. Pruebas automatizadas

- [ ] 4.1 Probar que iniciar manualmente la actualización de una fuente registrada intenta la captura sobre esa fuente.
- [ ] 4.2 Probar que, con varias fuentes registradas, la actualización manual de una de ellas no genera solicitudes a las demás.
- [ ] 4.3 Probar que indicar una fuente no registrada rechaza la actualización sin solicitudes externas y comunica un resultado de fallo.
- [ ] 4.4 Probar que un RSS válido se interpreta y produce cero o más ítems, comunicados como resultado de éxito.
- [ ] 4.5 Probar que Atom, HTML y RSS inválido no producen ítems y se comunican como resultado de fallo.
- [ ] 4.6 Probar que una fuente que no responde finaliza en tiempo finito y comunica un resultado de fallo.
- [ ] 4.7 Probar que no se realizan solicitudes a páginas web enlazadas por los ítems RSS para extraer contenido.
- [ ] 4.8 Ejecutar la suite de pruebas y las verificaciones estáticas del proyecto, y corregir únicamente defectos dentro del alcance de HU-02.
