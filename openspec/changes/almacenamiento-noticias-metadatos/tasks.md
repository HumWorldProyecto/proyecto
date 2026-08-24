## 1. Puerto de entrada

- [ ] 1.1 Definir el puerto de entrada sustituible que HU-01 y HU-02 invocan para entregar ítems RSS interpretados, reemplazando el límite abstracto de salida que ambas historias dejaron pendiente.
- [ ] 1.2 Mantener ese puerto independiente de la tecnología de almacenamiento concreta.

## 2. Identidad y validación de ítems

- [ ] 2.1 Implementar la resolución de identidad de una noticia a partir del `guid` del ítem, o del enlace cuando no haya `guid`.
- [ ] 2.2 Implementar el descarte de ítems sin título o sin enlace antes de intentar almacenarlos.

## 3. Almacenamiento de noticias y metadatos

- [ ] 3.1 Implementar el almacenamiento de una noticia junto con los metadatos proporcionados por su ítem RSS interpretado.
- [ ] 3.2 Implementar la verificación atómica de existencia previa por identidad, de modo que dos entregas concurrentes de la misma noticia no produzcan dos registros.
- [ ] 3.3 Implementar que una recaptura de una noticia ya almacenada se ignore, sin modificar el registro existente ni crear uno adicional.
- [ ] 3.4 Aislar el almacenamiento de cada ítem dentro de una misma entrega, de modo que el fallo de uno no impida almacenar los demás ítems de esa entrega.
- [ ] 3.5 Estructurar el almacenamiento de forma consultable (verificable mediante acceso directo en pruebas), sin implementar una interfaz de consulta o análisis concreta.

## 4. Pruebas automatizadas

- [ ] 4.1 Probar que un ítem con metadatos completos se almacena junto con esos metadatos.
- [ ] 4.2 Probar que un ítem con metadatos opcionales ausentes se almacena con los metadatos disponibles, sin ser rechazado por esa ausencia.
- [ ] 4.3 Probar la resolución de identidad por `guid` y, en su ausencia, por enlace.
- [ ] 4.4 Probar que la recaptura de una noticia ya almacenada no modifica el registro existente ni crea uno nuevo, incluyendo el caso en que la recaptura proviene de una entrega manual sobre una noticia capturada automáticamente.
- [ ] 4.5 Probar que un ítem sin título o sin enlace se descarta sin almacenarse.
- [ ] 4.6 Probar que el fallo al almacenar un ítem de una entrega no impide almacenar los demás ítems de esa misma entrega.
- [ ] 4.7 Probar que el sistema no realiza solicitudes externas adicionales para obtener metadatos más allá de los incluidos en el ítem entregado.
- [ ] 4.8 Probar la garantía de unicidad ante entregas concurrentes de la misma noticia (por ejemplo, dos entregas simultáneas con el mismo `guid` o enlace).
- [ ] 4.9 Ejecutar la suite de pruebas y las verificaciones estáticas del proyecto, y corregir únicamente defectos dentro del alcance de HU-04.
