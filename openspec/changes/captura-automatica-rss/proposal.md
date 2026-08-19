## Why

HumWorld necesita mantener actualizada su información mediante capturas automáticas y periódicas desde las fuentes RSS registradas. HU-01 define la obtención e interpretación de esos feeds hasta producir cero o más ítems RSS interpretados para el flujo posterior, sin incluir su persistencia.

## What Changes

- Incorporar la ejecución automática de captura sobre las fuentes RSS registradas en HumWorld.
- Ejecutar la captura con la periodicidad configurada por la capacidad correspondiente a HU-18.
- Considerar correctamente capturada una fuente registrada cuando responde con un formato RSS admitido y el sistema puede interpretar su feed para producir cero o más ítems RSS.
- Entregar los ítems RSS interpretados a un límite abstracto de salida para el flujo posterior, sin afirmar que hayan sido almacenados.
- Limitar la captura a RSS, sin admitir Atom ni utilizar técnicas de web scraping.
- Aislar los fallos y contenidos inválidos por fuente, de modo que no impidan intentar las demás fuentes configuradas.
- Evitar solicitudes de captura y la incorporación de noticias cuando no existen fuentes RSS configuradas.
- Excluir del proceso automático cualquier fuente no registrada en HumWorld.
- Mantener fuera de este cambio la gestión y validación administrativa de fuentes, la gestión de periodicidad y la definición de la persistencia, los duplicados, los datos mínimos y la actualización de noticias existentes.

## Capabilities

### New Capabilities

- `captura-automatica-rss`: ejecución automática y periódica de intentos de captura sobre las fuentes RSS registradas, interpretación de sus feeds y producción de ítems RSS para un límite abstracto de salida, con aislamiento de fallos por fuente y comportamiento definido cuando no existen fuentes.

### Modified Capabilities

Ninguna.

## Impact

- Orquestación del proceso automático de captura RSS.
- Consumo del conjunto de fuentes registradas que administra HU-15, sin definir su contrato interno definitivo.
- Consumo de la periodicidad administrada por HU-18, sin definir su contrato interno definitivo.
- Límite abstracto de salida para entregar ítems RSS interpretados al flujo posterior; su persistencia y el contrato interno definitivo correspondiente pertenecen a HU-04.
- Pruebas de comportamiento para selección de fuentes, aislamiento de fallos, exclusión de formatos no RSS y ausencia de fuentes configuradas.
