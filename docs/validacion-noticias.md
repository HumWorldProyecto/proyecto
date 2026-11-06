# Validación con noticias reales

La aplicación tiene tres espacios. **Explorar** muestra las noticias, filtros, mapa, evolución, nube y ranking. **Medios y fuentes** permite buscar y organizar el catálogo, registrar direcciones RSS, editarlas, asignar país, activarlas, pausarlas y capturarlas. **Administración** reúne la política de caducidad, la vista previa y el purgado. La clave se mantiene en memoria durante la navegación. El servidor comprueba los permisos en cada petición.

## Arranque y seguimiento

Desde PowerShell, con Docker Desktop abierto, ejecuta `./scripts/Iniciar-validacion.ps1`. La primera vez genera las credenciales locales en `.env.validacion`, aplica las migraciones y prepara 50 medios y 53 feeds públicos en español e inglés. Sus países corresponden a la procedencia editorial de las fuentes. Los feeds iniciales se comprobaron con el parser RSS de HumWorld el 6 de noviembre de 2026. Consulta el catálogo versionado en `backend/src/validation/feeds.json`.

- Web en <http://127.0.0.1:54176/>
- Swagger en <http://127.0.0.1:53016/api/docs>
- Para copiar una clave, ejecuta `./scripts/Iniciar-validacion.ps1 -CopiarClave Consulta` o `./scripts/Iniciar-validacion.ps1 -CopiarClave Gestion`. Pégala en el espacio de gestión o en Authorize.
- El primer ciclo arranca cuando la base está vacía. La periodicidad inicial es de 60 minutos. En **Fuentes RSS**, **Gestionar fuente** ofrece una captura manual de una fuente activa.
- En este entorno se analizan automáticamente las noticias pendientes de los feeds del catálogo, según el idioma configurado por feed. Los análisis guardados se conservan. El diccionario inicial es editable y sus resultados reflejan los términos que encuentra. Las fuentes agregadas después se pueden analizar explícitamente mediante la API existente.

## Conservar la serie de varios días

La caducidad inicial de esta base está desactivada. Puedes comprobarlo en **Administración**. PostgreSQL usa el volumen `humworld-validacion_postgres-data`, que conserva las noticias entre reinicios. Mantén el equipo despierto y Docker en ejecución durante los días de recolección. Al apagar el equipo se interrumpe la captura hasta que vuelva a arrancar. Conserva el archivo local `.env.validacion` junto con el volumen para reanudar el mismo entorno.

El entorno de validación y el de los seis ejemplos tienen proyectos Docker, bases y puertos independientes. Para repetir el arranque de validación, usa el mismo script y volumen. El catálogo se prepara una vez y los arranques posteriores conservan el estado.

Para respaldar los datos antes de exponer, ejecuta estos comandos desde el repositorio. El primero crea un volcado de PostgreSQL dentro del contenedor y el segundo lo copia al equipo.

```powershell
docker compose --env-file .env.validacion -f compose.validacion.yml exec -T postgres pg_dump -U humworld -d humworld_validacion -Fc -f /tmp/humworld-validacion.dump
docker cp humworld-validacion-postgres-1:/tmp/humworld-validacion.dump ./humworld-validacion.dump
```

Al presentar, elige un intervalo en **Explorar** para ver la evolución. Los gráficos usan la fecha de publicación y, si falta, la de captura. Las cantidades pueden crecer a ritmos distintos según la frecuencia con que cada medio publica.
