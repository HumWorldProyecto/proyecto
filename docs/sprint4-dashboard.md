# Consultas y dashboard — Sprint 4

HU-08, HU-09, HU-11, HU-12 y HU-13 se entregan juntas. Revisión y fusión humanas pendientes; la existencia del código no equivale a Done en main.

## Ejecutar localmente

Requiere Node 24 y PostgreSQL 16. Mantener las instrucciones del backend en README para instalar, migrar y arrancar en localhost:3000. En otra terminal:

```sh
cd frontend
npm ci
npm run dev
```

Abrir http://localhost:5173. La interfaz consulta exclusivamente `/api/v1` a través del proxy local. No hay datos de ejemplo incorporados: una base vacía muestra ausencia de datos. Registrar/capturar fuentes y analizar noticias utiliza los endpoints ya existentes de Swagger.

Alternativa Docker separada de la base habitual: definir `HUMWORLD_DEMO_PASSWORD` en el entorno con un valor local que sea válido en una URL (letras y números). No escribirlo en Git.

```sh
docker compose -f compose.sprint4.yml up --build -d
```

Abrir http://localhost:54173 y Swagger http://localhost:53000/api/docs. Este compose usa su propio nombre, red y volumen, sin publicar PostgreSQL ni utilizar `postgres-data` del compose original. Para detener conservando datos: `docker compose -f compose.sprint4.yml stop`. El frontend usa Vite preview para la demostración académica local; no se presenta como servidor de producción pública.

## Recorrido de demostración

1. En «Procedencia de las fuentes», asignar explícitamente el país correcto a cada fuente conocida. Una asignación actual reclasifica también sus noticias anteriores; no implica que los hechos hayan ocurrido allí.
2. Consultar mundo, continente o país y fechas inclusivas UTC. Comparar total, evidencia, sin coincidencias y pendientes de analizar.
3. Seleccionar un país en mapa o lista. La lista conserva países y territorios pequeños sin polígonos a esta escala.
4. Elegir un día en la evolución para explorar sus noticias. Los aportes del detalle siguen referidos al periodo completo consultado, indicado encima del ranking.
5. Seleccionar una palabra y una noticia. Mostrar idioma, peso, ocurrencias y último análisis. Cambiar una entrada del diccionario no modifica esa evidencia hasta un reanálisis explícito.

## Contrato y cálculo

- `GET /api/v1/dashboards/humor?continent=SOUTH_AMERICA&country=CL&from=2026-10-01&to=2026-10-20`.
- `GET /api/v1/dashboards/geography` entrega catálogo y fuentes.
- `PUT /api/v1/dashboards/sources/{id}/geography`, `{ "countryCode": "CL" }`; null retira el país conservando el continente legado.
- País debe pertenecer al catálogo. Fechas imposibles, país desconocido o incompatible con continente y UUID/body inválidos: 400. Fuente inexistente: 404. Datos no disponibles: 503 sanitizado. OpenAPI contiene las estructuras completas.

El promedio incluye únicamente noticias con `matchedTerms > 0` y valor guardado; cero con coincidencias sí cuenta. N es la cantidad de noticias elegibles del conjunto. El ranking ordena por `abs(score/N)` y muestra el aporte con signo. La fecha es publicación, o captura si falta. Solo se usa el último análisis.

La nube agrega por término e idioma: `peso * ocurrencias / (5 * coincidencias_de_noticia * N)`. Magnitud suma valores absolutos; color y detalle representan suma con signo. Diferencias mínimas respecto a score/N son posibles por redondeo del motor HU-05. Un análisis histórico sin snapshot de términos sigue aportando al promedio, pero no inventa palabras; se informa la cobertura parcial. No se realiza backfill ni reanálisis automático.

La API devuelve todas las noticias del alcance y agrega en memoria con un snapshot de lectura, adecuado para la demostración del curso. No se afirma escalabilidad ilimitada; un volumen mayor exige medir y diseñar paginación/agregación aparte. La política administrativa heredada no incorpora autenticación nueva en estas HU.

## Procedencia de datos geográficos

Catálogo local: 247 países o áreas, tabla española [UNSD M49](https://unstats.un.org/unsd/methodology/m49/overview/), consultada el 20-10-2026. Se conservan ISO alpha-2 y nombre; región determina África/Asia/Europa/Oceanía. América se separa por región intermedia 005 (Sudamérica); las demás regiones americanas forman Norteamérica. Antártida no pertenece a los seis continentes del modelo y se omite. El catálogo no se utiliza para inferir países de fuentes.

Mapa: [Natural Earth admin 0, escala 1:110m](https://github.com/nvkelso/natural-earth-vector/blob/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_110m_admin_0_countries.geojson), commit `9380cca83db5f9aef52d5e762765100745f84b27`, [dominio público](https://www.naturalearthdata.com/about/terms-of-use/). Se conservan geometrías, se omite Antártida y se reducen propiedades a código/nombre. Se busca el código en ISO_A2, ISO_A2_EH, ISO_A3 y ADM0_A3 del mismo archivo contra M49; sin correspondencia se muestra sin datos. El mapa contiene 176 polígonos/features y no representa todos los territorios del catálogo: siempre hay lista textual completa. Límites cartográficos no son una declaración política. No se descargan teselas ni se contactan servicios cartográficos durante el uso.

SHA256 del GeoJSON original: `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`. SHA256 del HTML fuente M49: `b9048114f6e7f2abda83bf03d4263c9d7cd1bd7230e3d0461025ee7839a7a1fb`.

## Verificación reproducible

Backend: `npx prisma validate`, `npx prisma generate`, `npm run build`, `npx prisma migrate deploy`, `npm run test:cov`. Las pruebas de integración requieren una base dedicada y limpian sus tablas; no ejecutarlas sobre datos del equipo. Frontend: `npm ci`, `npm run build`, `npm run test:cov`. Ambos aplican mínimo 80 % en todas las métricas. El entorno DOM y coverage-v8 son soporte de Vitest/RTL; los paquetes de tipos son soporte TypeScript. No se incorpora otro framework UI.

OpenSpec: `npx @fission-ai/openspec@1.14.3 validate sprint4-consultas-visualizaciones --strict`. La migración nueva es aditiva; las seis anteriores y contratos públicos previos deben permanecer sin cambios.
