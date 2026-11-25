# HumWorld — Equipo 5

HumWorld recoge noticias de fuentes RSS, conserva su último análisis de sentimiento en español o inglés y permite consultar el humor por país, continente y periodo. La web reúne exploración, gestión de medios/fuentes y administración del diccionario, captura y caducidad.

## Versión y entrega

Repositorio: https://github.com/HumWorldProyecto/proyecto. Las mejoras de validación y esta preparación de entrega están en `feedback/gestion-validacion`, PR [#53](https://github.com/HumWorldProyecto/proyecto/pull/53). La comprobación del 25/11/2026 encontró la PR abierta y `main` en `56a9dd583487d653ba095d18d18764ca0e824f91`. Una aprobación previa no equivale a una fusión. La revisión y la fusión son humanas.

Para reproducir un ZIP de entrega, descomprímelo y abre una terminal en la carpeta que contiene este README y `compose.validacion.yml`. No necesitas descargar otra rama ni disponer del equipo del autor. El ZIP contiene los archivos versionados, incluidas las migraciones y los archivos de bloqueo de dependencias. Las claves privadas, las dependencias instaladas y la base de noticias no forman parte del código fuente.

## Instalación recomendada: Docker

Requisitos: Docker Desktop abierto, motor Linux y Docker Compose v2. En Windows se utiliza PowerShell 5.1 o posterior. Puertos libres: **54176** para la web y **53016** para la API. PostgreSQL 16 solo se comunica dentro de Docker y no ocupa un puerto del equipo. Para la primera construcción y las capturas RSS se necesita internet.

### Windows

Desde la raíz del repositorio:

```powershell
./scripts/Iniciar-validacion.ps1
```

El script genera tres secretos aleatorios en `.env.validacion` si el archivo no existe, construye las imágenes y arranca PostgreSQL, backend y frontend. Aplica las migraciones e inicializa una sola vez el catálogo de 50 medios y 53 fuentes en seis continentes, además del diccionario. Las capturas y los análisis continúan en segundo plano. El primer arranque puede tardar varios minutos.

Si PowerShell informa de una restricción de ejecución, puede ejecutarse solo este script en un proceso nuevo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Iniciar-validacion.ps1
```

No es necesario cambiar permanentemente la política del equipo.

### Linux o macOS

Además de Docker, este paso de generación utiliza Node.js 24. Desde la raíz:

```bash
node -e 'const fs=require("node:fs"),c=require("node:crypto");const p=".env.validacion";if(!fs.existsSync(p))fs.writeFileSync(p,["HUMWORLD_VALIDATION_DB_PASSWORD","HUMWORLD_VALIDATION_READ_KEY","HUMWORLD_VALIDATION_WRITE_KEY"].map(k=>k+"="+c.randomBytes(32).toString("hex")).join("\n")+"\n",{flag:"wx",mode:0o600});'
docker compose --env-file .env.validacion -f compose.validacion.yml up -d --build
```

### Abrir y comprobar

- **Web**: http://127.0.0.1:54176/
- **Swagger**: http://127.0.0.1:53016/api/docs
- **Configuración**: http://127.0.0.1:53016/api/v1/config

```powershell
docker compose --env-file .env.validacion -f compose.validacion.yml ps
docker compose --env-file .env.validacion -f compose.validacion.yml logs --tail=50 backend
```

Espera a que PostgreSQL esté saludable y la web termine de cargar. La colección empieza vacía: las noticias reales llegan desde internet. Los datos acumulados durante varios días pertenecen al volumen local y no al ZIP. Algunos proveedores pueden fallar temporalmente. Una instalación nueva no dispone inmediatamente del historial del equipo de demostración.

## Dos modos de acceso

**Evaluación local**, arranque anterior: `/config` muestra `evaluationMode: true`. Solo con las dos banderas explícitas de evaluación se permite administrar sin clave y eliminar una fuente junto con sus noticias, previa confirmación. Este modo responde a los casos 1 y 5 del Excel y se expone únicamente en `127.0.0.1`. No debe publicarse en internet.

**Acceso con claves P12**, conserva la misma base de datos y el catálogo:

```powershell
./scripts/Iniciar-validacion.ps1 -ConClaves
```

Alternativa multiplataforma:

```bash
docker compose --env-file .env.validacion -f compose.validacion.yml -f compose.claves.yml up -d --build
```

Ahora `/config` muestra `evaluationMode: false`. En Windows, copia el perfil deseado sin mostrar el secreto:

```powershell
./scripts/Iniciar-validacion.ps1 -CopiarClave Consulta
./scripts/Iniciar-validacion.ps1 -CopiarClave Gestion
```

Ejecuta solo el comando de la clave que quieras copiar. Pégala en **Clave de acceso / Aplicar clave** del frontend o en **Authorize** de Swagger. Cada interfaz conserva su autorización por separado. La web mantiene la clave en memoria y la pierde al recargar. Los secretos locales están en `.env.validacion`, excluido de Git. No hay claves universales ni tokens de usuario generados al entrar.

En las operaciones protegidas de fuentes RSS, consulta permite leer y gestión permite escribir y capturar. Sin clave se responde 401 y con perfil de consulta al escribir se responde 403. La exploración pública permanece disponible. El diccionario conserva su contrato original y no debe presentarse como una familia protegida por P12. En modo normal, eliminar una fuente la desactiva y conserva sus noticias; el frontend ofrece pausar/reactivar.

## Preparar la demostración y conservar noticias

Consulta el [guion de presentación y la correspondencia con los checks](docs/presentacion-validacion.md). La primera parte se realiza desde el **frontend**, durante 10–15 minutos. Las pruebas de API quedan para la validación del Excel.

El periodo inicial de captura es de 60 minutos, editable desde Administración. La caducidad inicial está desactivada: no se borran noticias sin una política configurada. Para acumular varios días, mantén Docker y el equipo activos. Los reinicios conservan el volumen `humworld-validacion_postgres-data` y los análisis. El catálogo no se repone tras cada arranque.

Los filtros temporales y gráficos usan la fecha de publicación y, si falta, la de captura. La **caducidad** usa siempre la fecha de captura. El país es el de la fuente RSS, asignado explícitamente. El sentimiento va de −1 a +1; no mide la fiabilidad de la noticia. Sin coincidencias del diccionario se muestra **sin evidencia** y esa noticia no entra en el promedio. El aporte de una noticia es su valor dividido por el número de noticias con evidencia del filtro actual. Los aportes pequeños se muestran con precisión adicional.

Antes de la exposición, respalda la colección sin modificarla:

```powershell
docker compose --env-file .env.validacion -f compose.validacion.yml exec -T postgres pg_dump -U humworld -d humworld_validacion -Fc -f /tmp/humworld-validacion.dump
docker cp humworld-validacion-postgres-1:/tmp/humworld-validacion.dump ./humworld-validacion.dump
```

El respaldo contiene los datos locales. Guárdalo aparte del ZIP de código. No es necesario restaurarlo para un arranque limpio.

Para comprobar purgas con noticias caducadas sin borrar la colección real, hay un **ensayo aislado** con seis noticias ficticias restaurables:

```powershell
./scripts/Iniciar-validacion.ps1 -Ensayo
```

Abre http://127.0.0.1:54179/ (API y Swagger en 53019). Usa otro proyecto y volumen, `humworld-ensayo_ensayo-data`, con caducidad de siete días y una noticia de treinta días. Al arrancar el backend se reponen esas seis fixtures con fechas relativas al arranque; no se presentan como noticias capturadas durante varios días. El resto de la colección real en 54176 permanece intacto. Para reponer solo estas fixtures de ensayo:

```powershell
docker compose --env-file .env.validacion -f compose.ensayo.yml exec -T backend node scripts/demo-seed.cjs
```

La demostración principal de filtros y evolución utiliza la colección real en 54176. El ensayo sirve para la purga y las comprobaciones destructivas del Excel. Para detener el ensayo: `docker compose --env-file .env.validacion -f compose.ensayo.yml stop`.

Para detener y reanudar sin borrar datos:

```powershell
docker compose --env-file .env.validacion -f compose.validacion.yml stop
docker compose --env-file .env.validacion -f compose.validacion.yml start
```

`start` conserva el modo de los contenedores existentes. Para cambiar de modo usa el comando de arranque correspondiente. No elimines el volumen ni el archivo `.env.validacion` al preparar la exposición.

## Desarrollo y comprobaciones

Stack: Node.js 24, NestJS 10, TypeScript, Prisma 6, PostgreSQL 16; React/Vite, Leaflet y Chart.js. Las versiones exactas se fijan en los archivos de bloqueo.

Para trabajar fuera de Docker, configura una base PostgreSQL 16 **de desarrollo** y, antes de arrancar backend, las variables `DATABASE_URL`, `HUMWORLD_API_KEY_READ` y `HUMWORLD_API_KEY_WRITE` con claves distintas. Desde `backend`: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run build`, `node dist/main.js`. El backend escucha en 3000, Swagger en `/api/docs`. Desde `frontend`: `npm ci` y `npm run dev`; Vite escucha en http://localhost:5173 y dirige `/api` al backend local. Este arranque no activa la colección de validación ni inicializa su catálogo.

Los tests de integración **borran sus datos de prueba**. Usa una base PostgreSQL 16 independiente, nunca la colección de demostración. Con su `DATABASE_URL`, ejecuta en `backend`: `npx prisma validate`, `npx prisma migrate deploy`, `npm run build`, `npm run test:reporter`, `npm run test:ci`. En `frontend`: `npm run build` y `npm run test:cov`. Desde la raíz: `npx @fission-ai/openspec@1.14.3 validate --all --strict`. La cobertura contractual mínima es 80 %. GitHub Actions verifica la regresión en cada PR contra main; sus informes corresponden al SHA probado, no a una rama sin verificar.

## Equipo y documentación

Benjamin Gallegos, Eduardo Diaz, Felipe Sanhueza, Daniel Rossel, Felipe Levi y Tomas Heilenkotter.

- [Arquitectura](docs/architecture.md) y [decisiones](docs/adr/).
- [Requisitos e historias](docs/requisitos/) y [planificación histórica](docs/planificacion/).
- [Contrato OpenAPI y acceso P12](docs/practicas/P12-secretos-acceso-api.md).
- [Caducidad, purga y medios](docs/demo-final.md).
- [Validación con noticias reales](docs/validacion-noticias.md).
- [Evidencias de los 28 casos](docs/checklist-validacion.md).
- [OpenSpec](openspec/).
