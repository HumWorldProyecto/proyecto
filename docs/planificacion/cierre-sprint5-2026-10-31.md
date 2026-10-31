# Cierre funcional en revisión — 31-10-2026

## Estado verificado antes del incremento

Main `f5ef214eac6610dcc9ceda195f7dc83f31fdb0de` integra Sprints 1–4 y P11. GitHub tiene **18 de 21 historias cerradas**; HU-19 #20, HU-20 #21 y HU-21 #22 siguen abiertas. P12 #49, cabeza `45d6ca9d6ea94f08652fd792125006cb5999ae59`, está en revisión humana por BGallegos000 con CI verde. No se fusionó automáticamente.

La brecha de canales/medios de HU-15 estaba explícita en el backlog, aunque #16 ya estuviera cerrada. El usuario autorizó completarla y se registró en [#50](https://github.com/HumWorldProyecto/proyecto/issues/50), sin crear una nueva HU ni ocultar el alcance histórico.

## Incremento implementado

- HU-19: política persistida independiente de captura, días desde capturedAt, desactivación sin borrar y sin valor por defecto.
- HU-21: preview, confirmación web, política esperada y resultado del purgado; solo anterior estricto al umbral.
- HU-20: revisión horaria con @nestjs/schedule, mismo servicio, sin solapamiento de esa instancia y recuperación tras fallo.
- Brecha HU-15: CRUD de medios y relación con varias fuentes; eliminar medio hace SetNull y conserva fuentes/noticias/análisis.
- Permisos P12 en once operaciones nuevas, interfaz, OpenAPI, migración aditiva y [demo aislada](../demo-final.md).
- [Sonar local con evidencia real](../calidad/sonar-sprint5.md), gate OK sin falsificar revisión, deuda de dependencias explícita.

## Fechas y límites

El plan original fija Sprint 5 del **19-10 al 01-11-2026**. Hoy queda un día de ese plazo. Sprint 4 se integró después de su fecha prevista (18-10), por lo que agrupar este bloque reduce esperas pero no reescribe el calendario ni demuestra entrega puntual de los sprints anteriores. No se inventan estimaciones, horas o Story Points.

El código de las tres historias y de medios está probado; **no se marca Done por estar en una rama**. Quedan revisión, aprobación y fusión humanas, estabilidad de main y cierre automático de Issues. No se cierran manualmente Issues ni se actualizan estados Done prematuramente.

## Orden seguro de integración

1. Revisar/fusionar P12 #49 mediante una persona.
2. Mientras sigue pendiente, el cierre se prepara en `sprint5/cierre-proyecto`, desde su SHA verificado, con PR dependiente y diff propio. No fusionar el cierre sobre la rama de P12.
3. Tras la fusión humana de #49, incorporar main con merge normal, verificar diff/CI y cambiar la base de la PR del cierre a main, sin force push.
4. Benjamín revisa y una persona fusiona el cierre; comprobar Issues y main. Solo entonces evaluar 21/21 HU integradas y la brecha #50 cerrada.
5. Ensayar la demo con los datos restaurables y documentar cualquier limitación real; no presentar Sonar local como gate CI permanente ni el backend con deuda alta como listo para producción.
