# Calidad local del cierre Sprint 5

SonarQube Community Build **26.10.0.133078**, instancia local descartable autorizada por el usuario. Imágenes oficiales fijadas por digest en `compose.quality.yml` y `scripts/sonar-local.cjs`. No se creó cuenta cloud ni se almacenaron tokens/contraseñas en Git. El token temporal se mantuvo en memoria; no se simularon revisiones, aceptaciones de issues o hotspots.

## Resultado real

Commit analizado `ee7f58921828b69a80c546b9470cd28386cebae1`, análisis del 31-10-2026. **Quality Gate OK**, con condiciones reales en el segundo análisis: cobertura nueva **98,4 %** (mínimo 80), duplicación nueva **0 %** (máximo 3), avisos nuevos **0**. Cobertura global Sonar **97,8 %**, duplicación global **1,0 %**, 7.739 líneas de código. **Cero hotspots y cero vulnerabilidades críticas** en este análisis.

Se resolvieron doce avisos de la primera pasada: tipos de botones, props confundidas con el atributo HTML accessKey y tres regex con backtracking potencial. El preprocesado de etiquetas se reemplazó por recorrido lineal con salida equivalente; no se cambian pesos, reglas IPTC o el método de sentimiento. La regresión y casos de etiquetas incompletas/largas verifican la equivalencia.

Permanecen **30 avisos de revisión técnica**, que no se cerraron automáticamente: 28 literales de rangos IP usados deliberadamente para defensa SSRF, la URI canónica HTTP de IPTC (identificador, no transporte inseguro) y el `try` de RequestDeadline que captura fallos síncronos antes de tratar los rechazos asíncronos. No se cambian esos contratos para silenciar el analizador. Deben ser revisados por una persona con criterio; un gate verde no significa ausencia de todo riesgo.

## Dependencias

Auditoría de los lockfiles actuales, sin modificarlos: backend **0 críticas, 11 altas, 24 moderadas y 4 bajas**; frontend **0 vulnerabilidades declaradas**. Esta deuda del backend permanece explícita. No se ejecutó `audit fix --force`, no se eligió la alternativa pendiente del ADR-006 ni se cambió NestJS de major sin aprobación. La preparación funcional de demo no constituye una certificación para producción.

## Reproducción

1. Ejecutar `npm run test:ci` en backend y `npm run test:cov` en frontend para generar LCOV.
2. Arrancar `docker compose -f compose.quality.yml up -d`. Solo loopback, base H2 y bootstrap relajado para evaluación local; no usar esta configuración en producción. No reutilizar una instancia ajena.
3. En la UI local `http://127.0.0.1:59000`, completar el cambio de acceso inicial y generar un token propio. Proporcionarlo por `SONAR_TOKEN` en el entorno de la terminal, sin imprimirlo ni guardarlo en el repositorio.
4. Ejecutar `node scripts/sonar-local.cjs`. El código se monta solo lectura, normaliza rutas LCOV y guarda `reports/quality/{summary,issues,hotspots}.json` y log sin token. El script comprueba gate, cobertura >=80 y ausencia de vulnerabilidades críticas; no cambia reglas o resoluciones.
5. El token de análisis puede no permitir leer el detalle de hotspots: se informa esa limitación y el contador oficial, sin elevar privilegios ni fingir revisión. En esta ejecución el contador fue cero.

El análisis se ejecutó **localmente**, no como un Quality Gate automático de GitHub. CI sigue comprobando Jest, frontend, OpenSpec y seguridad P12. Conectar un servidor permanente y secretos de Sonar a CI requiere una decisión posterior del equipo; no se presenta como ya integrado.
