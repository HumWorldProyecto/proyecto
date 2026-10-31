# Demo final de HumWorld

Incremento de cierre: HU-19/20/21 y brecha de medios de HU-15. El usuario confirmó el 31-10-2026 antigüedad desde captura, medios con varias fuentes y comprobación Sonar local. La implementación conserva P12 y Sprint 4; no añade usuarios personales ni modifica reglas de sentimiento, clasificación o captura.

## Preparación reproducible con Docker

Desde la raíz, proporcionar dos claves **exclusivas de demo** en el entorno. Ejemplo PowerShell, sin imprimirlas ni escribirlas a archivos:

```powershell
$env:HUMWORLD_API_KEY_READ = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:HUMWORLD_API_KEY_WRITE = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
docker compose -f compose.demo.yml up --build -d
```

Web: `http://127.0.0.1:54175`. Swagger: `http://127.0.0.1:53015/api/docs`. PostgreSQL de fixtures: loopback 55444, base **humworld_demo_final**, separado de pruebas (55443) y de cualquier base del equipo. Este entorno usa trust solo para datos ficticios locales; no es configuración de producción. Si esos puertos están ocupados por la vista previa de Work, cerrarla antes de arrancar Compose; no detener contenedores ajenos.

Las claves pertenecen al proceso local y solo se pasan al backend. El operador puede introducirlas en Swagger o «Acceso a fuentes RSS»; nunca se ponen en URLs, capturas o bundles. La vista pública del dashboard no exige clave; administración sí. Para el resto del sistema se conserva el alcance de P12, sin afirmar protección global.

## Qué incluye la semilla

Dos medios, tres fuentes inactivas y seis noticias ficticias con países CL/US/ES. Cinco se analizan con el **motor real** y diccionario ES/EN; una queda pendiente. Hay cuatro con evidencia, una sin coincidencias y una pendiente. Una noticia fue capturada hace 30 días y permite probar purga con siete días. La semilla usa NewsService y el caso de análisis/persistencia real; las fechas se ajustan como fixtures, no representan captura en vivo.

`backend/scripts/demo-seed.cjs` solo acepta la base local **humworld_demo_final**. Reaplica exclusivamente sus IDs/guids/entradas de ejemplo y no hace un borrado global. Repetirla restaura el estado de esas fixtures, incluidos análisis/fechas; no usarla en una base real. Las fuentes quedan inactivas para mantener una demo determinista sin depender de feeds externos. La captura RSS real continúa disponible por los contratos existentes con fuentes públicas válidas; no se sustituye por scraping.

## Recorrido para el profesor

1. Dashboard: seis noticias, cinco analizadas, cuatro con evidencia; comparar países, fechas, mapa, nube, ranking y detalle. Cambiar a un país y abrir una noticia con idioma inglés.
2. Introducir consulta: se pueden consultar medios/fuentes/vista previa; una escritura recibe 403. Retirar la clave elimina los paneles administrativos.
3. Introducir gestión: crear un medio, renombrarlo y asociar una fuente. Eliminar ese medio conserva la fuente y sus noticias; se puede volver a asociar a otro medio.
4. Caducidad: siete días desde **captura**, revisión automática cada hora. Vaciar el periodo desactiva y nunca borra; configurar no dispara un borrado inmediato.
5. Vista previa: una caducada. Cancelar la confirmación conserva seis; confirmar borra solo la antigua y deja cinco, conservando medios/fuentes y recalculando el dashboard. Si cambió la política desde la vista previa se recibe 409 y se debe actualizar.
6. Mostrar pruebas del job: la misma regla se ejecuta con `@nestjs/schedule`, sin esperar una hora en la presentación. Los tests controlan el reloj y verifican registro, disparo, fallo/reintento y cierre.
7. Mostrar CI y [calidad local](calidad/sonar-sprint5.md). La revisión y fusión humanas siguen siendo necesarias; la demo de una rama no equivale a integración en main.

## Verificación realizada

Diez comprobaciones de navegador sobre backend, frontend y PostgreSQL reales: estadísticas de la semilla, datos geográficos/temporales ES/EN, 403 en creación con consulta, conservación de noticias/fuentes al eliminar medio, política desactualizada sin borrado, cancelación, purga real y dashboard actualizado, conservación de medios/fuentes, retiro de clave y restauración final a seis fixtures. Se inspeccionaron capturas sin claves visibles.

Backend: **858 pruebas en 80 suites**. Frontend: **26 pruebas en cinco archivos**. Cobertura backend: 98,94 % statements, 94,78 % branches, 99,30 % functions, 98,93 % lines; frontend: 99,71/93,35/100/100 %. El umbral de 80 % no se rebajó. Las siete migraciones históricas permanecen intactas y el upgrade 7→8 conservó filas de noticias/fuentes con channelId nulo.

No hay cronología artificial: el plan original termina Sprint 5 el **01-11-2026**. A 31-10-2026 se entrega código de cierre para revisión, sin declarar historias Done antes de integrar ni eliminar deuda técnica documentada.
