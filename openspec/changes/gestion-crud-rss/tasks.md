## 1. Modelo de datos y validación de URL

- [ ] 1.1 Definir la entidad fuente RSS con identificador, URL y estado (activa/desactivada), según el modelo mínimo aprobado en `design.md`.
- [ ] 1.2 Implementar la validación del formato sintáctico de la URL.
- [ ] 1.3 Implementar la verificación de accesibilidad HTTP de la URL con finalización finita (timeout).
- [ ] 1.4 Implementar la verificación de unicidad de la URL contra el conjunto completo de fuentes registradas, activas y desactivadas.

## 2. Caso de uso de creación

- [ ] 2.1 Implementar la creación de una fuente aplicando validación sintáctica, accesibilidad HTTP y unicidad antes de registrarla.
- [ ] 2.2 Rechazar la creación cuando la URL es sintácticamente inválida, sin registrar la fuente.
- [ ] 2.3 Rechazar la creación cuando la URL no responde a una solicitud HTTP, sin registrar la fuente.
- [ ] 2.4 Rechazar la creación cuando la URL ya pertenece a otra fuente registrada.
- [ ] 2.5 Registrar la fuente como activa cuando todas las validaciones se cumplen.

## 3. Caso de uso de consulta

- [ ] 3.1 Implementar la consulta de una fuente registrada por su identificador, incluyendo su estado.
- [ ] 3.2 Rechazar la consulta cuando el identificador no corresponde a ninguna fuente registrada.
- [ ] 3.3 Implementar el listado del conjunto completo de fuentes registradas, activas y desactivadas, con su estado.

## 4. Caso de uso de actualización

- [ ] 4.1 Implementar la actualización de los datos de una fuente existente.
- [ ] 4.2 Rechazar la actualización cuando el identificador no corresponde a ninguna fuente registrada.
- [ ] 4.3 Revalidar la URL (sintaxis, accesibilidad HTTP y unicidad) cuando la actualización la modifica, reutilizando las validaciones del caso de uso de creación.
- [ ] 4.4 Rechazar la actualización cuando la nueva URL no cumple alguna validación, conservando la URL original de la fuente.

## 5. Caso de uso de desactivación y reactivación

- [ ] 5.1 Implementar la desactivación de una fuente activa mediante la transición de su estado a desactivada.
- [ ] 5.2 Rechazar la desactivación cuando el identificador no corresponde a ninguna fuente registrada.
- [ ] 5.3 Implementar la reactivación de una fuente desactivada mediante la transición de su estado a activa.
- [ ] 5.4 Garantizar que desactivar o reactivar una fuente no elimina ni modifica su registro ni las noticias ya almacenadas asociadas a ella.

## 6. Contrato del límite abstracto de fuentes activas

- [ ] 6.1 Definir el límite abstracto de solo lectura que entrega una instantánea del conjunto de fuentes registradas activas para HU-01 y HU-02.
- [ ] 6.2 Excluir del límite abstracto las fuentes desactivadas.
- [ ] 6.3 Mantener el límite abstracto independiente de la interfaz de entrada concreta (API/UI) y de la autorización, todavía no definidas.

## 7. Pruebas automatizadas

- [ ] 7.1 Probar la creación con URL sintácticamente válida y accesible.
- [ ] 7.2 Probar el rechazo de creación por URL sintácticamente inválida.
- [ ] 7.3 Probar el rechazo de creación por URL inaccesible.
- [ ] 7.4 Probar el rechazo de creación y de actualización por URL duplicada.
- [ ] 7.5 Probar la consulta de una fuente existente y el rechazo por identificador inexistente.
- [ ] 7.6 Probar el listado de fuentes activas e inactivas junto con su estado.
- [ ] 7.7 Probar la actualización exitosa de una fuente existente y el rechazo por identificador inexistente.
- [ ] 7.8 Probar la revalidación de la URL al actualizarla, tanto el caso exitoso como el rechazo.
- [ ] 7.9 Probar la desactivación de una fuente activa y el rechazo por identificador inexistente.
- [ ] 7.10 Probar la reactivación de una fuente desactivada.
- [ ] 7.11 Probar que las noticias ya almacenadas asociadas a una fuente permanecen sin cambios tras desactivarla.
- [ ] 7.12 Probar que el límite abstracto de fuentes activas excluye las fuentes desactivadas.
- [ ] 7.13 Ejecutar la suite de pruebas y las verificaciones estáticas del proyecto, y corregir únicamente defectos dentro del alcance de HU-15.
