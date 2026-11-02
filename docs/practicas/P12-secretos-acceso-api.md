# P12 aplicada a HumWorld: secretos y acceso a fuentes RSS

Práctica docente de nueve páginas, leída completa el 28-10-2026. Se adapta AGENDA/FastAPI/SQLite al stack ratificado NestJS/PostgreSQL/Jest, sin crear Personas, cuentas o login. El PDF termina en 4.6 aunque remite a 4.8/4.9; se cubren sus objetivos explícitos de automatización, Secrets y rotación sin atribuir contenido a apartados no entregados.

Seguimiento: [Issue #48](https://github.com/HumWorldProyecto/proyecto/issues/48). Se verificó la fusión humana de P11 #47 antes de implementar: base main `f5ef214eac6610dcc9ceda195f7dc83f31fdb0de`, con Sprint 4 #45 ya integrado. La propuesta/requisitos/diseño/matriz se registraron antes de código en `e50556f`. El usuario confirmó toda la familia de fuentes RSS y pidió exclusivamente a **Benjamín Gallegos, BGallegos000**, como revisor. Codex realizó la revisión técnica; no se atribuye participación a Copilot ni aprobación final a Benjamín.

## Matriz de permisos

Todas las rutas llevan el prefijo `/api/v1`. Clave ausente, vacía o inválida: **401** en las diez. Consulta en escritura: **403**, sin llamada al servicio ni cambio persistido.

| Operación existente | Consulta | Gestión |
| --- | --- | --- |
| GET /sources | Permitida | Permitida |
| GET /sources/{id} | Permitida | Permitida |
| GET /dashboards/geography | Permitida | Permitida |
| POST /sources | 403 | 201 si válida |
| PUT /sources/{id} | 403 | 200 si válida |
| PATCH /sources/{id} | 403 | 200 si válida |
| DELETE /sources/{id} | 403 | 204 si válida |
| POST /sources/{id}/capture | 403 | Contrato de captura vigente |
| POST /sources/capture | 403 | Contrato batch vigente |
| PUT /dashboards/sources/{id}/geography | 403 | 200 si válida |

Geografía también consulta/edita fuentes: excluirla dejaría una ruta equivalente sin control. Las otras familias mantienen su contrato; P12 **no** representa protección global de la API ni seguridad definitiva del despliegue. Captura automática interna no pasa por HTTP ni recibe claves. La aceptación histórica de acceso anónimo *durante Sprint 1* se conserva como historia; P12 es una evolución posterior, autorizada expresamente.

Autenticación determina consulta/gestión; autorización decide si el perfil puede ejecutar esa ruta. Un guard central lo comprueba antes del controller/DTO/servicio. HTTP/JSON sintácticamente inválido puede ser rechazado por el servidor antes de llegar al guard; con JSON parseable, 401/403 preceden las validaciones funcionales. Con clave válida se conservan 400/404/409 y los demás contratos previos.

## Configuración local, sin valores versionados

Dos variables: `HUMWORLD_API_KEY_READ` y `HUMWORLD_API_KEY_WRITE`. Deben existir, no ser vacías/solo espacios y ser diferentes; no hay defaults en la aplicación. La configuración se valida durante creación del módulo antes de aceptar peticiones. Solo se conservan digests privados en el componente; ambas comparaciones usan buffers SHA-256 de longitud fija y `timingSafeEqual` de Node. No se promete duración constante de toda la petición.

Ejemplo PowerShell para valores **solo locales**, en memoria de esa terminal, sin imprimirlos:

```powershell
$env:HUMWORLD_API_KEY_READ = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:HUMWORLD_API_KEY_WRITE = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Proporcionar también `DATABASE_URL` de una base local. Desde backend: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run build` y `node dist/main.js`. No ejecutar la suite contra una base compartida: las fixtures limpian datos.

ConfigModule conserva la carga de `backend/.env` si se arranca desde backend; si se usa ese fichero, permanece ignorado por Git y nunca se copia a una imagen. Los dos `.env.example` solo contienen nombres de las claves con campos vacíos. También pueden proporcionarse exclusivamente por el entorno, como se hizo en esta práctica; no se crearon ficheros con claves. Compose exige ambas en el servicio backend y nunca las pasa al frontend.

Swagger: `http://127.0.0.1:3000/api/docs`, botón **Authorize**, esquema `apiKey`, cabecera **X-API-Key**. Introducir la clave desde el entorno local de confianza; no pegarla en una Issue, PR o chat. Usar solo localhost o HTTPS. Exportar contrato con `npm run openapi:export` después del build, con configuración válida; el exportador no incluye valores ni inicia escucha HTTP.

Web: se introduce una clave en «Acceso a fuentes RSS». El campo se limpia al aplicarla, se conserva en memoria de esa instancia y se elimina al retirar acceso o recargar. No usa VITE_*, URLs, cookies, localStorage o sessionStorage. Se envía únicamente a geografía de fuentes; el dashboard público no la recibe. El servidor impone permisos aunque se invoque la ruta directamente; ocultar botones no sería autorización.

## Pruebas y evidencia local

| Verificación | Resultado local |
| --- | --- |
| Línea base tras P11/Sprint 4 | 75 suites / 736 pruebas aprobadas, 47,113 s |
| Backend con P12 | 77 suites / 802 pruebas aprobadas; 66 casos nuevos |
| Frontend con P12 | 4 archivos / 18 pruebas aprobadas; 2 casos nuevos |
| Reporter JUnit heredado | 3/3; se conserva, sin bajar umbrales ni omitir pruebas |
| Smoke de acceso y rotación | 112 comprobaciones HTTP aprobadas; controllers/guard/config reales, negocio doble, sin DB |
| Arranque del proceso real inválido | falta consulta, falta gestión, blancos e iguales: exit 1, mensaje genérico, sin valores |
| Prisma | generate/validate/migrate deploy/status correctos; siete migraciones intactas |
| Builds | Backend y frontend correctos |
| OpenSpec strict | 16/16 artefactos válidos |
| Navegador real local | Swagger Authorize, matriz 401/401/200/403/400, consulta rechazada al editar, gestión guarda país en PostgreSQL, retirar acceso vuelve a 401 |

| Cobertura global | Backend antes | Backend P12 | Frontend P12 |
| --- | ---: | ---: | ---: |
| Statements | 98,88 % | 98,91 % | 100 % |
| Branches | 94,58 % | 94,78 % | 93,03 % |
| Functions | 99,17 % | 99,18 % | 100 % |
| Lines | 98,85 % | 98,88 % | 100 % |

Todas superan 80 %. Las pruebas heredadas siguen ejecutando funcionalidad con gestión efímera; no se desactiva el guard para hacerlas pasar. Los tests P12 de denegación usan cliente HTTP sin autorización automática. Comprueban tres consultas, siete escrituras, ambos perfiles, 401/403 antes de efectos, PostgreSQL real sin cambios, creación 201, duplicado 409, consulta inexistente 404, configuración, no filtración y OpenAPI. Las unitarias no usan HTTP ni DB. Las pruebas HTTP con mocks no se presentan como unitarias ni escrituras PostgreSQL reales.

Las cinco comprobaciones de navegador se ejecutaron contra backend y web reales, con claves efímeras en memoria: el formulario de Swagger aceptó consulta; la web mostró 403 al asignar país con consulta y permitió guardarlo con gestión en la base exclusiva de pruebas. El campo se limpió, no hubo local/sessionStorage y se verificó retirada de clave. Se inspeccionaron capturas sin credenciales visibles. No se presentan como una sesión manual del equipo.

Reproducción del entorno descartable local usado:

```sh
docker run --detach --rm --name humworld-p12-local -e POSTGRES_USER=humworld -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=humworld_p12_test -p 127.0.0.1:55442:5432 postgres:16-alpine
```

Solo para esa base ligada a loopback: `DATABASE_URL=postgresql://humworld@127.0.0.1:55442/humworld_p12_test?schema=public`. Después de build/migraciones: `npm run test:reporter`, `npm run test:ci`; en frontend, `npm ci`, `npm run build`, `npm run test:cov`. Para `npm run security:smoke` se deben proporcionar las dos claves del entorno local: ese script **no genera defaults**. Las fixtures efímeras del runner Jest son exclusivas de tests y no están disponibles en el proceso de producción.

## Secrets y rotación

Se crearon los repository Actions Secrets **HUMWORLD_API_KEY_READ** y **HUMWORLD_API_KEY_WRITE** el 28-10-2026 a las 14:30:26 UTC, exclusivos de pruebas. Auditoría previa: cero secretos. Se generaron aleatoriamente en memoria y se cifraron con la clave pública del repositorio y libsodium antes de enviar; ningún valor se escribió a archivos o salida. No se sustituyeron secretos existentes. Las claves locales y las de CI se generaron de manera independiente. Evidencia: nombres y fechas; GitHub no permite recuperar los valores.

El job `p12-security` recibe ambos secretos **solo en el paso** de `security:smoke`, no en comandos de shell, build o artefactos. Conserva JSON con nombres de casos/status/resultados, sin cabeceras o valores. PR internas y push/main ejecutan ese job; forks mantienen las pruebas generales con fixtures y no reciben secretos. No se usa pull_request_target. P11 mantiene JUnit/Cobertura y upload incluso en fallo; Sprint 4 mantiene frontend/strict.

La demostración de rotación reinicia la aplicación de comprobación con una clave de gestión nueva y efímera: anterior →401, nueva →201, consulta anterior →200. Se conserva la otra clave. No se modifican los repository Secrets durante esa prueba, ni tokens GitHub, ni accesos del equipo. En un despliegue real se sustituye la variable de ese entorno y se reinicia el backend; un proceso que aún no se reinicie conserva su snapshot anterior. La comprobación no representa un sistema de revocación distribuida o sesiones personales.

## Trazabilidad de criterios de la Issue

## Evidencia remota verificada

[PR #49](https://github.com/HumWorldProyecto/proyecto/pull/49), base main `f5ef214eac6610dcc9ceda195f7dc83f31fdb0de`. Implementación verificada `8ab5d535e15ec2c5ed54704c0430974b1833b82c`: [Actions run 40708394739](https://github.com/HumWorldProyecto/proyecto/actions/runs/40708394739), **success** en backend-tests, frontend-tests, p12-security, openspec-sprint4 y check.

Artefactos descargados y comprobados independientemente: `informes-pruebas-backend` **12824882351** (JUnit: 802 casos, cero failures/errors/skipped; Cobertura XML válido) y `comprobaciones-acceso-p12` **12825605107** (112/112 comprobaciones, incluida rotación y no ejecución de servicios al denegar). El JSON de acceso no contiene valores de claves; el log de Actions enmascara las variables recibidas. Retención de siete días, hasta el 04-11-2026.

Los dos secretos se consumieron realmente en el job, sin fallback. La PR pasó de borrador a lista y se solicitó revisión exclusivamente a **BGallegos000**, sin equipos u otros revisores solicitados. Aprobación y fusión humanas pendientes; Issue #48 permanece abierta. El cierre documental es posterior a este commit de implementación; el SHA y check de la cabeza final se mantienen en la descripción de la PR para no autorreferenciar un commit aún inexistente.

## Correspondencia final

| Criterio | Especificación / comprobación |
| --- | --- |
| 1–2: 401/403 y matriz sin efectos, éxito vigente | Autenticar antes / perfiles; 66 casos P12 y regresión autorizada |
| 3: configuración central y arranque | Configuración válida antes de servir; unitarias y cuatro arranques de proceso inválidos |
| 4: secretos fuera de Git/logs/bundle | Contrato/cliente; campos vacíos, digests privados, cabecera, prueba no filtración/storage |
| 5: OpenAPI/Swagger | Diez security/401, siete 403, esquema API key y exportación de contrato real |
| 6: web | Formulario efímero, header protegido, no clave al dashboard, 401/403 y retirada |
| 7: pruebas/rotación | Unitarias + API/PostgreSQL + smoke HTTP con reinicio y claves sustituidas |
| 8: Actions Secrets | Nombres/fechas creados; job con inyección explícita, evidencia sin valores, forks excluidos |
| 9: proceso/revisión | OpenSpec previo, diff contra main, verificación final y revisión solicitada solo a BGallegos000 |

## Presentación al profesor

1. Mostrar Issue #48 y OpenSpec: se acordaron alcance, matriz y casos antes de implementar; no se inventan usuarios o tecnologías.
2. Swagger: esquema X-API-Key y Authorize; sin clave 401; consulta lee, pero escritura 403; gestión mantiene éxito y errores funcionales.
3. Mostrar que el rechazo ocurre antes del servicio y no cambia PostgreSQL; enseñar tests y cobertura sin confundir HTTP con unitarias.
4. Settings → Secrets and variables → Actions: mostrar **nombres**, nunca valores. Abrir el job de acceso/rotación y su artefacto JSON; contrastar JUnit/Cobertura de P11.
5. Mostrar los tres resultados de rotación y explicar la separación local/CI. Abrir la web, aplicar consulta, luego gestión y retirar; nunca incluir claves en capturas.
6. PR con Benjamín como único revisor, pendiente de aprobación/fusión humana. Esta práctica no añade historias Done ni inventa avance funcional de otros sprints.

Referencias de implementación: [guards NestJS](https://docs.nestjs.com/guards), [comparación segura Node](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptotimingsafeequala-b), [cifrado de secretos GitHub](https://docs.github.com/en/rest/guides/encrypting-secrets-for-the-rest-api).
