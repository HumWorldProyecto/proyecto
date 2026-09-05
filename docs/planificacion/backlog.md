# Backlog de producto HumWorld

El backlog funcional se generó inicialmente con apoyo del agente Product Owner/Arquitecto, fue revisado por el equipo y se refinó posteriormente mediante GitHub Issues y OpenSpec. Contiene **21 historias funcionales**, numeradas desde HU-01 hasta HU-21.

## ÉPICA A — Captura RSS y almacenamiento

### [HU-01 — Captura automática de noticias RSS](https://github.com/HumWorldProyecto/proyecto/issues/2)

Como administrador, quiero que el sistema capture automáticamente noticias desde las fuentes RSS configuradas, para mantener actualizada la información utilizada por HumWorld.

### [HU-02 — Actualización manual de una fuente RSS](https://github.com/HumWorldProyecto/proyecto/issues/3)

Como administrador de HumWorld, quiero actualizar manualmente una fuente RSS concreta, para incorporar sus noticias cuando sea necesario sin esperar a la captura automática.

### [HU-03 — Actualización manual de múltiples fuentes RSS](https://github.com/HumWorldProyecto/proyecto/issues/4)

Como administrador de HumWorld, quiero actualizar manualmente varias fuentes RSS, para incorporar en una sola operación las noticias de las fuentes seleccionadas.

### [HU-04 — Almacenamiento de noticias y metadatos](https://github.com/HumWorldProyecto/proyecto/issues/5)

Como responsable del análisis de HumWorld, quiero almacenar las noticias capturadas junto con sus metadatos, para conservar la información necesaria para consultarla y analizarla.

### [HU-14 — Carga inicial de fuentes RSS por continente](https://github.com/HumWorldProyecto/proyecto/issues/15)

Como administrador de HumWorld, quiero disponer de una carga inicial de fuentes RSS organizada por continente, para comenzar la captura con cobertura geográfica.

## ÉPICA B — Motor de sentimiento y clasificación

### [HU-05 — Análisis de sentimiento de noticias](https://github.com/HumWorldProyecto/proyecto/issues/6)

Como usuario de HumWorld, quiero obtener el análisis de sentimiento de las noticias, para conocer el humor expresado por la información publicada.

### [HU-06 — Persistencia del valor de humor](https://github.com/HumWorldProyecto/proyecto/issues/7)

Como usuario de HumWorld, quiero que el valor de humor calculado se conserve, para consultar posteriormente el resultado del análisis sin perderlo.

### [HU-07 — Análisis de noticias en español e inglés](https://github.com/HumWorldProyecto/proyecto/issues/8)

Como usuario de HumWorld, quiero analizar noticias escritas en español e inglés, para incorporar al cálculo de humor noticias publicadas en ambos idiomas.

### [HU-10 — Análisis directo de texto mediante API](https://github.com/HumWorldProyecto/proyecto/issues/11)

Como sistema consumidor de HumWorld, quiero enviar texto directamente a una API para analizar su sentimiento, para obtener un valor de humor sin depender de una noticia RSS.

### [HU-16 — Clasificación mediante IPTC Media Topics](https://github.com/HumWorldProyecto/proyecto/issues/17)

Como responsable del análisis de HumWorld, quiero clasificar las noticias mediante IPTC Media Topics, para organizar las noticias con una taxonomía temática común.

## ÉPICA C — Consultas y dashboards

### [HU-08 — Consulta de sentimiento global, por continente y país](https://github.com/HumWorldProyecto/proyecto/issues/9)

Como usuario de HumWorld, quiero consultar el sentimiento global y desglosarlo por continente y país, para comparar el humor en distintos ámbitos geográficos.

### [HU-09 — Evolución temporal y detalle del sentimiento](https://github.com/HumWorldProyecto/proyecto/issues/10)

Como usuario de HumWorld, quiero consultar la evolución temporal y el detalle del sentimiento, para comprender cómo cambia el humor y qué información compone cada resultado.

### [HU-11 — Mapa mundial de humor](https://github.com/HumWorldProyecto/proyecto/issues/12)

Como usuario de HumWorld, quiero visualizar el humor en un mapa mundial, para interpretar geográficamente las diferencias de sentimiento.

### [HU-12 — Nube de palabras influyentes](https://github.com/HumWorldProyecto/proyecto/issues/13)

Como usuario de HumWorld, quiero visualizar una nube con las palabras más influyentes, para identificar los términos con mayor influencia en el humor analizado.

### [HU-13 — Noticias más influyentes](https://github.com/HumWorldProyecto/proyecto/issues/14)

Como usuario de HumWorld, quiero consultar las noticias más influyentes, para reconocer qué noticias tienen mayor impacto en el humor calculado.

## ÉPICA D — Administración y ciclo de vida

### [HU-15 — Gestión CRUD de fuentes RSS](https://github.com/HumWorldProyecto/proyecto/issues/16)

Como administrador de HumWorld, quiero crear, consultar, actualizar y eliminar fuentes RSS, para mantener vigente el conjunto de fuentes utilizado por la captura.

### [HU-17 — Gestión CRUD del diccionario](https://github.com/HumWorldProyecto/proyecto/issues/18)

Como administrador de HumWorld, quiero crear, consultar, actualizar y eliminar entradas del diccionario, para mantener el diccionario utilizado por HumWorld.

### [HU-18 — Configuración de la periodicidad de captura](https://github.com/HumWorldProyecto/proyecto/issues/19)

Como administrador de HumWorld, quiero configurar la periodicidad de captura de noticias, para controlar con qué frecuencia se actualizan automáticamente las fuentes RSS.

### [HU-19 — Configuración del periodo de caducidad](https://github.com/HumWorldProyecto/proyecto/issues/20)

Como administrador de HumWorld, quiero configurar el periodo de caducidad de las noticias, para determinar cuándo una noticia debe considerarse antigua.

### [HU-20 — Purgado automático de noticias antiguas](https://github.com/HumWorldProyecto/proyecto/issues/21)

Como administrador de HumWorld, quiero que las noticias antiguas se purguen automáticamente, para mantener almacenadas solo las noticias dentro del periodo de vigencia.

### [HU-21 — Purgado manual de noticias antiguas](https://github.com/HumWorldProyecto/proyecto/issues/22)

Como administrador de HumWorld, quiero iniciar manualmente el purgado de noticias antiguas, para retirar bajo demanda las noticias que ya superaron su periodo de vigencia.

## Requisitos técnicos transversales

P3 pedía verificar requisitos técnicos dentro del backlog. Tras P4 y P5, el equipo decidió registrarlos separadamente y no tratarlos como nuevas historias de usuario:

- API REST versionada bajo `/api/v1`.
- Intercambio JSON cuando corresponde.
- Documentación Swagger/OpenAPI sincronizada con la API.
- Arquitectura organizada por capas y módulos.
- Entorno reproducible mediante Docker.
- Integración continua mediante GitHub Actions.
- Desarrollo dirigido por especificaciones mediante OpenSpec.
- Documentación versionada bajo `/docs`.
- Pruebas automáticas.
- Cobertura global mínima igual o superior al 80 %.
- PostgreSQL y Prisma conforme a la arquitectura vigente.
- Seguridad y calidad verificadas mediante los controles actualmente integrados.

SonarQube/SonarCloud no se declara como integrado porque el repositorio no conserva evidencia de esa integración.

## Gap obligatorio identificado

> La gestión de canales/medios y las fuentes RSS asociadas a cada uno forma parte del alcance obligatorio del proyecto final. El slice actual de HU-15 cubre las fuentes RSS, pero no debe interpretarse como implementación de Channel/Media. Esta capacidad permanece pendiente de planificación/refinamiento.

Este gap no crea una HU ni un Issue nuevo en esta tarea documental.
