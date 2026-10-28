# Design

## Context and decisions

Issue #48 releída: nueve criterios, sin comentarios al proponer. Usuario confirma toda la familia de fuentes. Se incluyen las dos operaciones de geografía del dashboard porque exponen/modifican las mismas fuentes. No se extiende a noticias, diccionario, configuración o análisis. Se mantienen ADR-002/004/005; no nuevas dependencias de producto, estilo, SGBD o arquitectura.

Autorización humana: pedido de aplicar P12, confirmación del alcance y de la fusión de P11; revisión técnica de Codex antes de código. Matriz y riesgos revisados aquí. Aprobación final de Benjamín aún pendiente. El PDF suministrado termina en 4.6 aunque remite a 4.8/4.9: se verifican sus objetivos de pruebas/CI/rotación sin inventar texto faltante.

## Implementation plan and boundaries

- `backend/src/auth`: ApiKeyConfig inyectable con ConfigService; valida HUMWORLD_API_KEY_READ/WRITE durante creación del módulo. Sin fallback. Conserva solo digests privados SHA-256; compara ambos de longitud fija con node:crypto timingSafeEqual y devuelve read/write. No se afirma que toda la petición tenga duración constante. Entrada múltiple/array o concatenada no coincide. No se pasan claves a servicios/repositorios.
- Un decorador RequireApiKey(permission) combina metadata, UseGuards y declaraciones Swagger. Guard compartido autentica y autoriza antes de controller/pipes. No hay bypass de tests en producción. Sources/Capture/Analytics importan AuthModule; se anotan explícitamente diez operaciones. Captura automática interna no usa credenciales HTTP.
- ConfigModule mantiene la carga existente `.env` del directorio backend. Añadir backend/.env.example con campos vacíos y explicar configuración del entorno; Compose exige proporcionar las dos claves al backend, sin colocarlas en frontend/VITE. El .env.example de raíz documenta nombres vacíos. Se conserva el ejemplo histórico de DATABASE_URL, sin registrar claves de API reales.
- Frontend: clave introducida en formulario password, en estado React de la instancia, campo limpiado al aplicar, retirada explícita, sin local/sessionStorage/cookies/env de compilación. Se manda solo a geography/assignCountry; ni al dashboard público ni a enlaces. No aparece como parte de una clave de caché ni URL. Catálogo público del dashboard conserva filtro anónimo. Cambio aborta/recarga solicitudes de geografía y desmonta editor anterior. No equivale a cuentas/login de usuarios.
- `.github/workflows/ci.yml`: preservar P11 y Sprint 4; agregar job p12-security para PR interna y push/main, permissions contents:read, sin pull_request_target. Inyecta secrets exclusivamente al paso security:smoke; ningún shell imprime variables. Ausencia de secrets falla con error genérico. Forks ejecutan suite general con credenciales de prueba efímeras y no job con secretos. Conservar artefacto JSON de resultados sin valores incluso ante fallos.
- `backend/scripts/verify-api-access.cjs`: HTTP con controllers/guard/config reales y dobles de negocio, sin DB; usa las credenciales del entorno, comprueba matriz y recrea aplicación con nueva gestión efímera para demostrar invalidación. No cambia repository secrets durante la rotación de prueba: reiniciar una instancia con configuración distinta demuestra el mismo contrato sin invalidar otros jobs. Guarda solo caso, status y resultado en reports/p12. Pruebas API/PostgreSQL aparte comprueban escrituras/no efectos reales.
- Credenciales locales aleatorias de 32 bytes hex solo en memoria del proceso; CI genera otras de modo independiente y las cifra con la clave pública de GitHub/libsodium antes de enviarlas. No sobrescribir secretos preexistentes sin revisar; auditoría inicial muestra cero secretos. Herramienta de administración fuera del repositorio, valores nunca escritos/mostrados. Evidencia solo nombres y fechas. No rotar accesos del equipo, tokens GitHub ni datos del proyecto.

## Files anticipated

auth config/guard/decorator/module, Sources/Capture/Analytics módulos y controllers, main/Swagger helper y exportador; tests de acceso y adaptaciones de fixtures autorizadas; setup-env/helper de tests; scripts de smoke; .env.example, Compose, README/docs/openapi/docs/practicas; frontend API/App/SourceCountries/formulario/tests; workflow; artefactos OpenSpec y nota de política P12 en arquitectura.

## Test proposal and critical review before implementation

| Grupo | Casos propuestos | Nivel / objetivo |
| --- | --- | --- |
| Configuración | falta cada clave, vacío, espacios, iguales, distintas; mensaje sin datos; reconstrucción tras rotar | Unitarias puras, dobles ConfigService |
| Guard | ausente/vacía/incorrecta/array; read/write; falta metadata; ambas consultas; read en write | Unitarias con ExecutionContext/Reflector dobles, sin HTTP/DB |
| Matriz HTTP | 10 rutas sin clave/incorrecta; siete escrituras con consulta; tres GET con ambos perfiles; errores/éxitos existentes | API, guard/controladores reales; mocks de captura para no acceder a red |
| Persistencia | alta válida 201, duplicado 409, GET missing 404; 401/403 sin filas cambiadas ni service calls | API + PostgreSQL 16 aislado |
| Contrato | esquema apiKey/header/X-API-Key, diez security/401 y siete 403, códigos previos | OpenAPI real generado, sin secretos |
| Web | 401/403, cabecera protegida, sin clave a dashboard, retirar acceso, ausencia en storage/URL | Vitest/RTL y prueba visual local |
| Secrets/rotación | secretos explícitos en job; anterior 401/nueva permitida/consulta válida, JSON sin claves | HTTP con dobles y secretos reales CI; otra ejecución con valores locales efímeros |
| Regresión | suites P11/Sprint 4, cobertura >=80% en cuatro métricas, builds, Prisma, strict/diff | Suite completa, PostgreSQL 16 / frontend |

Se descarta copiar FastAPI/APIKeyHeader/SQLite o implementar solo tres rutas dejando otras de fuentes sin control. 401 precede validación funcional, no al parser de HTTP/JSON del servidor. No se usan claves literales en tests ni se omite el guard en suites heredadas: se adjunta gestión efímera. Un test HTTP con servicios dobles no se llama unitario. No hay garantía de seguridad por cobertura ni revisión humana ficticia.

## References

- https://docs.nestjs.com/guards
- https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptotimingsafeequala-b
- https://docs.github.com/en/rest/guides/encrypting-secrets-for-the-rest-api
