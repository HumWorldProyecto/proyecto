## Why

HumWorld necesita permitir que un administrador incorpore sin demora las noticias de una fuente RSS concreta, sin esperar al siguiente ciclo de captura automática (HU-01). HU-02 define el disparo manual y su alcance a una única fuente, sin definir todavía la interfaz de entrada ni la persistencia de los ítems producidos.

## What Changes

- Incorporar un caso de uso que permita iniciar manualmente la captura de una única fuente RSS ya registrada en HumWorld.
- Restringir la actualización manual a la fuente seleccionada, sin realizar solicitudes a ninguna otra fuente configurada.
- Reutilizar el comportamiento de interpretación RSS ya definido para la captura automática (solo RSS, sin Atom ni web scraping, con finalización finita) al ejecutar la actualización manual.
- Rechazar la actualización manual cuando la fuente indicada no está registrada en HumWorld, sin realizar solicitudes externas.
- Exponer el resultado de una actualización manual (éxito con los ítems producidos, o fallo con su motivo) a través de un límite abstracto de resultado, sin comprometer todavía un contrato de interfaz (UI/API) concreto.
- Entregar los ítems RSS interpretados al mismo límite abstracto de salida hacia el flujo posterior que utiliza HU-01, sin afirmar que hayan sido almacenados.
- Mantener fuera de este cambio la gestión y validación administrativa de fuentes (HU-15), la interfaz concreta de disparo (UI/API), la autorización y control de acceso, la política de solapamiento con otras ejecuciones (manuales o automáticas) sobre la misma fuente, y la definición de la persistencia, los duplicados, los datos mínimos y la actualización de noticias existentes (HU-04).

## Capabilities

### New Capabilities

- `actualizacion-manual-rss`: inicio manual de la actualización de una única fuente RSS registrada en HumWorld, con captura restringida a esa fuente, rechazo de fuentes no registradas y exposición del resultado de la actualización mediante un límite abstracto.

### Modified Capabilities

Ninguna.

## Impact

- Caso de uso de actualización manual sobre una fuente RSS, disparado por un administrador.
- Reutilización del comportamiento de interpretación RSS (formatos admitidos, exclusión de Atom y de web scraping, finalización finita) ya aprobado para la captura automática de HU-01.
- Consumo del conjunto de fuentes registradas que administra HU-15, sin definir su contrato interno definitivo.
- Límite abstracto de resultado para comunicar éxito o fallo de la actualización manual; su contrato de interfaz concreto (UI/API) no se define en este cambio.
- Límite abstracto de salida para entregar ítems RSS interpretados al flujo posterior; su persistencia y el contrato interno definitivo corresponden a HU-04.
- Pruebas de comportamiento para selección de una única fuente, exclusión de las demás fuentes configuradas, rechazo de fuentes no registradas y comunicación de éxito o fallo del intento.
